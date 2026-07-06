import {
  and,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  like,
  lte,
  sql,
  type SQL,
} from "drizzle-orm";
import { addMonths, addYears, format, parseISO } from "date-fns";

import { db } from "@/db";
import {
  fgPersons,
  fgTags,
  fgTransactionTags,
  fgTransactions,
  invoiceItems,
  invoices,
} from "@/db/schema";
import type {
  FgPersonFormValues,
  FgRecurrence,
  FgTagFormValues,
  FgTransactionInput,
} from "./fg.schema";

export type Period = { from?: string; to?: string }; // ISO dates; [from, to)

export type FgFilters = {
  direction?: "income" | "expense";
  personId?: number;
  tagIds?: number[]; // matches transactions carrying ANY of these tags
  minRappen?: number;
  maxRappen?: number;
  period?: Period;
  search?: string;
};

// ---------------------------------------------------------------- OCCURRENCES
// The core of the time-frame logic: turn a (possibly recurring) definition into
// the concrete dates it occurs on within [from, to). Pure — no DB. Powers both
// the period filter and every total.
type OccurrenceInput = {
  recurrence: FgRecurrence;
  startDate: string;
  endDate?: string | null;
};

export function expandOccurrences(
  txn: OccurrenceInput,
  period: Period = {},
): string[] {
  const start = parseISO(txn.startDate);
  const hardEnd = txn.endDate ? parseISO(txn.endDate) : null;
  const from = period.from ? parseISO(period.from) : null;
  const to = period.to ? parseISO(period.to) : null;

  const inRange = (d: Date) =>
    (!from || d >= from) && (!to || d < to) && (!hardEnd || d <= hardEnd);

  if (txn.recurrence === "once") {
    return inRange(start) ? [format(start, "yyyy-MM-dd")] : [];
  }

  const step = txn.recurrence === "monthly" ? addMonths : addYears;
  // Upper bound to stop the walk: the period end, else the definition's end,
  // else a 10-year safety horizon (an unbounded recurring row with no period).
  const upper = to ?? hardEnd ?? addYears(from ?? start, 10);

  const out: string[] = [];
  let d = start;
  for (let guard = 0; d <= upper && guard < 5000; guard++, d = step(d, 1)) {
    if (inRange(d)) out.push(format(d, "yyyy-MM-dd"));
  }
  return out;
}

// ------------------------------------------------------------------- QUERIES
export async function listFgTransactions(filters: FgFilters = {}) {
  const where: (SQL | undefined)[] = [isNull(fgTransactions.deletedAt)];

  if (filters.direction)
    where.push(eq(fgTransactions.direction, filters.direction));
  if (filters.personId != null)
    where.push(eq(fgTransactions.personId, filters.personId));
  if (filters.minRappen != null)
    where.push(gte(fgTransactions.amountRappen, filters.minRappen));
  if (filters.maxRappen != null)
    where.push(lte(fgTransactions.amountRappen, filters.maxRappen));

  const term = filters.search?.trim();
  if (term) where.push(like(fgTransactions.description, `%${term}%`));

  // Coarse period pre-filter (SQL): keep rows that CAN occur in the window. once -> its date is inside; recurring -> [start, end] overlaps the window. Exact occurrence membership is refined by expandOccurrences() when summing.
  const p = filters.period;
  if (p?.from || p?.to) {
    const from = p.from ?? "0000-01-01";
    const to = p.to ?? "9999-12-31";
    where.push(sql`(
      (${fgTransactions.recurrence} = 'once'
        AND ${fgTransactions.startDate} >= ${from}
        AND ${fgTransactions.startDate} < ${to})
      OR
      (${fgTransactions.recurrence} != 'once'
        AND ${fgTransactions.startDate} < ${to}
        AND (${fgTransactions.endDate} IS NULL OR ${fgTransactions.endDate} >= ${from}))
    )`);
  }

  if (filters.tagIds && filters.tagIds.length > 0) {
    const tagged = db
      .select({ id: fgTransactionTags.transactionId })
      .from(fgTransactionTags)
      .where(inArray(fgTransactionTags.tagId, filters.tagIds));
    where.push(inArray(fgTransactions.id, tagged));
  }

  const rows = await db
    .select({
      id: fgTransactions.id,
      direction: fgTransactions.direction,
      description: fgTransactions.description,
      amountRappen: fgTransactions.amountRappen,
      recurrence: fgTransactions.recurrence,
      startDate: fgTransactions.startDate,
      endDate: fgTransactions.endDate,
      personId: fgTransactions.personId,
      personName: fgPersons.name,
      notes: fgTransactions.notes,
    })
    .from(fgTransactions)
    .leftJoin(fgPersons, eq(fgTransactions.personId, fgPersons.id))
    .where(and(...where))
    .orderBy(desc(fgTransactions.startDate), desc(fgTransactions.id));

  // Stitch tags in a second query (same approach as the invoices layer).
  const ids = rows.map((r) => r.id);
  const byTxn = new Map<
    number,
    { id: number; name: string; color: string | null }[]
  >();
  if (ids.length) {
    const links = await db
      .select({
        transactionId: fgTransactionTags.transactionId,
        id: fgTags.id,
        name: fgTags.name,
        color: fgTags.color,
      })
      .from(fgTransactionTags)
      .innerJoin(fgTags, eq(fgTransactionTags.tagId, fgTags.id))
      .where(inArray(fgTransactionTags.transactionId, ids));
    for (const l of links) {
      const arr = byTxn.get(l.transactionId) ?? [];
      arr.push({ id: l.id, name: l.name, color: l.color });
      byTxn.set(l.transactionId, arr);
    }
  }

  return rows.map((r) => ({ ...r, tags: byTxn.get(r.id) ?? [] }));
}
export type FgTransaction = Awaited<
  ReturnType<typeof listFgTransactions>
>[number];

// Sum of PAID praxis invoices in the period — the live GP income (point #3). Read-only: the invoices tables stay the single source of truth.
async function sumPaidPraxisIncome(period: Period): Promise<number> {
  const where: (SQL | undefined)[] = [
    isNull(invoices.deletedAt),
    eq(invoices.status, "paid"),
  ];
  if (period.from)
    where.push(
      sql`COALESCE(${invoices.issuedAt}, ${invoices.createdAt}) >= ${period.from}`,
    );
  if (period.to)
    where.push(
      sql`COALESCE(${invoices.issuedAt}, ${invoices.createdAt}) < ${period.to}`,
    );

  const [row] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${invoiceItems.total}), 0)`.mapWith(
        Number,
      ),
    })
    .from(invoices)
    .leftJoin(invoiceItems, eq(invoiceItems.invoiceId, invoices.id))
    .where(and(...where));
  return row?.total ?? 0;
}

// The general financial state (point #3): general income/expense expanded over the period, plus live praxis income, plus the net.
export async function getFgSummary(period: Period = {}) {
  const txns = await listFgTransactions({ period });

  let generalIncome = 0;
  let generalExpense = 0;
  for (const t of txns) {
    const amount = expandOccurrences(t, period).length * t.amountRappen;
    if (t.direction === "income") generalIncome += amount;
    else generalExpense += amount;
  }

  const praxisIncome = await sumPaidPraxisIncome(period);
  const totalIncome = generalIncome + praxisIncome;
  return {
    praxisIncome,
    generalIncome,
    totalIncome,
    generalExpense,
    net: totalIncome - generalExpense,
  };
}
export type FgSummary = Awaited<ReturnType<typeof getFgSummary>>;

export async function listFgTags() {
  return db
    .select()
    .from(fgTags)
    .where(isNull(fgTags.deletedAt))
    .orderBy(fgTags.name);
}
export type FgTag = Awaited<ReturnType<typeof listFgTags>>[number];

export async function listFgPersons() {
  return db
    .select()
    .from(fgPersons)
    .where(isNull(fgPersons.deletedAt))
    .orderBy(fgPersons.name);
}
export type FgPerson = Awaited<ReturnType<typeof listFgPersons>>[number];

// ----------------------------------------------------------------- MUTATIONS
async function setTransactionTags(transactionId: number, tagIds: number[]) {
  await db
    .delete(fgTransactionTags)
    .where(eq(fgTransactionTags.transactionId, transactionId));
  if (tagIds.length) {
    await db
      .insert(fgTransactionTags)
      .values(tagIds.map((tagId) => ({ transactionId, tagId })));
  }
}

export async function createFgTransaction(values: FgTransactionInput) {
  const [row] = await db
    .insert(fgTransactions)
    .values({
      direction: values.direction,
      description: values.description,
      amountRappen: values.amountRappen,
      recurrence: values.recurrence,
      startDate: values.startDate,
      endDate: values.recurrence === "once" ? null : (values.endDate ?? null),
      personId: values.personId ?? null,
      notes: values.notes ?? null,
    })
    .returning({ id: fgTransactions.id });
  await setTransactionTags(row.id, values.tagIds);
  return row.id;
}

export async function updateFgTransaction(
  id: number,
  values: FgTransactionInput,
) {
  await db
    .update(fgTransactions)
    .set({
      direction: values.direction,
      description: values.description,
      amountRappen: values.amountRappen,
      recurrence: values.recurrence,
      startDate: values.startDate,
      endDate: values.recurrence === "once" ? null : (values.endDate ?? null),
      personId: values.personId ?? null,
      notes: values.notes ?? null,
    })
    .where(eq(fgTransactions.id, id));
  await setTransactionTags(id, values.tagIds);
}

export async function softDeleteFgTransaction(id: number) {
  await db
    .update(fgTransactions)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(fgTransactions.id, id));
}

export async function createFgTag(values: FgTagFormValues) {
  const [row] = await db
    .insert(fgTags)
    .values({ name: values.name, color: values.color ?? null })
    .returning({ id: fgTags.id });
  return row.id;
}

export async function softDeleteFgTag(id: number) {
  await db
    .update(fgTags)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(fgTags.id, id));
}

export async function createFgPerson(values: FgPersonFormValues) {
  const [row] = await db
    .insert(fgPersons)
    .values({ name: values.name, notes: values.notes ?? null })
    .returning({ id: fgPersons.id });
  return row.id;
}

export async function softDeleteFgPerson(id: number) {
  await db
    .update(fgPersons)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(fgPersons.id, id));
}

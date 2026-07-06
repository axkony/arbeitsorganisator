import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  like,
  lt,
  ne,
  notInArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import { format, parseISO } from "date-fns";

import { db } from "@/db";
import {
  invoiceItems,
  invoices,
  patients,
  sessionRates,
  sessions,
} from "@/db/schema";
import { SESSION_TYPE_LABELS } from "@/features/sessions/session.schema";
import type {
  InvoiceFormValues,
  InvoiceItemInput,
  InvoiceStatus,
} from "./invoice.schema";

type Filters = { search?: string; patientId?: number; status?: InvoiceStatus };

const totalSum = sql<number>`COALESCE(SUM(${invoiceItems.total}), 0)`.mapWith(
  Number,
);

const listColumns = {
  id: invoices.id,
  patientId: invoices.patientId,
  invoiceNumber: invoices.invoiceNumber,
  status: invoices.status,
  currency: invoices.currency,
  issuedAt: invoices.issuedAt,
  dueAt: invoices.dueAt,
  paidAt: invoices.paidAt,
  notes: invoices.notes,
  patientFirstName: patients.firstName,
  patientLastName: patients.lastName,
  createdAt: invoices.createdAt,
  total: totalSum,
};

export async function listInvoices(filters: Filters = {}) {
  const where: (SQL | undefined)[] = [isNull(invoices.deletedAt)];

  if (filters.patientId != null) {
    where.push(eq(invoices.patientId, filters.patientId));
  }
  if (filters.status) {
    where.push(eq(invoices.status, filters.status));
  }

  const term = filters.search?.trim();
  if (term) {
    const p = `%${term}%`;
    where.push(
      or(
        like(invoices.invoiceNumber, p),
        like(patients.firstName, p),
        like(patients.lastName, p),
      ),
    );
  }

  return db
    .select(listColumns)
    .from(invoices)
    .innerJoin(patients, eq(invoices.patientId, patients.id))
    .leftJoin(invoiceItems, eq(invoiceItems.invoiceId, invoices.id))
    .where(and(...where))
    .groupBy(invoices.id)
    .orderBy(desc(invoices.id));
}

export type InvoiceListItem = Awaited<ReturnType<typeof listInvoices>>[number];

export async function getInvoice(id: number) {
  const [invoice] = await db
    .select({
      id: invoices.id,
      patientId: invoices.patientId,
      invoiceNumber: invoices.invoiceNumber,
      status: invoices.status,
      currency: invoices.currency,
      issuedAt: invoices.issuedAt,
      dueAt: invoices.dueAt,
      paidAt: invoices.paidAt,
      notes: invoices.notes,
      patientFirstName: patients.firstName,
      patientLastName: patients.lastName,
    })
    .from(invoices)
    .innerJoin(patients, eq(invoices.patientId, patients.id))
    .where(and(eq(invoices.id, id), isNull(invoices.deletedAt)));

  if (!invoice) return null;

  const items = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, id))
    .orderBy(asc(invoiceItems.sortOrder), asc(invoiceItems.id));

  const total = items.reduce((sum, it) => sum + it.total, 0);
  return { ...invoice, items, total };
}

export type InvoiceDetail = NonNullable<Awaited<ReturnType<typeof getInvoice>>>;
export type InvoiceItemRow = InvoiceDetail["items"][number];

// Build snapshot line rows from the chosen sessions + current per-type rates.
// holdSessions=false (cancelled invoice) leaves session_id NULL so the session
// stays free for re-billing, while the priced snapshot line is preserved.
async function buildItemRows(
  invoiceId: number,
  items: InvoiceItemInput[],
  holdSessions: boolean,
  // When set, a session's price comes from this map (its original snapshot) instead of the current rate. Sessions absent from it — e.g. ones newly added during the edit — still fall back to the current rate.
  priorUnitPrice?: Map<number, number>,
) {
  const ids = items
    .map((it) => Number(it.sessionId))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (ids.length === 0) return [];

  const sess = await db
    .select({
      id: sessions.id,
      sessionDate: sessions.sessionDate,
      sessionType: sessions.sessionType,
      durationMinutes: sessions.durationMinutes,
    })
    .from(sessions)
    .where(inArray(sessions.id, ids));

  const rateRows = await db.select().from(sessionRates);
  const rateMap = new Map(rateRows.map((r) => [r.sessionType, r.rateRappen]));

  const ordered = [...sess].sort((a, b) =>
    a.sessionDate.localeCompare(b.sessionDate),
  );

  return ordered.map((s, idx) => {
    const rate = priorUnitPrice?.get(s.id) ?? rateMap.get(s.sessionType) ?? 0;
    const minutes = s.durationMinutes ?? 0;
    const hours = minutes / 60;
    let label = s.sessionDate;
    try {
      label = format(parseISO(s.sessionDate), "dd.MM.yyyy");
    } catch {
      /* keep raw */
    }
    return {
      invoiceId,
      sessionId: s.id, // permanent link (no longer nulled)
      billingActive: holdSessions, // whether it holds the lock
      description: `Sitzung ${label} · ${SESSION_TYPE_LABELS[s.sessionType]}`,
      tariffCode: null as string | null,
      quantity: hours,
      unitPrice: rate,
      total: Math.round(hours * rate),
      durationMinutes: minutes,
      sortOrder: idx,
    };
  });
}

export async function softDeleteInvoice(id: number) {
  await db
    .update(invoices)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(invoices.id, id));
  await db
    .update(invoiceItems)
    .set({ billingActive: false })
    .where(eq(invoiceItems.invoiceId, id));
}

export async function listUnsentInvoices(): Promise<InvoiceListItem[]> {
  return db
    .select(listColumns)
    .from(invoices)
    .innerJoin(patients, eq(invoices.patientId, patients.id))
    .leftJoin(invoiceItems, eq(invoiceItems.invoiceId, invoices.id))
    .where(and(isNull(invoices.deletedAt), eq(invoices.status, "draft")))
    .groupBy(invoices.id)
    .orderBy(desc(invoices.id));
}

// Completed sessions of a patient that aren't actively billed. When editing,
// pass the invoice's own id so its current sessions stay selectable.
export async function listBillableSessions(
  patientId: number,
  invoiceId?: number,
) {
  const takenRows = await db
    .select({ sessionId: invoiceItems.sessionId })
    .from(invoiceItems)
    .where(
      and(
        eq(invoiceItems.billingActive, true),
        isNotNull(invoiceItems.sessionId),
        invoiceId != null ? ne(invoiceItems.invoiceId, invoiceId) : undefined,
      ),
    );

  const taken = takenRows
    .map((r) => r.sessionId)
    .filter((n): n is number => n != null);

  const where: (SQL | undefined)[] = [
    eq(sessions.patientId, patientId),
    eq(sessions.status, "completed"),
    isNull(sessions.deletedAt),
  ];
  if (taken.length > 0) where.push(notInArray(sessions.id, taken));

  return db
    .select({
      id: sessions.id,
      sessionDate: sessions.sessionDate,
      sessionType: sessions.sessionType,
      durationMinutes: sessions.durationMinutes,
    })
    .from(sessions)
    .where(and(...where))
    .orderBy(desc(sessions.sessionDate));
}

export type BillableSession = Awaited<
  ReturnType<typeof listBillableSessions>
>[number];

const NUMBERED_STATUSES = new Set<InvoiceStatus>(["sent", "paid", "overdue"]);

// Next number, based ONLY on invoices that already carry one (i.e. sent).
// Numbers are never reused (soft-deleted/cancelled sent invoices still count).
export async function nextSentInvoiceNumber(): Promise<string> {
  const prefix = `${new Date().getFullYear()}-`;
  const rows = await db
    .select({ invoiceNumber: invoices.invoiceNumber })
    .from(invoices)
    .where(
      and(
        isNotNull(invoices.invoiceNumber),
        like(invoices.invoiceNumber, `${prefix}%`),
      ),
    );
  let max = 0;
  for (const r of rows) {
    const n = Number((r.invoiceNumber ?? "").slice(prefix.length));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

// Drafts are NULL and never match, so this only checks among sent invoices.
async function assertNumberFree(invoiceNumber: string, exceptId?: number) {
  const rows = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(
      and(
        eq(invoices.invoiceNumber, invoiceNumber),
        exceptId != null ? ne(invoices.id, exceptId) : undefined,
      ),
    );
  if (rows.length > 0) {
    throw new Error(`Rechnungsnummer „${invoiceNumber}“ ist bereits vergeben.`);
  }
}

async function resolveInvoiceNumber(opts: {
  currentNumber: string | null;
  targetStatus: InvoiceStatus;
  providedNumber?: string;
  exceptId?: number;
}): Promise<string | null> {
  const { currentNumber, targetStatus, providedNumber, exceptId } = opts;
  if (currentNumber != null) {
    // Already numbered — user may edit it; keep unique among sent invoices.
    const num = (providedNumber ?? currentNumber).trim();
    if (!num) throw new Error("Rechnungsnummer darf nicht leer sein.");
    await assertNumberFree(num, exceptId);
    return num;
  }
  // Not yet numbered — assign only when it moves into a sent state.
  if (NUMBERED_STATUSES.has(targetStatus)) return nextSentInvoiceNumber();
  return null;
}

function headerRow(values: InvoiceFormValues, invoiceNumber: string | null) {
  const clean = (v?: string) => (v && v.trim() !== "" ? v.trim() : null);
  return {
    patientId: Number(values.patientId),
    invoiceNumber,
    status: values.status,
    issuedAt: clean(values.issuedAt),
    dueAt: clean(values.dueAt),
    paidAt: values.status === "paid" ? new Date().toISOString() : null,
    notes: clean(values.notes),
  };
}

export async function createInvoice(values: InvoiceFormValues) {
  const number = await resolveInvoiceNumber({
    currentNumber: null,
    targetStatus: values.status,
    providedNumber: values.invoiceNumber,
  });
  const [invoice] = await db
    .insert(invoices)
    .values(headerRow(values, number))
    .returning();
  const rows = await buildItemRows(
    invoice.id,
    values.items,
    values.status !== "cancelled",
  );
  if (rows.length > 0) await db.insert(invoiceItems).values(rows);
  return invoice;
}

export type InvoicePricing = "current" | "keepOriginal";

export async function updateInvoice(
  id: number,
  values: InvoiceFormValues,
  pricing: InvoicePricing = "current",
) {
  const [existing] = await db
    .select({ invoiceNumber: invoices.invoiceNumber })
    .from(invoices)
    .where(eq(invoices.id, id));

  // A number is assigned at first send and kept forever, so "has a number"
  // means "already issued". Issued invoices are frozen — never re-priced.
  const isIssued = existing?.invoiceNumber != null;

  // Capture the tariffs the invoice was built with BEFORE dropping the lines,
  // so "keep original" can reuse them per session.
  let priorUnitPrice: Map<number, number> | undefined;
  if (!isIssued && pricing === "keepOriginal") {
    const prior = await db
      .select({
        sessionId: invoiceItems.sessionId,
        unitPrice: invoiceItems.unitPrice,
      })
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, id));
    priorUnitPrice = new Map(
      prior
        .filter(
          (r): r is { sessionId: number; unitPrice: number } =>
            r.sessionId != null,
        )
        .map((r) => [r.sessionId, r.unitPrice]),
    );
  }

  const number = await resolveInvoiceNumber({
    currentNumber: existing?.invoiceNumber ?? null,
    targetStatus: values.status,
    providedNumber: values.invoiceNumber,
    exceptId: id,
  });

  const [invoice] = await db
    .update(invoices)
    .set(headerRow(values, number))
    .where(eq(invoices.id, id))
    .returning();

  if (!isIssued) {
    await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
    const rows = await buildItemRows(
      id,
      values.items,
      values.status !== "cancelled",
      priorUnitPrice,
    );
    if (rows.length > 0) await db.insert(invoiceItems).values(rows);
  }

  return invoice;
}

export async function updateInvoiceStatus(id: number, status: InvoiceStatus) {
  const [existing] = await db
    .select({ invoiceNumber: invoices.invoiceNumber })
    .from(invoices)
    .where(eq(invoices.id, id));

  const activating = status !== "cancelled";
  if (activating) {
    try {
      await db
        .update(invoiceItems)
        .set({ billingActive: true })
        .where(
          and(
            eq(invoiceItems.invoiceId, id),
            isNotNull(invoiceItems.sessionId),
          ),
        );
    } catch {
      throw new Error(
        "Mindestens eine Sitzung dieser Rechnung wird bereits auf einer anderen Rechnung verrechnet — Reaktivierung nicht möglich.",
      );
    }
  }

  // Assign a number the first time it becomes sent (keeps it thereafter).
  const number =
    existing?.invoiceNumber == null && NUMBERED_STATUSES.has(status)
      ? await nextSentInvoiceNumber()
      : (existing?.invoiceNumber ?? null);

  await db
    .update(invoices)
    .set({
      status,
      invoiceNumber: number,
      paidAt: status === "paid" ? new Date().toISOString() : null,
    })
    .where(eq(invoices.id, id));

  if (!activating) {
    await db
      .update(invoiceItems)
      .set({ billingActive: false })
      .where(eq(invoiceItems.invoiceId, id));
  }
}

export type Period = { from?: string; to?: string }; // ISO dates; [from, to)

// All of a patient's non-cancelled invoices in a period, each with its total.
// Filtered by issue date (falls back to creation date for drafts).
export async function listPatientInvoices(
  patientId: number,
  period: Period = {},
) {
  const where: (SQL | undefined)[] = [
    eq(invoices.patientId, patientId),
    isNull(invoices.deletedAt),
    ne(invoices.status, "cancelled"),
  ];
  if (period.from) {
    where.push(
      sql`COALESCE(${invoices.issuedAt}, ${invoices.createdAt}) >= ${period.from}`,
    );
  }
  if (period.to) {
    where.push(
      sql`COALESCE(${invoices.issuedAt}, ${invoices.createdAt}) < ${period.to}`,
    );
  }

  return db
    .select(listColumns)
    .from(invoices)
    .innerJoin(patients, eq(invoices.patientId, patients.id))
    .leftJoin(invoiceItems, eq(invoiceItems.invoiceId, invoices.id))
    .where(and(...where))
    .groupBy(invoices.id)
    .orderBy(desc(invoices.issuedAt), desc(invoices.id));
}

// A patient's completed sessions not on any ACTIVE invoice line (cancelled
// invoices' sessions reappear here), filtered by session date.
export async function listUninvoicedSessions(
  patientId: number,
  period: Period = {},
) {
  const takenRows = await db
    .select({ sessionId: invoiceItems.sessionId })
    .from(invoiceItems)
    .where(
      and(
        eq(invoiceItems.billingActive, true),
        isNotNull(invoiceItems.sessionId),
      ),
    );
  const taken = takenRows
    .map((r) => r.sessionId)
    .filter((n): n is number => n != null);

  const where: (SQL | undefined)[] = [
    eq(sessions.patientId, patientId),
    eq(sessions.status, "completed"),
    isNull(sessions.deletedAt),
  ];
  if (taken.length > 0) where.push(notInArray(sessions.id, taken));
  if (period.from) where.push(gte(sessions.sessionDate, period.from));
  if (period.to) where.push(lt(sessions.sessionDate, period.to));

  return db
    .select({
      id: sessions.id,
      sessionDate: sessions.sessionDate,
      sessionType: sessions.sessionType,
      durationMinutes: sessions.durationMinutes,
    })
    .from(sessions)
    .where(and(...where))
    .orderBy(desc(sessions.sessionDate));
}

export type UninvoicedSession = Awaited<
  ReturnType<typeof listUninvoicedSessions>
>[number];

// All invoices (any patient) in the given statuses, each with its total.
export async function listInvoicesByStatuses(statuses: InvoiceStatus[]) {
  if (statuses.length === 0) return [];
  return db
    .select(listColumns)
    .from(invoices)
    .innerJoin(patients, eq(invoices.patientId, patients.id))
    .leftJoin(invoiceItems, eq(invoiceItems.invoiceId, invoices.id))
    .where(and(isNull(invoices.deletedAt), inArray(invoices.status, statuses)))
    .groupBy(invoices.id)
    .orderBy(desc(invoices.issuedAt), desc(invoices.id));
}

// Every patient's completed sessions not on an ACTIVE invoice line.
// `fromCancelled` marks sessions freed by a cancelled (Storniert) invoice.
export async function listAllUninvoicedSessions() {
  const takenRows = await db
    .select({ sessionId: invoiceItems.sessionId })
    .from(invoiceItems)
    .where(
      and(
        eq(invoiceItems.billingActive, true),
        isNotNull(invoiceItems.sessionId),
      ),
    );
  const taken = takenRows
    .map((r) => r.sessionId)
    .filter((n): n is number => n != null);

  const cancelledRows = await db
    .select({ sessionId: invoiceItems.sessionId })
    .from(invoiceItems)
    .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
    .where(
      and(
        isNotNull(invoiceItems.sessionId),
        eq(invoices.status, "cancelled"),
        isNull(invoices.deletedAt),
      ),
    );
  const fromCancelled = new Set(
    cancelledRows.map((r) => r.sessionId).filter((n): n is number => n != null),
  );

  const where: (SQL | undefined)[] = [
    eq(sessions.status, "completed"),
    isNull(sessions.deletedAt),
  ];
  if (taken.length > 0) where.push(notInArray(sessions.id, taken));

  const rows = await db
    .select({
      id: sessions.id,
      patientId: sessions.patientId,
      sessionDate: sessions.sessionDate,
      sessionType: sessions.sessionType,
      durationMinutes: sessions.durationMinutes,
      patientFirstName: patients.firstName,
      patientLastName: patients.lastName,
    })
    .from(sessions)
    .innerJoin(patients, eq(sessions.patientId, patients.id))
    .where(and(...where))
    .orderBy(desc(sessions.sessionDate));

  return rows.map((r) => ({ ...r, fromCancelled: fromCancelled.has(r.id) }));
}

export type AllUninvoicedSession = Awaited<
  ReturnType<typeof listAllUninvoicedSessions>
>[number];

export type PatientFinanceSummary = {
  patientId: number;
  uninvoiced: number; // value of not-yet-billed completed sessions
  drafts: number;
  open: number; // sent + overdue
  paid: number;
};

// Per-patient money buckets for a period (drives the picker badges + KPI rows).
export async function listPatientFinanceSummaries(
  period: Period = {},
): Promise<PatientFinanceSummary[]> {
  const map = new Map<number, PatientFinanceSummary>();
  const ensure = (pid: number) => {
    let s = map.get(pid);
    if (!s) {
      s = { patientId: pid, uninvoiced: 0, drafts: 0, open: 0, paid: 0 };
      map.set(pid, s);
    }
    return s;
  };

  const invWhere: (SQL | undefined)[] = [
    isNull(invoices.deletedAt),
    ne(invoices.status, "cancelled"),
  ];
  if (period.from)
    invWhere.push(
      sql`COALESCE(${invoices.issuedAt}, ${invoices.createdAt}) >= ${period.from}`,
    );
  if (period.to)
    invWhere.push(
      sql`COALESCE(${invoices.issuedAt}, ${invoices.createdAt}) < ${period.to}`,
    );

  const invRows = await db
    .select({
      patientId: invoices.patientId,
      status: invoices.status,
      total: totalSum,
    })
    .from(invoices)
    .leftJoin(invoiceItems, eq(invoiceItems.invoiceId, invoices.id))
    .where(and(...invWhere))
    .groupBy(invoices.id);

  for (const r of invRows) {
    const s = ensure(r.patientId);
    if (r.status === "draft") s.drafts += r.total;
    else if (r.status === "sent" || r.status === "overdue") s.open += r.total;
    else if (r.status === "paid") s.paid += r.total;
  }

  const takenRows = await db
    .select({ sessionId: invoiceItems.sessionId })
    .from(invoiceItems)
    .where(
      and(
        eq(invoiceItems.billingActive, true),
        isNotNull(invoiceItems.sessionId),
      ),
    );
  const taken = takenRows
    .map((r) => r.sessionId)
    .filter((n): n is number => n != null);

  const sessWhere: (SQL | undefined)[] = [
    eq(sessions.status, "completed"),
    isNull(sessions.deletedAt),
  ];
  if (taken.length > 0) sessWhere.push(notInArray(sessions.id, taken));
  if (period.from) sessWhere.push(gte(sessions.sessionDate, period.from));
  if (period.to) sessWhere.push(lt(sessions.sessionDate, period.to));

  const sessRows = await db
    .select({
      patientId: sessions.patientId,
      sessionType: sessions.sessionType,
      durationMinutes: sessions.durationMinutes,
    })
    .from(sessions)
    .where(and(...sessWhere));

  const rateRows = await db.select().from(sessionRates);
  const rateMap = new Map(rateRows.map((r) => [r.sessionType, r.rateRappen]));
  for (const s of sessRows) {
    ensure(s.patientId).uninvoiced += Math.round(
      ((s.durationMinutes ?? 0) / 60) * (rateMap.get(s.sessionType) ?? 0),
    );
  }

  return [...map.values()];
}

export type TariffDrift = {
  sessionType: string;
  label: string;
  oldRappen: number; // per hour, from this invoice's snapshot
  newRappen: number; // per hour, current setting
};

// Per session type on this invoice, where the snapshot rate differs from the current rate. Empty = nothing changed, so no prompt. Released/manual lines (no session) are ignored.
export async function getInvoiceTariffDrift(
  invoiceId: number,
): Promise<TariffDrift[]> {
  const lines = await db
    .select({
      sessionType: sessions.sessionType,
      unitPrice: invoiceItems.unitPrice,
    })
    .from(invoiceItems)
    .innerJoin(sessions, eq(invoiceItems.sessionId, sessions.id))
    .where(eq(invoiceItems.invoiceId, invoiceId));

  const rateRows = await db.select().from(sessionRates);
  const current = new Map(rateRows.map((r) => [r.sessionType, r.rateRappen]));

  const oldByType = new Map<string, number>();
  for (const l of lines)
    if (!oldByType.has(l.sessionType))
      oldByType.set(l.sessionType, l.unitPrice);

  const drift: TariffDrift[] = [];
  for (const [type, oldRappen] of oldByType) {
    const newRappen = current.get(type) ?? oldRappen;
    if (newRappen !== oldRappen) {
      drift.push({
        sessionType: type,
        label:
          SESSION_TYPE_LABELS[type as keyof typeof SESSION_TYPE_LABELS] ?? type,
        oldRappen,
        newRappen,
      });
    }
  }
  return drift;
}

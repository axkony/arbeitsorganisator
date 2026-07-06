import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { patients, sessionEntries, sessions } from "@/db/schema";
import type { EntryColumn, SessionEntry } from "./sessionEntries.types";

type EntryRow = typeof sessionEntries.$inferSelect;

// one DB row (value_type='json') -- one entry. columns in 'value'

export type CreateEntryInput =
  | {
      kind: "columns";
      label?: string;
      columns: EntryColumn[];
      sortOrder: number;
    }
  | { kind: "text"; label?: string; text: string; sortOrder: number };

export type UpdateEntryInput =
  | { kind: "columns"; label?: string; columns: EntryColumn[] }
  | { kind: "text"; label?: string; text: string };

function serialize(
  input:
    | { kind: "columns"; columns: EntryColumn[] }
    | { kind: "text"; text: string },
) {
  return input.kind === "text"
    ? JSON.stringify({ kind: "text", text: input.text })
    : JSON.stringify({ kind: "columns", columns: input.columns });
}

function parseEntry(row: EntryRow): SessionEntry {
  const base = {
    id: row.id,
    label: row.fieldLabel ?? "",
    sortOrder: row.sortOrder,
  };
  try {
    const data = JSON.parse(row.value ?? "{}");
    if (data?.kind === "text") {
      return {
        ...base,
        kind: "text",
        text: typeof data.text === "string" ? data.text : "",
      };
    }
    if (Array.isArray(data?.columns)) {
      return { ...base, kind: "columns", columns: data.columns };
    }
  } catch {
    // fall through to empty columns entry
  }
  return { ...base, kind: "columns", columns: [] };
}

export async function createSessionEntry(
  sessionId: number,
  input: CreateEntryInput,
) {
  const [row] = await db
    .insert(sessionEntries)
    .values({
      sessionId,
      fieldKey: crypto.randomUUID(),
      fieldLabel: input.label?.trim() || null,
      valueType: "json",
      value: serialize(input),
      sortOrder: input.sortOrder,
    })
    .returning();
  return parseEntry(row);
}

export async function updateSessionEntry(id: number, input: UpdateEntryInput) {
  await db
    .update(sessionEntries)
    .set({
      fieldLabel: input.label?.trim() || null,
      value: serialize(input),
    })
    .where(eq(sessionEntries.id, id));
}

export async function listSessionEntries(
  sessionId: number,
): Promise<SessionEntry[]> {
  const rows = await db
    .select()
    .from(sessionEntries)
    .where(eq(sessionEntries.sessionId, sessionId))
    .orderBy(asc(sessionEntries.sortOrder), asc(sessionEntries.id));

  return rows.map(parseEntry);
}

export async function deleteSessionEntry(id: number) {
  // session_entries has no soft-delete column -> hard delete.
  await db.delete(sessionEntries).where(eq(sessionEntries.id, id));
}

export async function getSession(id: number) {
  const [row] = await db
    .select({
      id: sessions.id,
      patientId: sessions.patientId,
      sessionDate: sessions.sessionDate,
      sessionType: sessions.sessionType,
      status: sessions.status,
      durationMinutes: sessions.durationMinutes,
      reason: sessions.reason,
      summary: sessions.summary,
      patientFirstName: patients.firstName,
      patientLastName: patients.lastName,
    })
    .from(sessions)
    .innerJoin(patients, eq(sessions.patientId, patients.id))
    .where(and(eq(sessions.id, id), isNull(sessions.deletedAt)));
  return row ?? null;
}

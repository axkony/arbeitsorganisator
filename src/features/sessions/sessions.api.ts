import {
  and,
  asc,
  desc,
  eq,
  gte,
  isNull,
  like,
  or,
  type SQL,
} from "drizzle-orm";

import { db } from "@/db";
import { patients, sessions } from "@/db/schema";
import type { SessionFormValues, SessionStatus } from "./session.schema";

export type Session = typeof sessions.$inferSelect;

function toRow(values: SessionFormValues) {
  const clean = (v?: string) => (v && v.trim() !== "" ? v.trim() : null);
  return {
    patientId: Number(values.patientId),
    sessionDate: values.sessionDate,
    sessionType: values.sessionType,
    status: values.status,
    durationMinutes:
      values.durationMinutes && values.durationMinutes.trim() !== ""
        ? Number(values.durationMinutes)
        : null,
    reason: clean(values.reason),
    summary: clean(values.summary),
  };
}

export async function listSessions(
  filters: { search?: string; patientId?: number } = {},
) {
  const where: (SQL | undefined)[] = [isNull(sessions.deletedAt)];

  if (filters.patientId != null) {
    where.push(eq(sessions.patientId, filters.patientId));
  }

  const term = filters.search?.trim();
  if (term) {
    const pattern = `%${term}%`;
    where.push(
      or(like(patients.firstName, pattern), like(patients.lastName, pattern)),
    );
  }

  return db
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
    .where(and(...where))
    .orderBy(desc(sessions.sessionDate));
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

// Inferred row shape of the list query (session fields + patient name).
export type SessionListItem = Awaited<ReturnType<typeof listSessions>>[number];

export async function createSession(values: SessionFormValues) {
  const [row] = await db.insert(sessions).values(toRow(values)).returning();
  return row;
}

export async function updateSession(id: number, values: SessionFormValues) {
  const [row] = await db
    .update(sessions)
    .set(toRow(values))
    .where(eq(sessions.id, id))
    .returning();
  return row;
}

export async function updateSessionStatus(id: number, status: SessionStatus) {
  await db.update(sessions).set({ status }).where(eq(sessions.id, id));
}

export async function softDeleteSession(id: number) {
  await db
    .update(sessions)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(sessions.id, id));
}

export async function listUpcomingSessions(): Promise<SessionListItem[]> {
  const now = new Date().toISOString();
  return db
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
    .where(
      and(
        isNull(sessions.deletedAt),
        eq(sessions.status, "open"),
        gte(sessions.sessionDate, now),
      ),
    )
    .orderBy(asc(sessions.sessionDate));
}

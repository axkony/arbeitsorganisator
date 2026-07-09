import { and, asc, eq, isNull, or, like, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { patients } from "@/db/schema";
import type { PatientFormValues } from "./patient.schema";

export type Patient = typeof patients.$inferSelect;

// Form values -> DB row. Empty strings become NULL; created/updated
// timestamps handled by Drizzle ($defaultFn/$onUpdate).
function toRow(values: PatientFormValues) {
  const clean = (v?: string) => (v && v.trim() !== "" ? v.trim() : null);
  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    dateOfBirth: clean(values.dateOfBirth),
    gender: values.gender ?? null,
    phone: clean(values.phone),
    email: clean(values.email),
    address: clean(values.address),
    insuranceInfo: clean(values.insuranceInfo),
    notes: clean(values.notes),
  };
}

export async function listPatients(filters: { search?: string } = {}) {
  // Seed with soft-delete, then add optional conditions
  const where: (SQL | undefined)[] = [isNull(patients.deletedAt)];

  const term = filters.search?.trim();
  if (term) {
    const pattern = `%${term}%`;
    where.push(
      or(like(patients.firstName, pattern), like(patients.lastName, pattern)),
    );
  }

  return db
    .select()
    .from(patients)
    .where(and(...where)) // soft-delete filter + filter conditions
    .orderBy(asc(patients.lastName), asc(patients.firstName));
}

export async function getPatient(id: number) {
  const [row] = await db
    .select()
    .from(patients)
    .where(and(eq(patients.id, id), isNull(patients.deletedAt)));
  return row ?? null;
}

export async function createPatient(values: PatientFormValues) {
  const [row] = await db.insert(patients).values(toRow(values)).returning();
  return row;
}

export async function updatePatient(id: number, values: PatientFormValues) {
  const [row] = await db
    .update(patients)
    .set(toRow(values))
    .where(eq(patients.id, id))
    .returning();
  return row;
}

// One-time bulk import (CSV). Skips anyone already present by
// firstName|lastName|dateOfBirth so re-running never double-inserts.
// Returns how many were actually inserted vs. skipped as already-present.
export async function bulkCreatePatients(values: PatientFormValues[]) {
  if (values.length === 0) return { inserted: 0, skippedExisting: 0 };

  const existing = await db
    .select({
      firstName: patients.firstName,
      lastName: patients.lastName,
      dateOfBirth: patients.dateOfBirth,
    })
    .from(patients)
    .where(isNull(patients.deletedAt));

  const key = (p: {
    firstName: string;
    lastName: string;
    dateOfBirth?: string | null;
  }) =>
    `${p.lastName.trim().toLowerCase()}|${p.firstName.trim().toLowerCase()}|${p.dateOfBirth ?? ""}`;

  const present = new Set(existing.map(key));
  const fresh = values.filter((v) => !present.has(key(v)));
  const skippedExisting = values.length - fresh.length;

  const rows = fresh.map(toRow);
  const CHUNK = 100;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await db.insert(patients).values(rows.slice(i, i + CHUNK));
  }
  return { inserted: rows.length, skippedExisting };
}

export async function softDeletePatient(id: number) {
  await db
    .update(patients)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(patients.id, id));
}

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

export async function softDeletePatient(id: number) {
  await db
    .update(patients)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(patients.id, id));
}

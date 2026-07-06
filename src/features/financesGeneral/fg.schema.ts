import { z } from "zod";

export const fgDirections = ["income", "expense"] as const;
export const fgRecurrences = ["once", "monthly", "yearly"] as const;

export type FgDirection = (typeof fgDirections)[number];
export type FgRecurrence = (typeof fgRecurrences)[number];

// One income/expense definition, as the data layer stores it (money in Rappen).
// Recurring rows are a single definition that projects forward — occurrences are
// computed at read time, never stored.
export const fgTransactionSchema = z.object({
  direction: z.enum(fgDirections),
  description: z.string().min(1, "Beschreibung fehlt"),
  amountRappen: z.number().int().nonnegative(),
  recurrence: z.enum(fgRecurrences),
  startDate: z.string().min(1, "Datum fehlt"), // ISO; the date, or first occurrence
  endDate: z.string().nullable().optional(), // recurring only; null = ongoing
  personId: z.number().int().nullable().optional(),
  notes: z.string().nullable().optional(),
  tagIds: z.array(z.number().int()).default([]),
});
export type FgTransactionInput = z.infer<typeof fgTransactionSchema>;

// The shape the FORM edits: money as a francs string (e.g. "12,90"), person as
// a select string ("" = none). The dialog maps this to FgTransactionInput on
// submit. Direction isn't in the form — it's fixed by which tab you're on.
export const fgTransactionFormSchema = z.object({
  description: z.string().min(1, "Beschreibung fehlt"),
  amountFrancs: z.string().regex(/^\d+([.,]\d{1,2})?$/, "Betrag z. B. 12,90"),
  recurrence: z.enum(fgRecurrences),
  startDate: z.string().min(1, "Datum fehlt"),
  endDate: z.string(), // "" = läuft weiter (only meaningful when recurring)
  personId: z.string(), // "" = keine Person
  notes: z.string(),
  tagIds: z.array(z.number().int()),
});
export type FgTransactionFormValues = z.infer<typeof fgTransactionFormSchema>;

export const fgTagSchema = z.object({
  name: z.string().min(1, "Name fehlt"),
  color: z.string().nullable().optional(),
});
export type FgTagFormValues = z.infer<typeof fgTagSchema>;

export const fgPersonSchema = z.object({
  name: z.string().min(1, "Name fehlt"),
  notes: z.string().nullable().optional(),
});
export type FgPersonFormValues = z.infer<typeof fgPersonSchema>;

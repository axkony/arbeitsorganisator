import type { FgDirection, FgRecurrence } from "./fg.schema";

export const FG_DIRECTION_LABELS: Record<FgDirection, string> = {
  income: "Einnahme",
  expense: "Ausgabe",
};

// Plural forms for tab titles / headings.
export const FG_DIRECTION_TITLES: Record<FgDirection, string> = {
  income: "Einnahmen",
  expense: "Ausgaben",
};

export const FG_RECURRENCE_LABELS: Record<FgRecurrence, string> = {
  once: "Einmalig",
  monthly: "Monatlich",
  yearly: "Jährlich",
};

import { z } from "zod";

export const INVOICE_STATUSES = [
  "draft",
  "sent",
  "paid",
  "overdue",
  "cancelled",
] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Entwurf",
  sent: "Gesendet",
  paid: "Bezahlt",
  overdue: "Überfällig",
  cancelled: "Storniert",
};

export const invoiceItemSchema = z.object({
  sessionId: z.string().min(1, "Sitzung erforderlich"),
});
export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;

export const invoiceFormSchema = z.object({
  patientId: z.string().min(1, "Patient ist erforderlich"),
  invoiceNumber: z.string().optional(),
  status: z.enum(INVOICE_STATUSES),
  issuedAt: z.string().optional(),
  dueAt: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, "Mindestens eine Sitzung auswählen"),
});
export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

import type { InvoiceStatus } from "./invoice.schema";
import type { Period } from "./invoices.api";

type Filters = { search?: string; patientId?: number; status?: InvoiceStatus };

export const invoiceKeys = {
  all: ["invoices"] as const,
  lists: () => [...invoiceKeys.all, "list"] as const,
  list: (filters: Filters = {}) => [...invoiceKeys.lists(), filters] as const,
  unsent: () => [...invoiceKeys.all, "unsent"] as const,
  details: () => [...invoiceKeys.all, "detail"] as const,
  detail: (id: number) => [...invoiceKeys.details(), id] as const,
  billable: (patientId: number, invoiceId: number | null) =>
    [...invoiceKeys.all, "billable", patientId, invoiceId] as const,
  nextNumber: () => [...invoiceKeys.all, "next-number"] as const,
  patientInvoices: (patientId: number, period: Period) =>
    [...invoiceKeys.all, "patient-invoices", patientId, period] as const,
  patientFinanceSummaries: (period: Period) =>
    [...invoiceKeys.all, "patient-finance-summaries", period] as const,
  uninvoicedSessions: (patientId: number, period: Period) =>
    [...invoiceKeys.all, "uninvoiced-sessions", patientId, period] as const,
  byStatuses: (statuses: InvoiceStatus[]) =>
    [...invoiceKeys.all, "by-statuses", statuses] as const,
  allUninvoicedSessions: () =>
    [...invoiceKeys.all, "all-uninvoiced-sessions"] as const,
  tariffDrift: (id: number) =>
    [...invoiceKeys.all, "tariff-drift", id] as const,
};

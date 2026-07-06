import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoiceKeys } from "./invoices.keys";
import type { InvoiceFormValues, InvoiceStatus } from "./invoice.schema";
import type { Period } from "./invoices.api";
import * as api from "./invoices.api";

export function useInvoices(
  filters: { search?: string; patientId?: number; status?: InvoiceStatus } = {},
) {
  return useQuery({
    queryKey: invoiceKeys.list(filters),
    queryFn: () => api.listInvoices(filters),
  });
}

export function useInvoice(id?: number) {
  return useQuery({
    queryKey: invoiceKeys.detail(id ?? -1),
    queryFn: () => api.getInvoice(id as number),
    enabled: id != null,
  });
}

export function useUnsentInvoices() {
  return useQuery({
    queryKey: invoiceKeys.unsent(),
    queryFn: () => api.listUnsentInvoices(),
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: InvoiceFormValues) => api.createInvoice(values),
    onSuccess: () => qc.invalidateQueries({ queryKey: invoiceKeys.all }),
  });
}

export function useUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      id: number;
      values: InvoiceFormValues;
      pricing?: api.InvoicePricing;
    }) => api.updateInvoice(vars.id, vars.values, vars.pricing),
    onSuccess: () => qc.invalidateQueries({ queryKey: invoiceKeys.all }),
  });
}

export function useUpdateInvoiceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; status: InvoiceStatus }) =>
      api.updateInvoiceStatus(vars.id, vars.status),
    onSuccess: () => qc.invalidateQueries({ queryKey: invoiceKeys.all }),
  });
}

export function useSoftDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.softDeleteInvoice(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: invoiceKeys.all }),
  });
}

export function useBillableSessions(patientId?: number, invoiceId?: number) {
  return useQuery({
    queryKey: invoiceKeys.billable(patientId ?? -1, invoiceId ?? null),
    queryFn: () => api.listBillableSessions(patientId as number, invoiceId),
    enabled: patientId != null,
  });
}

export function useNextInvoiceNumber(enabled = true) {
  return useQuery({
    queryKey: invoiceKeys.nextNumber(),
    queryFn: () => api.nextSentInvoiceNumber(),
    enabled,
  });
}

export function usePatientInvoices(patientId?: number, period: Period = {}) {
  return useQuery({
    queryKey: invoiceKeys.patientInvoices(patientId ?? -1, period),
    queryFn: () => api.listPatientInvoices(patientId as number, period),
    enabled: patientId != null,
  });
}

export function useUninvoicedSessions(patientId?: number, period: Period = {}) {
  return useQuery({
    queryKey: invoiceKeys.uninvoicedSessions(patientId ?? -1, period),
    queryFn: () => api.listUninvoicedSessions(patientId as number, period),
    enabled: patientId != null,
  });
}

export function useInvoicesByStatuses(statuses: InvoiceStatus[]) {
  return useQuery({
    queryKey: invoiceKeys.byStatuses(statuses),
    queryFn: () => api.listInvoicesByStatuses(statuses),
  });
}

export function useAllUninvoicedSessions() {
  return useQuery({
    queryKey: invoiceKeys.allUninvoicedSessions(),
    queryFn: () => api.listAllUninvoicedSessions(),
  });
}

export function usePatientFinanceSummaries(period: Period = {}) {
  return useQuery({
    queryKey: invoiceKeys.patientFinanceSummaries(period),
    queryFn: () => api.listPatientFinanceSummaries(period),
  });
}

export function useInvoiceTariffDrift(invoiceId?: number) {
  return useQuery({
    queryKey: invoiceKeys.tariffDrift(invoiceId ?? -1),
    queryFn: () => api.getInvoiceTariffDrift(invoiceId as number),
    enabled: invoiceId != null,
  });
}

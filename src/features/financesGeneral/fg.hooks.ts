import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fgKeys } from "./fg.keys";
import * as api from "./fg.api";
import type { FgFilters, Period } from "./fg.api";
import type { FgTransactionInput } from "./fg.schema";

export function useFgTransactions(filters: FgFilters = {}) {
  return useQuery({
    queryKey: fgKeys.transactionList(filters),
    queryFn: () => api.listFgTransactions(filters),
  });
}

export function useFgSummary(period: Period = {}) {
  return useQuery({
    queryKey: fgKeys.summary(period),
    queryFn: () => api.getFgSummary(period),
  });
}

export function useFgTags() {
  return useQuery({ queryKey: fgKeys.tags(), queryFn: () => api.listFgTags() });
}

export function useFgPersons() {
  return useQuery({
    queryKey: fgKeys.persons(),
    queryFn: () => api.listFgPersons(),
  });
}

export function useCreateFgTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: FgTransactionInput) =>
      api.createFgTransaction(values),
    onSuccess: () => qc.invalidateQueries({ queryKey: fgKeys.all }),
  });
}

export function useUpdateFgTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; values: FgTransactionInput }) =>
      api.updateFgTransaction(vars.id, vars.values),
    onSuccess: () => qc.invalidateQueries({ queryKey: fgKeys.all }),
  });
}

export function useDeleteFgTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.softDeleteFgTransaction(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: fgKeys.all }),
  });
}

export function useCreateFgTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createFgTag,
    onSuccess: () => qc.invalidateQueries({ queryKey: fgKeys.all }),
  });
}

export function useDeleteFgTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.softDeleteFgTag(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: fgKeys.all }),
  });
}

export function useCreateFgPerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createFgPerson,
    onSuccess: () => qc.invalidateQueries({ queryKey: fgKeys.all }),
  });
}

export function useDeleteFgPerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.softDeleteFgPerson(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: fgKeys.all }),
  });
}

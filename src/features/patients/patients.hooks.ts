import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { patientKeys } from "./patients.keys";
import type { PatientFormValues } from "./patient.schema";
import * as api from "./patients.api";

export function usePatients(filters: { search?: string } = {}) {
  return useQuery({
    queryKey: patientKeys.list(filters),
    queryFn: () => api.listPatients(filters),
  });
}

export function usePatient(id: number) {
  return useQuery({
    queryKey: patientKeys.detail(id),
    queryFn: () => api.getPatient(id),
  });
}

export function useCreatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: PatientFormValues) => api.createPatient(values),
    onSuccess: () => qc.invalidateQueries({ queryKey: patientKeys.lists() }),
  });
}

export function useUpdatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; values: PatientFormValues }) =>
      api.updatePatient(vars.id, vars.values),
    onSuccess: () => qc.invalidateQueries({ queryKey: patientKeys.all }),
  });
}

export function useSoftDeletePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.softDeletePatient(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: patientKeys.lists() }),
  });
}

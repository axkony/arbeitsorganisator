import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sessionKeys } from "./sessions.keys";
import type { SessionFormValues, SessionStatus } from "./session.schema";
import * as api from "./sessions.api";

export function useSessions(
  filters: { search?: string; patientId?: number } = {},
) {
  return useQuery({
    queryKey: sessionKeys.list(filters),
    queryFn: () => api.listSessions(filters),
  });
}

export function useSession(id: number) {
  return useQuery({
    queryKey: sessionKeys.detail(id),
    queryFn: () => api.getSession(id),
  });
}

export function useUpcomingSessions() {
  return useQuery({
    queryKey: sessionKeys.upcoming(),
    queryFn: () => api.listUpcomingSessions(),
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: SessionFormValues) => api.createSession(values),
    onSuccess: () => qc.invalidateQueries({ queryKey: sessionKeys.all }),
  });
}

export function useUpdateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; values: SessionFormValues }) =>
      api.updateSession(vars.id, vars.values),
    onSuccess: () => qc.invalidateQueries({ queryKey: sessionKeys.all }),
  });
}

export function useUpdateSessionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; status: SessionStatus }) =>
      api.updateSessionStatus(vars.id, vars.status),
    onSuccess: () => qc.invalidateQueries({ queryKey: sessionKeys.all }),
  });
}

export function useSoftDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.softDeleteSession(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: sessionKeys.all }),
  });
}

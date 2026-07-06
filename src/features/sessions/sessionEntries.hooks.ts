import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sessionEntryKeys } from "./sessionEntries.keys";
import type { CreateEntryInput, UpdateEntryInput } from "./sessionEntries.api";

import * as api from "./sessionEntries.api";
import { sessionKeys } from "./sessions.keys";

export function useSessionEntries(sessionId: number) {
  return useQuery({
    queryKey: sessionEntryKeys.list(sessionId),
    queryFn: () => api.listSessionEntries(sessionId),
  });
}

export function useCreateSessionEntry(sessionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEntryInput) =>
      api.createSessionEntry(sessionId, input),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: sessionEntryKeys.list(sessionId) }),
  });
}

export function useUpdateSessionEntry(sessionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number } & UpdateEntryInput) => {
      const { id, ...input } = vars;
      return api.updateSessionEntry(id, input as UpdateEntryInput);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: sessionEntryKeys.list(sessionId) }),
  });
}

export function useDeleteSessionEntry(sessionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteSessionEntry(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: sessionEntryKeys.list(sessionId) }),
  });
}

export function useSession(id: number) {
  return useQuery({
    queryKey: sessionKeys.detail(id),
    queryFn: () => api.getSession(id),
  });
}

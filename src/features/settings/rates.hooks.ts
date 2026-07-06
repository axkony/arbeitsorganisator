import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { rateKeys } from "./rates.keys";
import * as api from "./rates.api";

export function useSessionRates() {
  return useQuery({
    queryKey: rateKeys.all,
    queryFn: () => api.listSessionRates(),
  });
}

export function useUpdateSessionRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { sessionType: string; rateRappen: number }) =>
      api.updateSessionRate(vars.sessionType, vars.rateRappen),
    onSuccess: () => qc.invalidateQueries({ queryKey: rateKeys.all }),
  });
}

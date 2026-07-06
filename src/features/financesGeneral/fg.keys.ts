import type { FgFilters, Period } from "./fg.api";

export const fgKeys = {
  all: ["fg"] as const,
  transactions: () => [...fgKeys.all, "transactions"] as const,
  transactionList: (filters: FgFilters = {}) =>
    [...fgKeys.transactions(), filters] as const,
  summary: (period: Period = {}) => [...fgKeys.all, "summary", period] as const,
  tags: () => [...fgKeys.all, "tags"] as const,
  persons: () => [...fgKeys.all, "persons"] as const,
};

export const sessionKeys = {
  all: ["sessions"] as const,
  lists: () => [...sessionKeys.all, "list"] as const,
  list: (filters: { search?: string; patientId?: number } = {}) =>
    [...sessionKeys.lists(), filters] as const,
  upcoming: () => [...sessionKeys.all, "upcoming"] as const,
  details: () => [...sessionKeys.all, "detail"] as const,
  detail: (id: number) => [...sessionKeys.details(), id] as const,
};

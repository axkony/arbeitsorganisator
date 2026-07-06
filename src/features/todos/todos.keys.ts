export const todoKeys = {
  all: ["todos"] as const,
  lists: () => [...todoKeys.all, "list"] as const,
  list: (
    filters: { search?: string; status?: string; patientId?: number } = {},
  ) => [...todoKeys.lists(), filters] as const,
  open: () => [...todoKeys.all, "open"] as const,
  children: (parentId: number) =>
    [...todoKeys.all, "children", parentId] as const,
  ancestors: (id: number) => [...todoKeys.all, "ancestors", id] as const,
  details: () => [...todoKeys.all, "detail"] as const,
  detail: (id: number) => [...todoKeys.details(), id] as const,
};

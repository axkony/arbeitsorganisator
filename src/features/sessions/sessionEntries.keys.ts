export const sessionEntryKeys = {
  all: ["session-entries"] as const,
  list: (sessionId: number) => [...sessionEntryKeys.all, sessionId] as const,
};

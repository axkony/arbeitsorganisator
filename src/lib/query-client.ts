import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: "always", // local SQLite — never gate on connectivity
      staleTime: 1000 * 30,
      retry: false,
      refetchOnWindowFocus: false,
    },
    mutations: {
      networkMode: "always", // run queries and writes offline too
    },
  },
});

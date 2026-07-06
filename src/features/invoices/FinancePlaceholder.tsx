import type { ReactNode } from "react";

export function FinancePlaceholder({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

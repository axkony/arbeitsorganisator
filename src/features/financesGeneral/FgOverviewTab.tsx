import { useState } from "react";

import { PeriodFilter } from "@/features/invoices/PeriodFilter";
import { formatRappen } from "@/lib/money";
import { cn } from "@/lib/utils";

import type { Period } from "./fg.api";
import { useFgSummary } from "./fg.hooks";

function Stat({
  label,
  value,
  hint,
  accent,
  emphasize,
}: {
  label: string;
  value: number;
  hint?: string;
  accent?: "income" | "expense" | "net";
  emphasize?: boolean;
}) {
  const color =
    accent === "income"
      ? "text-emerald-600"
      : accent === "expense"
        ? "text-rose-600"
        : accent === "net"
          ? value >= 0
            ? "text-emerald-600"
            : "text-rose-600"
          : "";
  return (
    <div
      className={cn(
        "flex flex-col gap-1 border p-4",
        emphasize && "border-primary bg-primary/5",
      )}
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-xl font-semibold tabular-nums", color)}>
        {formatRappen(value)}
      </span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

export function FgOverviewTab() {
  const [period, setPeriod] = useState<Period>({});
  const { data, isLoading, isError } = useFgSummary(period);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Gesamtübersicht über Praxis- und private Finanzen im gewählten Zeitraum.
        </p>
        <PeriodFilter onChange={setPeriod} />
      </div>

      {isLoading && <p className="text-muted-foreground">Lädt…</p>}
      {isError && (
        <p className="text-destructive">Übersicht konnte nicht geladen werden.</p>
      )}

      {data && (
        <div className="space-y-6">
          <div>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">
              Einnahmen
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Stat
                label="Praxis (bezahlte Rechnungen)"
                value={data.praxisIncome}
                accent="income"
                hint="Aus dem Tab „Finanzen“"
              />
              <Stat
                label="Weitere Einnahmen"
                value={data.generalIncome}
                accent="income"
              />
              <Stat
                label="Einnahmen total"
                value={data.totalIncome}
                accent="income"
                emphasize
              />
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">
              Ausgaben & Saldo
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Stat
                label="Ausgaben total"
                value={data.generalExpense}
                accent="expense"
              />
              <Stat
                label="Saldo (Einnahmen − Ausgaben)"
                value={data.net}
                accent="net"
                emphasize
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

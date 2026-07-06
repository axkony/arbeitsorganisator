import { useNavigate } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";

import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SESSION_TYPE_LABELS } from "@/features/sessions/session.schema";
import { useSessionRates } from "@/features/settings/rates.hooks";
import { formatRappen } from "@/lib/money";
import type { AllUninvoicedSession } from "./invoices.api";
import { useAllUninvoicedSessions } from "./invoices.hooks";

export function UninvoicedSessionsTab() {
  const navigate = useNavigate();
  const { data: sessions } = useAllUninvoicedSessions();
  const { data: rates } = useSessionRates();
  const rateMap = new Map(
    (rates ?? []).map((r) => [r.sessionType, r.rateRappen]),
  );

  const value = (s: AllUninvoicedSession) =>
    Math.round(
      ((s.durationMinutes ?? 0) / 60) * (rateMap.get(s.sessionType) ?? 0),
    );
  const total = (sessions ?? []).reduce((a, s) => a + value(s), 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Abgeschlossene Sitzungen, die in keiner aktiven Rechnung verwendet
          werden. <span className="text-amber-600">Gelb</span>: aus stornierter
          Rechnung wieder freigegeben.
        </p>
        <span className="text-sm">
          <span className="text-muted-foreground">Potenzieller Umsatz: </span>
          <span className="font-semibold tabular-nums">
            {formatRappen(total)}
          </span>
        </span>
      </div>

      {!sessions || sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Keine nicht verrechneten Sitzungen.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Datum</TableHead>
              <TableHead>Art</TableHead>
              <TableHead className="text-right">Dauer</TableHead>
              <TableHead className="text-right">Wert</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((s) => (
              <TableRow
                key={s.id}
                className={cn(
                  "cursor-pointer",
                  s.fromCancelled && "bg-amber-50 dark:bg-amber-950/30",
                )}
                onClick={() =>
                  navigate({
                    to: "/sessions/$sessionId",
                    params: { sessionId: String(s.id) },
                  })
                }
              >
                <TableCell>
                  {s.patientLastName}, {s.patientFirstName}
                  {s.fromCancelled && (
                    <span className="ml-2 rounded bg-amber-200 px-1 text-xs text-amber-900 dark:bg-amber-800 dark:text-amber-100">
                      storniert
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {format(parseISO(s.sessionDate), "dd.MM.yyyy")}
                </TableCell>
                <TableCell>{SESSION_TYPE_LABELS[s.sessionType]}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {s.durationMinutes ?? 0} Min.
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatRappen(value(s))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

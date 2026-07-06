import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PatientCombobox } from "@/features/patients/PatientCombobox";
import { SESSION_TYPE_LABELS } from "@/features/sessions/session.schema";
import { useSessionRates } from "@/features/settings/rates.hooks";
import { formatRappen } from "@/lib/money";

import { INVOICE_STATUS_LABELS } from "./invoice.schema";
import type {
  InvoiceListItem,
  Period,
  UninvoicedSession,
} from "./invoices.api";
import {
  usePatientFinanceSummaries,
  usePatientInvoices,
  useUninvoicedSessions,
  useUpdateInvoiceStatus,
} from "./invoices.hooks";
import { PeriodFilter } from "./PeriodFilter";
import { InvoiceFormDialog } from "./InvoiceFormDialog";

type Bucket = "uninvoiced" | "drafts" | "open" | "paid";
type Pending = { kind: "send" | "paid"; id: number; label: string };

function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return format(parseISO(value), "dd.MM.yyyy");
  } catch {
    return value;
  }
}

export function PatientFinancesTab() {
  const navigate = useNavigate();
  const [patientId, setPatientId] = useState("");
  const [period, setPeriod] = useState<Period>({});
  const [bucket, setBucket] = useState<Bucket>("open");
  const [invoiceForSession, setInvoiceForSession] = useState<{
    patientId: number;
    sessionId: number;
  } | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);

  const pid = patientId ? Number(patientId) : undefined;
  const { data: invoices } = usePatientInvoices(pid, period);
  const { data: sessions } = useUninvoicedSessions(pid, period);
  const { data: summaries } = usePatientFinanceSummaries(period);
  const { data: rates } = useSessionRates();
  const updateStatus = useUpdateInvoiceStatus();

  const rateMap = new Map(
    (rates ?? []).map((r) => [r.sessionType, r.rateRappen]),
  );
  const sessionValue = (s: UninvoicedSession) =>
    Math.round(
      ((s.durationMinutes ?? 0) / 60) * (rateMap.get(s.sessionType) ?? 0),
    );

  const summaryMap = new Map((summaries ?? []).map((s) => [s.patientId, s]));
  function renderPatientMeta(id: number) {
    const s = summaryMap.get(id);
    const unpaid = s ? s.uninvoiced + s.drafts + s.open : 0;
    const received = s ? s.paid : 0;
    return (
      <span className="ml-2 flex shrink-0 gap-2 text-xs tabular-nums">
        <span className="text-red-600">{formatRappen(unpaid)}</span>
        <span className="text-green-600">{formatRappen(received)}</span>
      </span>
    );
  }

  const drafts = (invoices ?? []).filter((i) => i.status === "draft");
  const open = (invoices ?? []).filter(
    (i) => i.status === "sent" || i.status === "overdue",
  );
  const paid = (invoices ?? []).filter((i) => i.status === "paid");
  const sumInv = (list: InvoiceListItem[]) =>
    list.reduce((a, i) => a + i.total, 0);
  const uninvoicedSum = (sessions ?? []).reduce(
    (a, s) => a + sessionValue(s),
    0,
  );

  const tiles: {
    key: Bucket;
    label: string;
    sum: number;
    count: number;
    unit: string;
  }[] = [
    {
      key: "uninvoiced",
      label: "Nicht verrechnet",
      sum: uninvoicedSum,
      count: sessions?.length ?? 0,
      unit: "Sitzungen",
    },
    {
      key: "drafts",
      label: "Entwürfe",
      sum: sumInv(drafts),
      count: drafts.length,
      unit: "Rechnungen",
    },
    {
      key: "open",
      label: "Offen",
      sum: sumInv(open),
      count: open.length,
      unit: "Rechnungen",
    },
    {
      key: "paid",
      label: "Bezahlt",
      sum: sumInv(paid),
      count: paid.length,
      unit: "Rechnungen",
    },
  ];

  const openInvoice = (id: number) =>
    navigate({ to: "/finances/$invoiceId", params: { invoiceId: String(id) } });

  function confirmPending() {
    if (!pending) return;
    const status = pending.kind === "send" ? "sent" : "paid";
    updateStatus.mutate(
      { id: pending.id, status },
      {
        onSuccess: () =>
          toast.success(
            status === "sent" ? "Rechnung gesendet" : "Als bezahlt markiert",
          ),
        onError: (e) => toast.error(`Fehlgeschlagen: ${String(e)}`),
      },
    );
    setPending(null);
  }

  // Rendered as plain function calls (not <Comp/>) to avoid remounting.
  function invoiceRows(list: InvoiceListItem[], menuKind?: "send" | "paid") {
    if (list.length === 0)
      return <p className="text-sm text-muted-foreground">Keine Einträge.</p>;
    const row = (inv: InvoiceListItem, withKey: boolean) => (
      <TableRow
        key={withKey ? inv.id : undefined}
        className="cursor-pointer"
        onClick={() => openInvoice(inv.id)}
      >
        <TableCell className="font-medium">
          {inv.invoiceNumber ?? "—"}
        </TableCell>
        <TableCell>{formatDate(inv.issuedAt)}</TableCell>
        <TableCell>{INVOICE_STATUS_LABELS[inv.status]}</TableCell>
        <TableCell className="text-right tabular-nums">
          {formatRappen(inv.total, inv.currency)}
        </TableCell>
      </TableRow>
    );
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nummer</TableHead>
            <TableHead>Ausgestellt</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Betrag</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((inv) =>
            menuKind ? (
              <ContextMenu key={inv.id}>
                <ContextMenuTrigger asChild>
                  {row(inv, false)}
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem
                    onSelect={() =>
                      setPending({
                        kind: menuKind,
                        id: inv.id,
                        label: inv.invoiceNumber ?? "Entwurf",
                      })
                    }
                  >
                    {menuKind === "send" ? "Senden" : "Als bezahlt markieren"}
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ) : (
              row(inv, true)
            ),
          )}
        </TableBody>
      </Table>
    );
  }

  function sessionRows() {
    if ((sessions?.length ?? 0) === 0)
      return (
        <p className="text-sm text-muted-foreground">
          Keine nicht verrechneten Sitzungen.
        </p>
      );
    const row = (s: UninvoicedSession) => (
      <TableRow
        className="cursor-pointer"
        onClick={() =>
          navigate({
            to: "/sessions/$sessionId",
            params: { sessionId: String(s.id) },
          })
        }
      >
        <TableCell>{formatDate(s.sessionDate)}</TableCell>
        <TableCell>{SESSION_TYPE_LABELS[s.sessionType]}</TableCell>
        <TableCell className="text-right tabular-nums">
          {s.durationMinutes ?? 0} Min.
        </TableCell>
        <TableCell className="text-right tabular-nums">
          {formatRappen(sessionValue(s))}
        </TableCell>
      </TableRow>
    );
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Datum</TableHead>
            <TableHead>Art</TableHead>
            <TableHead className="text-right">Dauer</TableHead>
            <TableHead className="text-right">Wert</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions!.map((s) => (
            <ContextMenu key={s.id}>
              <ContextMenuTrigger asChild>{row(s)}</ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem
                  onSelect={() =>
                    pid != null &&
                    setInvoiceForSession({ patientId: pid, sessionId: s.id })
                  }
                >
                  Neue Rechnung erstellen
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="w-80">
          <PatientCombobox
            value={patientId}
            onChange={setPatientId}
            placeholder="Patient wählen"
            renderMeta={renderPatientMeta}
          />
        </div>
        <PeriodFilter onChange={setPeriod} />
      </div>

      {!patientId ? (
        <p className="text-sm text-muted-foreground">
          Bitte einen Patienten wählen.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {tiles.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setBucket(t.key)}
                className={cn(
                  "flex flex-col items-start gap-0.5  border p-3 text-left transition-colors",
                  bucket === t.key
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50",
                )}
              >
                <span className="text-xs text-muted-foreground">{t.label}</span>
                <span className="text-lg font-semibold tabular-nums">
                  {formatRappen(t.sum)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t.count} {t.unit}
                </span>
              </button>
            ))}
          </div>

          <div>
            {bucket === "uninvoiced" && sessionRows()}
            {bucket === "drafts" && invoiceRows(drafts, "send")}
            {bucket === "open" && invoiceRows(open, "paid")}
            {bucket === "paid" && invoiceRows(paid)}
          </div>
        </div>
      )}

      <InvoiceFormDialog
        open={invoiceForSession !== null}
        onOpenChange={(o) => !o && setInvoiceForSession(null)}
        defaultPatientId={invoiceForSession?.patientId}
        defaultSessionId={invoiceForSession?.sessionId}
      />

      <AlertDialog
        open={pending !== null}
        onOpenChange={(o) => !o && setPending(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.kind === "send"
                ? "Rechnung senden?"
                : "Als bezahlt markieren?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending
                ? `„${pending.label}“ ${
                    pending.kind === "send"
                      ? "wird gesendet und erhält eine Rechnungsnummer."
                      : "wird als bezahlt markiert."
                  }`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPending}>
              {pending?.kind === "send" ? "Senden" : "Bezahlt"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

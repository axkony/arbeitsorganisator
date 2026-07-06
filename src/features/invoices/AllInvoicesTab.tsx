import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { UninvoicedSessionsTab } from "./UninvoicedSessionsTab";

import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SortableHead, useTableSort } from "@/components/sortable-table";
import { RowActions } from "@/components/row-actions";
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

import { formatRappen } from "@/lib/money";
import type { InvoiceListItem, Period } from "./invoices.api";
import {
  useInvoices,
  usePatientFinanceSummaries,
  useSoftDeleteInvoice,
} from "./invoices.hooks";
import { InvoiceFormDialog } from "./InvoiceFormDialog";
import { InvoiceStatusSelect } from "./InvoiceStatusSelect";
import { PeriodFilter } from "./PeriodFilter";

type Bucket = "uninvoiced" | "drafts" | "open" | "paid";

function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return format(parseISO(value), "dd.MM.yyyy");
  } catch {
    return value;
  }
}

function inPeriod(date: string, period: Period) {
  if (period.from && date < period.from) return false;
  if (period.to && date >= period.to) return false;
  return true;
}

function invoiceSortValue(
  i: InvoiceListItem,
  key: string,
): string | number | null {
  switch (key) {
    case "invoiceNumber":
      return i.invoiceNumber;
    case "patient":
      return `${i.patientLastName} ${i.patientFirstName}`;
    case "total":
      return i.total;
    case "status":
      return i.status;
    case "issuedAt":
      return i.issuedAt;
    case "dueAt":
      return i.dueAt;
    default:
      return null;
  }
}

export function AllInvoicesTab() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<Period>({});
  const [bucket, setBucket] = useState<Bucket | null>(null);

  const { data: invoices, isLoading, isError } = useInvoices({ search });
  const { data: summaries } = usePatientFinanceSummaries(period);

  const filtered = (invoices ?? [])
    .filter((i) => inPeriod(i.issuedAt ?? i.createdAt, period))
    .filter((i) => {
      if (bucket === null) return true;
      if (bucket === "drafts") return i.status === "draft";
      if (bucket === "open")
        return i.status === "sent" || i.status === "overdue";
      if (bucket === "paid") return i.status === "paid";
      return false; // "uninvoiced" → keine Rechnungen; Sitzungen werden gezeigt
    });

  const {
    sorted: rows,
    sort,
    toggle,
  } = useTableSort(filtered, invoiceSortValue, {
    key: "invoiceNumber",
    dir: "desc",
  });

  const totals = (summaries ?? []).reduce(
    (a, s) => ({
      uninvoiced: a.uninvoiced + s.uninvoiced,
      drafts: a.drafts + s.drafts,
      open: a.open + s.open,
      paid: a.paid + s.paid,
    }),
    { uninvoiced: 0, drafts: 0, open: 0, paid: 0 },
  );
  const stats: { key: Bucket; label: string; value: number }[] = [
    { key: "uninvoiced", label: "Nicht verrechnet", value: totals.uninvoiced },
    { key: "drafts", label: "Entwürfe", value: totals.drafts },
    { key: "open", label: "Offen", value: totals.open },
    { key: "paid", label: "Bezahlt", value: totals.paid },
  ];

  const softDelete = useSoftDeleteInvoice();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InvoiceListItem | null>(
    null,
  );

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  function confirmDelete() {
    if (!deleteTarget) return;
    softDelete.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Rechnung gelöscht");
        setDeleteTarget(null);
      },
      onError: (error) =>
        toast.error(`Löschen fehlgeschlagen: ${String(error)}`),
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Nach Nummer oder Patient suchen…"
            className="pl-8"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <PeriodFilter onChange={setPeriod} />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setBucket((b) => (b === s.key ? null : s.key))}
            className={cn(
              "flex flex-col items-start gap-0.5 border p-3 text-left transition-colors",
              bucket === s.key
                ? "border-primary bg-primary/5"
                : "hover:bg-muted/50",
            )}
          >
            <span className="text-xs text-muted-foreground">{s.label}</span>
            <span className="font-semibold tabular-nums">
              {formatRappen(s.value)}
            </span>
          </button>
        ))}
      </div>
      {bucket === "uninvoiced" ? (
        <UninvoicedSessionsTab />
      ) : (
        <>
          {isLoading && <p className="text-muted-foreground">Lädt…</p>}
          {isError && (
            <p className="text-destructive">
              Rechnungen konnten nicht geladen werden.
            </p>
          )}
          {rows && rows.length === 0 && (
            <p className="text-muted-foreground">
              Keine Rechnungen für diese Auswahl.
            </p>
          )}

          {rows && rows.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead
                    label="Nummer"
                    sortKey="invoiceNumber"
                    sort={sort}
                    onToggle={toggle}
                  />
                  <SortableHead
                    label="Patient"
                    sortKey="patient"
                    sort={sort}
                    onToggle={toggle}
                  />
                  <SortableHead
                    label="Betrag"
                    sortKey="total"
                    sort={sort}
                    onToggle={toggle}
                  />
                  <SortableHead
                    label="Ausgestellt"
                    sortKey="issuedAt"
                    sort={sort}
                    onToggle={toggle}
                  />
                  <SortableHead
                    label="Fällig"
                    sortKey="dueAt"
                    sort={sort}
                    onToggle={toggle}
                  />
                  <SortableHead
                    label="Status"
                    sortKey="status"
                    sort={sort}
                    onToggle={toggle}
                  />
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((inv) => (
                  <TableRow
                    key={inv.id}
                    className="cursor-pointer"
                    onClick={() =>
                      navigate({
                        to: "/finances/$invoiceId",
                        params: { invoiceId: String(inv.id) },
                      })
                    }
                  >
                    <TableCell className="font-medium">
                      {inv.invoiceNumber ?? "—"}
                    </TableCell>
                    <TableCell>
                      {inv.patientLastName}, {inv.patientFirstName}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatRappen(inv.total, inv.currency)}
                    </TableCell>
                    <TableCell>{formatDate(inv.issuedAt)}</TableCell>
                    <TableCell>{formatDate(inv.dueAt)}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <InvoiceStatusSelect
                        invoiceId={inv.id}
                        status={inv.status}
                      />
                    </TableCell>
                    <TableCell
                      className="text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <RowActions
                        onEdit={
                          inv.status === "draft"
                            ? () => {
                                setEditingId(inv.id);
                                setEditOpen(true);
                              }
                            : undefined
                        }
                        onDelete={() => setDeleteTarget(inv)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </>
      )}

      <InvoiceFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        invoiceId={editingId}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rechnung löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Rechnung „${deleteTarget.invoiceNumber ?? "Entwurf"}“ wird entfernt.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

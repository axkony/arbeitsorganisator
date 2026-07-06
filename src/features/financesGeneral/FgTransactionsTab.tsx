import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { PeriodFilter } from "@/features/invoices/PeriodFilter";
import { formatRappen, francsToRappen } from "@/lib/money";
import { cn } from "@/lib/utils";

import { expandOccurrences, type FgTransaction, type Period } from "./fg.api";
import type { FgDirection } from "./fg.schema";
import { FG_DIRECTION_TITLES, FG_RECURRENCE_LABELS } from "./fg.labels";
import {
  useDeleteFgTransaction,
  useFgPersons,
  useFgTags,
  useFgTransactions,
} from "./fg.hooks";
import { FgTransactionFormDialog } from "./FgTransactionFormDialog";

const AMOUNT_RE = /^\d+([.,]\d{1,2})?$/;
const ALL = "all"; // Radix Select sentinel for "no person filter".

function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return format(parseISO(value), "dd.MM.yyyy");
  } catch {
    return value;
  }
}

function periodLabel(txn: FgTransaction) {
  if (txn.recurrence === "once") return formatDate(txn.startDate);
  const end = txn.endDate ? formatDate(txn.endDate) : "laufend";
  return `ab ${formatDate(txn.startDate)} · ${end}`;
}

export function FgTransactionsTab({ direction }: { direction: FgDirection }) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<Period>({});
  const [personId, setPersonId] = useState<string>(ALL);
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [minFrancs, setMinFrancs] = useState("");
  const [maxFrancs, setMaxFrancs] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FgTransaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FgTransaction | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data: tags } = useFgTags();
  const { data: persons } = useFgPersons();

  const filters = useMemo(
    () => ({
      direction,
      search: search || undefined,
      period,
      personId: personId !== ALL ? Number(personId) : undefined,
      tagIds: tagIds.length ? tagIds : undefined,
      minRappen: AMOUNT_RE.test(minFrancs.trim())
        ? francsToRappen(minFrancs)
        : undefined,
      maxRappen: AMOUNT_RE.test(maxFrancs.trim())
        ? francsToRappen(maxFrancs)
        : undefined,
    }),
    [direction, search, period, personId, tagIds, minFrancs, maxFrancs],
  );

  const { data: rows, isLoading, isError } = useFgTransactions(filters);
  const del = useDeleteFgTransaction();

  // Total for the current selection, expanded over the period.
  const periodTotal = (rows ?? []).reduce(
    (sum, r) => sum + expandOccurrences(r, period).length * r.amountRappen,
    0,
  );

  const title = FG_DIRECTION_TITLES[direction];
  const accent = direction === "income" ? "text-emerald-600" : "text-rose-600";

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(txn: FgTransaction) {
    setEditing(txn);
    setDialogOpen(true);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    del.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Eintrag gelöscht");
        setDeleteTarget(null);
      },
      onError: (error) => toast.error(`Löschen fehlgeschlagen: ${String(error)}`),
    });
  }

  return (
    <div>
      {/* Filters */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={`${title} durchsuchen…`}
            className="pl-8"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <PeriodFilter onChange={setPeriod} />
          <Button onClick={openCreate}>
            <PlusIcon className="size-4" />
            Neu
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select value={personId} onValueChange={setPersonId}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Person" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Alle Personen</SelectItem>
            {(persons ?? []).map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <span>Betrag</span>
          <Input
            inputMode="decimal"
            placeholder="von"
            className="w-20 tabular-nums"
            value={minFrancs}
            onChange={(e) => setMinFrancs(e.target.value)}
          />
          <span>–</span>
          <Input
            inputMode="decimal"
            placeholder="bis"
            className="w-20 tabular-nums"
            value={maxFrancs}
            onChange={(e) => setMaxFrancs(e.target.value)}
          />
          <span>CHF</span>
        </div>

        {tags && tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {tags.map((tag) => {
              const active = tagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    setTagIds((ids) =>
                      active ? ids.filter((i) => i !== tag.id) : [...ids, tag.id],
                    )
                  }
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                    active
                      ? "border-primary bg-primary/10 font-medium"
                      : "hover:bg-muted",
                  )}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Period total */}
      <div className="mb-4 flex items-baseline gap-3 border p-3">
        <span className="text-xs text-muted-foreground">
          {title} im gewählten Zeitraum
        </span>
        <span className={cn("text-lg font-semibold tabular-nums", accent)}>
          {formatRappen(periodTotal)}
        </span>
      </div>

      {isLoading && <p className="text-muted-foreground">Lädt…</p>}
      {isError && (
        <p className="text-destructive">Einträge konnten nicht geladen werden.</p>
      )}
      {rows && rows.length === 0 && (
        <p className="text-muted-foreground">
          Keine {title} für diese Auswahl.
        </p>
      )}

      {rows && rows.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Beschreibung</TableHead>
              <TableHead className="text-right">Betrag</TableHead>
              <TableHead>Wiederholung</TableHead>
              <TableHead>Person</TableHead>
              <TableHead>Zeitraum</TableHead>
              <TableHead className="text-right">Summe im Zeitraum</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((txn) => {
              const occSum =
                expandOccurrences(txn, period).length * txn.amountRappen;
              return (
                <TableRow key={txn.id}>
                  <TableCell>
                    <div className="font-medium">{txn.description}</div>
                    {txn.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {txn.tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
                          >
                            <span
                              className="inline-block size-2 rounded-full"
                              style={{
                                backgroundColor:
                                  tag.color ?? "var(--muted-foreground)",
                              }}
                            />
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatRappen(txn.amountRappen)}
                  </TableCell>
                  <TableCell>{FG_RECURRENCE_LABELS[txn.recurrence]}</TableCell>
                  <TableCell>{txn.personName ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {periodLabel(txn)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatRappen(occSum)}
                  </TableCell>
                  <TableCell className="text-right">
                    <RowActions
                      onEdit={() => openEdit(txn)}
                      onDelete={() => setDeleteTarget(txn)}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <FgTransactionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        direction={direction}
        transaction={editing}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eintrag löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `„${deleteTarget.description}“ wird entfernt.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

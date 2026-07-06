import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { format, parseISO } from "date-fns";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { toast } from "sonner";

import { SessionFormDialog } from "./SessionFormDialog";
import { SortableHead, useTableSort } from "@/components/sortable-table";

import { SESSION_STATUS_LABELS, SESSION_TYPE_LABELS } from "./session.schema";
import { SessionStatusSelect } from "./SessionStatusSelect";
import type { SessionListItem } from "./sessions.api";
import { useSessions, useSoftDeleteSession } from "./sessions.hooks";
import PageHeader from "@/components/page-header";
import PageContainer from "@/components/page-container";
import { RowActions } from "@/components/row-actions";

function formatDateTime(value: string) {
  try {
    return format(parseISO(value), "dd.MM.yyyy HH:mm");
  } catch {
    return value;
  }
}

function sessionSortValue(
  s: SessionListItem,
  key: string,
): string | number | null {
  switch (key) {
    case "date":
      return s.sessionDate;
    case "patient":
      return `${s.patientLastName} ${s.patientFirstName}`;
    case "type":
      return SESSION_TYPE_LABELS[s.sessionType];
    case "status":
      return SESSION_STATUS_LABELS[s.status];
    case "duration":
      return s.durationMinutes;
    default:
      return null;
  }
}

export function SessionsPage() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // Debounce: only commit the search 300ms after typing stops.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data: sessions, isLoading, isError } = useSessions({ search });

  const {
    sorted: sessionRows,
    sort,
    toggle,
  } = useTableSort(
    sessions,
    sessionSortValue,
    { key: "date", dir: "desc" }, // newest first by default
  );

  const softDelete = useSoftDeleteSession();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SessionListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SessionListItem | null>(
    null,
  );

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openDetail(session: SessionListItem) {
    navigate({
      to: "/sessions/$sessionId",
      params: { sessionId: String(session.id) },
    });
  }
  function openEdit(session: SessionListItem) {
    setEditing(session);
    setDialogOpen(true);
  }
  function confirmDelete() {
    if (!deleteTarget) return;
    softDelete.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Sitzung gelöscht");
        setDeleteTarget(null);
      },
      onError: (error) =>
        toast.error(`Löschen fehlgeschlagen: ${String(error)}`),
    });
  }

  return (
    <PageContainer>
      <PageHeader title="Sitzungen">
        <Button onClick={openCreate}>Neue Sitzung</Button>
      </PageHeader>

      <div className="relative mb-4 max-w-sm">
        <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Nach Patientenname suchen…"
          className="pl-8"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      {isLoading && <p className="text-muted-foreground">Lädt…</p>}
      {isError && (
        <p className="text-destructive">
          Sitzungen konnten nicht geladen werden.
        </p>
      )}

      {sessionRows && sessionRows.length === 0 && (
        <p className="text-muted-foreground">
          {search
            ? "Keine Sitzungen für diese Suche."
            : "Noch keine Sitzungen."}
        </p>
      )}

      {sessionRows && sessionRows.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead
                label="Datum"
                sortKey="date"
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
                label="Art"
                sortKey="type"
                sort={sort}
                onToggle={toggle}
              />
              <SortableHead
                label="Status"
                sortKey="status"
                sort={sort}
                onToggle={toggle}
              />
              <SortableHead
                label="Dauer"
                sortKey="duration"
                sort={sort}
                onToggle={toggle}
              />
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {sessionRows.map((session) => (
              <TableRow
                key={session.id}
                className="cursor-pointer"
                onClick={() => openDetail(session)}
              >
                <TableCell>{formatDateTime(session.sessionDate)}</TableCell>
                <TableCell className="font-medium">
                  {session.patientLastName}, {session.patientFirstName}
                </TableCell>
                <TableCell>
                  {SESSION_TYPE_LABELS[session.sessionType]}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <SessionStatusSelect
                    sessionId={session.id}
                    status={session.status}
                  />
                </TableCell>

                <TableCell>
                  {session.durationMinutes != null
                    ? `${session.durationMinutes} Min.`
                    : "—"}
                </TableCell>
                <TableCell
                  className="text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <RowActions
                    onEdit={() => openEdit(session)}
                    onDelete={() => setDeleteTarget(session)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <SessionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        session={editing}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sitzung löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Sitzung von ${deleteTarget.patientFirstName} ${deleteTarget.patientLastName} am ${formatDateTime(deleteTarget.sessionDate)} wird entfernt.`
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
    </PageContainer>
  );
}

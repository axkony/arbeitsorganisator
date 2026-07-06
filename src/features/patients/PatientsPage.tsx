import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";

import PageContainer from "@/components/page-container";
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SortableHead, useTableSort } from "@/components/sortable-table";

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

import { RowActions } from "@/components/row-actions";
import { SessionFormDialog } from "@/features/sessions/SessionFormDialog";
import { TodoFormDialog } from "@/features/todos/TodoFormDialog";

import { PatientFormDialog } from "./PatientFormDialog";
import type { Patient } from "./patients.api";
import { usePatients, useSoftDeletePatient } from "./patients.hooks";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";

function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return format(parseISO(value), "dd.MM.yyyy");
  } catch {
    return value;
  }
}

function patientSortValue(p: Patient, key: string): string | number | null {
  switch (key) {
    case "name":
      return `${p.lastName} ${p.firstName}`;
    case "dateOfBirth":
      return p.dateOfBirth;
    case "phone":
      return p.phone;
    case "email":
      return p.email;
    default:
      return null;
  }
}

export function PatientsPage() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const { data: patients, isLoading, isError } = usePatients({ search });

  const {
    sorted: patientRows,
    sort,
    toggle,
  } = useTableSort(patients, patientSortValue, { key: "name", dir: "asc" });

  const softDelete = useSoftDeletePatient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);
  const [sessionPatient, setSessionPatient] = useState<Patient | null>(null);
  const [todoPatient, setTodoPatient] = useState<Patient | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(patient: Patient) {
    setEditing(patient);
    setDialogOpen(true);
  }
  function openDetail(patient: Patient) {
    navigate({
      to: "/patients/$patientId",
      params: { patientId: String(patient.id) },
    });
  }
  function confirmDelete() {
    if (!deleteTarget) return;
    softDelete.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Patient gelöscht");
        setDeleteTarget(null);
      },
      onError: (error) =>
        toast.error(`Löschen fehlgeschlagen: ${String(error)}`),
    });
  }

  return (
    <PageContainer>
      <PageHeader title="Patienten">
        <Button onClick={openCreate}>Neuer Patient</Button>
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
          Patienten konnten nicht geladen werden.
        </p>
      )}

      {patientRows && patientRows.length === 0 && (
        <p className="text-muted-foreground">
          {search
            ? "Keine Patienten für diese Suche."
            : "Noch keine Patienten."}
        </p>
      )}

      {patientRows && patientRows.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead
                label="Name"
                sortKey="name"
                sort={sort}
                onToggle={toggle}
              />
              <SortableHead
                label="Geburtsdatum"
                sortKey="dateOfBirth"
                sort={sort}
                onToggle={toggle}
              />
              <SortableHead
                label="Telefon"
                sortKey="phone"
                sort={sort}
                onToggle={toggle}
              />
              <SortableHead
                label="E-Mail"
                sortKey="email"
                sort={sort}
                onToggle={toggle}
              />
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {patientRows.map((patient) => (
              <TableRow
                key={patient.id}
                className="cursor-pointer"
                onClick={() => openDetail(patient)}
              >
                <TableCell className="font-medium">
                  {patient.lastName}, {patient.firstName}
                </TableCell>
                <TableCell>{formatDate(patient.dateOfBirth)}</TableCell>
                <TableCell>{patient.phone ?? "—"}</TableCell>
                <TableCell>{patient.email ?? "—"}</TableCell>
                {/* stopPropagation so menu clicks don't trigger row navigation */}
                <TableCell
                  className="text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <RowActions
                    onEdit={() => openEdit(patient)}
                    onDelete={() => setDeleteTarget(patient)}
                  >
                    <DropdownMenuItem onSelect={() => openDetail(patient)}>
                      Details öffnen
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => setSessionPatient(patient)}
                    >
                      Neue Sitzung
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setTodoPatient(patient)}>
                      Neues Todo
                    </DropdownMenuItem>

                    <DropdownMenuItem disabled>Neue Rechnung</DropdownMenuItem>
                  </RowActions>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <PatientFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        patient={editing}
      />

      <SessionFormDialog
        open={sessionPatient !== null}
        onOpenChange={(open) => !open && setSessionPatient(null)}
        defaultPatientId={sessionPatient?.id}
      />

      <TodoFormDialog
        open={todoPatient !== null}
        onOpenChange={(open) => !open && setTodoPatient(null)}
        defaultPatientId={todoPatient?.id}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Patient löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `${deleteTarget.firstName} ${deleteTarget.lastName} wird aus der Liste entfernt.`
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

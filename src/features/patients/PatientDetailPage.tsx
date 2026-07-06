import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { ArrowLeftIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  SESSION_STATUS_LABELS,
  SESSION_TYPE_LABELS,
} from "@/features/sessions/session.schema";
import { SessionFormDialog } from "@/features/sessions/SessionFormDialog";
import { TodoFormDialog } from "@/features/todos/TodoFormDialog";
import { InvoiceFormDialog } from "@/features/invoices/InvoiceFormDialog";

import { useSessions } from "@/features/sessions/sessions.hooks";

import { usePatient } from "./patients.hooks";
import PageContainer from "@/components/page-container";
import { SessionListItem } from "../sessions/sessions.api";

type Props = { patientId: number };

export function PatientDetailPage({ patientId }: Props) {
  const navigate = useNavigate();
  const { data: patient, isLoading } = usePatient(patientId);
  const { data: sessions } = useSessions({ patientId });
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [todoDialogOpen, setTodoDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);

  function openDetail(session: SessionListItem) {
    navigate({
      to: "/sessions/$sessionId",
      params: { sessionId: String(session.id) },
    });
  }

  if (isLoading) {
    return (
      <PageContainer>
        <p className="text-muted-foreground">Lädt…</p>
      </PageContainer>
    );
  }
  if (!patient) {
    return (
      <PageContainer>
        <p className="text-destructive">Patient nicht gefunden.</p>
        <Link to="/patients" className="text-sm underline">
          Zurück zur Liste
        </Link>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Button asChild variant="ghost" className="mb-4 -ml-2">
        <Link to="/patients">
          <ArrowLeftIcon className="size-4" /> Zurück
        </Link>
      </Button>

      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">
            {patient.lastName}, {patient.firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {patient.dateOfBirth
              ? `geb. ${format(parseISO(patient.dateOfBirth), "dd.MM.yyyy")}`
              : "Kein Geburtsdatum"}
            {patient.phone ? ` · ${patient.phone}` : ""}
            {patient.email ? ` · ${patient.email}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 ">
          <Button onClick={() => setSessionDialogOpen(true)}>
            Neue Sitzung
          </Button>
          <Button onClick={() => setTodoDialogOpen(true)}>Neues Todo</Button>
          <Button onClick={() => setInvoiceDialogOpen(true)}>
            Neue Rechnung
          </Button>
        </div>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Sitzungen</h2>
      {sessions && sessions.length === 0 && (
        <p className="text-muted-foreground">Noch keine Sitzungen.</p>
      )}
      {sessions && sessions.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Datum</TableHead>
              <TableHead>Art</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Dauer</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((s) => (
              <TableRow
                key={s.id}
                onClick={() => openDetail(s)}
                className="cursor-pointer"
              >
                <TableCell>
                  {format(parseISO(s.sessionDate), "dd.MM.yyyy HH:mm")}
                </TableCell>
                <TableCell>{SESSION_TYPE_LABELS[s.sessionType]}</TableCell>
                <TableCell>{SESSION_STATUS_LABELS[s.status]}</TableCell>
                <TableCell>
                  {s.durationMinutes != null
                    ? `${s.durationMinutes} Min.`
                    : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <SessionFormDialog
        open={sessionDialogOpen}
        onOpenChange={setSessionDialogOpen}
        defaultPatientId={patientId}
      />

      <TodoFormDialog
        open={todoDialogOpen}
        onOpenChange={setTodoDialogOpen}
        defaultPatientId={patientId}
      />
      <InvoiceFormDialog
        open={invoiceDialogOpen}
        onOpenChange={setInvoiceDialogOpen}
        defaultPatientId={patientId}
      />
    </PageContainer>
  );
}

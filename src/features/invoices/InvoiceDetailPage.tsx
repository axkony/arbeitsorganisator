import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { ArrowLeftIcon } from "@phosphor-icons/react";

import PageContainer from "@/components/page-container";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { formatRappen } from "@/lib/money";
import { INVOICE_STATUS_LABELS } from "./invoice.schema";
import { useInvoice } from "./invoices.hooks";
import { InvoiceFormDialog } from "./InvoiceFormDialog";
import { InvoiceStatusSelect } from "./InvoiceStatusSelect";

function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return format(parseISO(value), "dd.MM.yyyy");
  } catch {
    return value;
  }
}

type Props = { invoiceId: number };

export function InvoiceDetailPage({ invoiceId }: Props) {
  const { data: invoice, isLoading } = useInvoice(invoiceId);
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) {
    return (
      <PageContainer>
        <p className="text-muted-foreground">Lädt…</p>
      </PageContainer>
    );
  }
  if (!invoice) {
    return (
      <PageContainer>
        <p className="text-destructive">Rechnung nicht gefunden.</p>
        <Link to="/finances" className="text-sm underline">
          Zurück
        </Link>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Button asChild variant="ghost" className="mb-4 -ml-2">
        <Link to="/finances">
          <ArrowLeftIcon className="size-4" /> Zurück
        </Link>
      </Button>

      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">
            Rechnung {invoice.invoiceNumber}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <Link
              to="/patients/$patientId"
              params={{ patientId: String(invoice.patientId) }}
              className="hover:underline"
            >
              {invoice.patientLastName}, {invoice.patientFirstName}
            </Link>
            {" · "}
            {INVOICE_STATUS_LABELS[invoice.status]}
            {" · "}Ausgestellt {formatDate(invoice.issuedAt)}
            {" · "}Fällig {formatDate(invoice.dueAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <InvoiceStatusSelect invoiceId={invoice.id} status={invoice.status} />
          {invoice.status === "draft" && (
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              Bearbeiten
            </Button>
          )}
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Beschreibung</TableHead>
            <TableHead className="text-right">Dauer</TableHead>
            <TableHead className="text-right">Satz/Std.</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoice.items.map((it) => (
            <TableRow key={it.id}>
              <TableCell className="font-medium">{it.description}</TableCell>
              <TableCell className="text-right tabular-nums">
                {it.durationMinutes ?? 0} Min.
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatRappen(it.unitPrice, invoice.currency)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatRappen(it.total, invoice.currency)}
              </TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell colSpan={3} className="text-right font-medium">
              Total
            </TableCell>
            <TableCell className="text-right font-semibold tabular-nums">
              {formatRappen(invoice.total, invoice.currency)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      {invoice.notes && (
        <p className="mt-6 text-sm text-muted-foreground whitespace-pre-wrap">
          {invoice.notes}
        </p>
      )}

      <InvoiceFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        invoiceId={invoice.id}
      />
    </PageContainer>
  );
}

import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

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
import { formatRappen } from "@/lib/money";
import type { InvoiceListItem } from "./invoices.api";
import {
  useInvoicesByStatuses,
  useUpdateInvoiceStatus,
} from "./invoices.hooks";

function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return format(parseISO(value), "dd.MM.yyyy");
  } catch {
    return value;
  }
}

export function OpenPaidInvoicesTab() {
  const navigate = useNavigate();
  const { data: open } = useInvoicesByStatuses(["sent", "overdue"]);
  const { data: paid } = useInvoicesByStatuses(["paid"]);
  const updateStatus = useUpdateInvoiceStatus();
  const [pending, setPending] = useState<{ id: number; label: string } | null>(
    null,
  );

  function confirmPaid() {
    if (!pending) return;
    updateStatus.mutate(
      { id: pending.id, status: "paid" },
      {
        onSuccess: () => toast.success("Als bezahlt markiert"),
        onError: (e) => toast.error(`Fehlgeschlagen: ${String(e)}`),
      },
    );
    setPending(null);
  }

  function column(
    title: string,
    sumLabel: string,
    list: InvoiceListItem[],
    markPaid: boolean,
  ) {
    const total = list.reduce((a, i) => a + i.total, 0);
    const row = (inv: InvoiceListItem, withKey: boolean) => (
      <TableRow
        key={withKey ? inv.id : undefined}
        className="cursor-pointer"
        onClick={() =>
          navigate({
            to: "/finances/$invoiceId",
            params: { invoiceId: String(inv.id) },
          })
        }
      >
        <TableCell>
          {inv.patientLastName}, {inv.patientFirstName}
        </TableCell>
        <TableCell className="font-medium">
          {inv.invoiceNumber ?? "—"}
          {inv.status === "overdue" && (
            <span className="ml-2 text-xs text-destructive">Überfällig</span>
          )}
        </TableCell>
        <TableCell>{formatDate(inv.issuedAt)}</TableCell>
        <TableCell className="text-right tabular-nums">
          {formatRappen(inv.total, inv.currency)}
        </TableCell>
      </TableRow>
    );
    return (
      <section className="space-y-2">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-sm font-semibold">{title}</h3>
          <span className="text-sm">
            <span className="text-muted-foreground">{sumLabel}: </span>
            <span className="font-semibold tabular-nums">
              {formatRappen(total)}
            </span>
          </span>
        </div>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine Einträge.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Nummer</TableHead>
                <TableHead>Ausgestellt</TableHead>
                <TableHead className="text-right">Betrag</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((inv) =>
                markPaid ? (
                  <ContextMenu key={inv.id}>
                    <ContextMenuTrigger asChild>
                      {row(inv, false)}
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem
                        onSelect={() =>
                          setPending({
                            id: inv.id,
                            label: inv.invoiceNumber ?? "—",
                          })
                        }
                      >
                        Als bezahlt markieren
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ) : (
                  row(inv, true)
                ),
              )}
            </TableBody>
          </Table>
        )}
      </section>
    );
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        {column("Gesendet, noch offen", "Offen", open ?? [], true)}
        {column("Bezahlt", "Erhalten", paid ?? [], false)}
      </div>
      <AlertDialog
        open={pending !== null}
        onOpenChange={(o) => !o && setPending(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Als bezahlt markieren?</AlertDialogTitle>
            <AlertDialogDescription>
              {pending
                ? `Rechnung „${pending.label}“ wird als bezahlt markiert.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPaid}>Bezahlt</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

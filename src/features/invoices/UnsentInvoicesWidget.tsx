import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { useUnsentInvoices, useUpdateInvoiceStatus } from "./invoices.hooks";

export function UnsentInvoicesWidget() {
  const { data: invoices, isLoading } = useUnsentInvoices();
  const updateStatus = useUpdateInvoiceStatus();
  const [pending, setPending] = useState<InvoiceListItem | null>(null);

  return (
    <div className="flex flex-col">
      {isLoading && (
        <p className="px-3 py-2 text-xs text-muted-foreground">Lädt…</p>
      )}
      {invoices && invoices.length === 0 && (
        <p className="px-3 py-2 text-xs text-muted-foreground">
          Keine offenen Entwürfe.
        </p>
      )}
      {invoices?.map((inv) => (
        <div
          key={inv.id}
          className="flex w-full items-center justify-between gap-2 px-3 py-2"
        >
          <div className="flex flex-col items-start gap-0.5">
            <span className="text-sm font-medium">
              {inv.invoiceNumber} · {formatRappen(inv.total, inv.currency)}
            </span>
            <span className="text-xs text-muted-foreground">
              {inv.patientLastName}, {inv.patientFirstName}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={() => setPending(inv)}>
            Senden
          </Button>
        </div>
      ))}

      <AlertDialog
        open={pending !== null}
        onOpenChange={(o) => !o && setPending(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rechnung senden?</AlertDialogTitle>
            <AlertDialogDescription>
              {pending
                ? `„${pending.invoiceNumber}“ wird als gesendet markiert.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pending) {
                  updateStatus.mutate(
                    { id: pending.id, status: "sent" },
                    {
                      onSuccess: () => toast.success("Als gesendet markiert"),
                      onError: (error) =>
                        toast.error(`Fehlgeschlagen: ${String(error)}`),
                    },
                  );
                }
                setPending(null);
              }}
            >
              Senden
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

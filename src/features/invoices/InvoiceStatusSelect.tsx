import { useState } from "react";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

import {
  INVOICE_STATUSES,
  INVOICE_STATUS_LABELS,
  type InvoiceStatus,
} from "./invoice.schema";
import { useUpdateInvoiceStatus } from "./invoices.hooks";

type Props = {
  invoiceId: number;
  status: InvoiceStatus;
};

export function InvoiceStatusSelect({ invoiceId, status }: Props) {
  const updateStatus = useUpdateInvoiceStatus();
  const [pending, setPending] = useState<InvoiceStatus | null>(null);

  return (
    <>
      <Select
        value={status}
        onValueChange={(value) => {
          const next = value as InvoiceStatus;
          if (next !== status) setPending(next);
        }}
      >
        <SelectTrigger
          className="h-8 w-[150px]"
          onClick={(e) => e.stopPropagation()}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {INVOICE_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {INVOICE_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <AlertDialog
        open={pending !== null}
        onOpenChange={(o) => !o && setPending(null)}
      >
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Status ändern?</AlertDialogTitle>
            <AlertDialogDescription>
              {pending
                ? `Status auf „${INVOICE_STATUS_LABELS[pending]}“ setzen.`
                : ""}
              {pending === "cancelled"
                ? " Die verknüpften Sitzungen werden freigegeben und können neu verrechnet werden."
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pending) {
                  updateStatus.mutate(
                    { id: invoiceId, status: pending },
                    {
                      onError: (error) =>
                        toast.error(`Status fehlgeschlagen: ${String(error)}`),
                    },
                  );
                }
                setPending(null);
              }}
            >
              Ändern
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

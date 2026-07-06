import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { PatientCombobox } from "@/features/patients/PatientCombobox";
import { SESSION_TYPE_LABELS } from "@/features/sessions/session.schema";
import { useSessionRates } from "@/features/settings/rates.hooks";
import { formatRappen } from "@/lib/money";

import {
  INVOICE_STATUSES,
  INVOICE_STATUS_LABELS,
  invoiceFormSchema,
  type InvoiceFormValues,
} from "./invoice.schema";
import type { InvoiceDetail } from "./invoices.api";
import type { InvoicePricing } from "./invoices.api";
import {
  useBillableSessions,
  useCreateInvoice,
  useInvoice,
  useInvoiceTariffDrift,
  useNextInvoiceNumber,
  useUpdateInvoice,
} from "./invoices.hooks";

function lineRappen(durationMinutes: number | null, rateRappen: number) {
  return Math.round(((durationMinutes ?? 0) / 60) * rateRappen);
}

function toFormValues(
  invoice?: InvoiceDetail | null,
  defaultPatientId?: number,
  defaultSessionId?: number,
): InvoiceFormValues {
  return {
    patientId: invoice
      ? String(invoice.patientId)
      : defaultPatientId != null
        ? String(defaultPatientId)
        : "",
    invoiceNumber: invoice?.invoiceNumber ?? "",
    status: invoice?.status ?? "draft",
    issuedAt: invoice?.issuedAt ?? "",
    dueAt: invoice?.dueAt ?? "",
    notes: invoice?.notes ?? "",
    items: invoice
      ? invoice.items
          .filter((it) => it.sessionId != null)
          .map((it) => ({ sessionId: String(it.sessionId) }))
      : defaultSessionId != null
        ? [{ sessionId: String(defaultSessionId) }]
        : [],
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId?: number | null;
  defaultPatientId?: number;
  defaultSessionId?: number;
};

export function InvoiceFormDialog({
  open,
  onOpenChange,
  invoiceId,
  defaultPatientId,
  defaultSessionId,
}: Props) {
  const isEditing = invoiceId != null;
  const { data: invoice } = useInvoice(isEditing ? invoiceId : undefined);

  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const isPending = createInvoice.isPending || updateInvoice.isPending;

  const isNumbered = Boolean(invoice?.invoiceNumber);
  const { data: nextNumber } = useNextInvoiceNumber(open && !isNumbered);

  const { data: rates } = useSessionRates();
  const rateMap = new Map(
    (rates ?? []).map((r) => [r.sessionType, r.rateRappen]),
  );
  const { data: drift } = useInvoiceTariffDrift(
    isEditing ? invoiceId : undefined,
  );
  const hasDrift = (drift?.length ?? 0) > 0;

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: toFormValues(null, defaultPatientId),
  });

  const patientId = useWatch({ control, name: "patientId" });
  const items = useWatch({ control, name: "items" }) ?? [];
  const selectedIds = new Set(items.map((i) => Number(i.sessionId)));

  const { data: billable, isLoading: billableLoading } = useBillableSessions(
    patientId ? Number(patientId) : undefined,
    isEditing ? invoiceId : undefined,
  );

  const grandTotal = (billable ?? [])
    .filter((s) => selectedIds.has(s.id))
    .reduce(
      (sum, s) =>
        sum + lineRappen(s.durationMinutes, rateMap.get(s.sessionType) ?? 0),
      0,
    );

  const [pendingPatient, setPendingPatient] = useState<string | null>(null);
  const [pendingSave, setPendingSave] = useState<InvoiceFormValues | null>(
    null,
  );

  useEffect(() => {
    if (!open) return;
    if (isEditing) {
      if (invoice) reset(toFormValues(invoice));
    } else {
      reset(toFormValues(null, defaultPatientId, defaultSessionId));
    }
  }, [open, isEditing, invoice, defaultPatientId, defaultSessionId, reset]);

  function toggleSession(id: number, checked: boolean) {
    const next = checked
      ? [...items, { sessionId: String(id) }]
      : items.filter((i) => Number(i.sessionId) !== id);
    setValue("items", next, { shouldValidate: true, shouldDirty: true });
  }

  function handlePatientChange(next: string, current: string) {
    if (items.length > 0 && next !== current) {
      setPendingPatient(next); // confirm before dropping selected sessions
    } else {
      setValue("patientId", next, { shouldValidate: true });
    }
  }

  function save(
    values: InvoiceFormValues,
    pricing: InvoicePricing = "current",
  ) {
    const handlers = {
      onSuccess: () => {
        toast.success(
          isEditing ? "Rechnung aktualisiert" : "Rechnung erstellt",
        );
        onOpenChange(false);
      },
      onError: (error: unknown) =>
        toast.error(`Speichern fehlgeschlagen: ${String(error)}`),
    };
    if (isEditing) {
      updateInvoice.mutate({ id: invoiceId, values, pricing }, handlers);
    } else {
      createInvoice.mutate(values, handlers);
    }
  }

  function onValid(values: InvoiceFormValues) {
    if (isEditing)
      setPendingSave(values); // confirm updates
    else save(values);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Rechnung bearbeiten" : "Neue Rechnung"}
            </DialogTitle>
            <DialogDescription>
              Abgeschlossene Sitzungen des Patienten abrechnen. Betrag = Dauer ×
              Satz pro Sitzungsart.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onValid)}>
            <FieldGroup>
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  control={control}
                  name="patientId"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="patientId">Patient</FieldLabel>
                      <PatientCombobox
                        id="patientId"
                        value={field.value}
                        onChange={(next) =>
                          handlePatientChange(next, field.value)
                        }
                        aria-invalid={fieldState.invalid}
                      />
                      <FieldError
                        errors={
                          fieldState.error ? [fieldState.error] : undefined
                        }
                      />
                    </Field>
                  )}
                />
                <Controller
                  control={control}
                  name="invoiceNumber"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="invoiceNumber">
                        Rechnungsnr.
                      </FieldLabel>
                      <Input
                        id="invoiceNumber"
                        aria-invalid={fieldState.invalid}
                        {...field}
                        value={field.value ?? ""}
                        disabled={!isNumbered}
                        placeholder={
                          isNumbered
                            ? undefined
                            : nextNumber
                              ? `Bei Versand: ${nextNumber}`
                              : "Wird bei Versand vergeben"
                        }
                      />
                      {!isNumbered && (
                        <p className="text-xs text-muted-foreground">
                          Nummer wird beim Versand automatisch vergeben.
                        </p>
                      )}
                      <FieldError
                        errors={
                          fieldState.error ? [fieldState.error] : undefined
                        }
                      />
                    </Field>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Controller
                  control={control}
                  name="issuedAt"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="issuedAt">Ausgestellt</FieldLabel>
                      <DateTimePicker
                        id="issuedAt"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        placeholder="Datum"
                      />
                    </Field>
                  )}
                />
                <Controller
                  control={control}
                  name="dueAt"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="dueAt">Fällig</FieldLabel>
                      <DateTimePicker
                        id="dueAt"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        placeholder="Datum"
                      />
                    </Field>
                  )}
                />
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="status">Status</FieldLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger id="status">
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
                    </Field>
                  )}
                />
              </div>

              {/* Session checklist */}
              <div className="space-y-2">
                <FieldLabel>Sitzungen</FieldLabel>

                {!patientId && (
                  <p className="text-sm text-muted-foreground">
                    Bitte zuerst einen Patienten wählen.
                  </p>
                )}
                {patientId && billableLoading && (
                  <p className="text-sm text-muted-foreground">Lädt…</p>
                )}
                {patientId &&
                  !billableLoading &&
                  billable &&
                  billable.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Keine abrechenbaren Sitzungen (abgeschlossen &amp; noch
                      nicht verrechnet).
                    </p>
                  )}

                {patientId && billable && billable.length > 0 && (
                  <div className="divide-y border-2">
                    <div className="grid grid-cols-[2rem_1fr_5rem_6rem_6rem] gap-2 px-3 py-1.5 text-xs text-muted-foreground">
                      <span />
                      <span>Sitzung</span>
                      <span className="text-right">Dauer</span>
                      <span className="text-right">Satz/Std.</span>
                      <span className="text-right">Total</span>
                    </div>
                    {billable.map((s) => {
                      const rate = rateMap.get(s.sessionType) ?? 0;
                      const noDuration = !s.durationMinutes;
                      const total = lineRappen(s.durationMinutes, rate);
                      return (
                        <label
                          key={s.id}
                          className={`grid grid-cols-[2rem_1fr_5rem_6rem_6rem] items-center gap-2 px-3 py-2 ${
                            noDuration ? "opacity-50" : "cursor-pointer"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="size-4 accent-primary"
                            checked={selectedIds.has(s.id)}
                            disabled={noDuration}
                            onChange={(e) =>
                              toggleSession(s.id, e.target.checked)
                            }
                          />
                          <span className="text-sm">
                            {format(parseISO(s.sessionDate), "dd.MM.yyyy")} ·{" "}
                            {SESSION_TYPE_LABELS[s.sessionType]}
                            {noDuration && (
                              <span className="ml-1 text-xs text-destructive">
                                keine Dauer
                              </span>
                            )}
                          </span>
                          <span className="text-right text-sm tabular-nums">
                            {s.durationMinutes ?? 0} Min.
                          </span>
                          <span className="text-right text-sm tabular-nums">
                            {formatRappen(rate)}
                          </span>
                          <span className="text-right text-sm tabular-nums">
                            {formatRappen(total)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {errors.items && (
                  <p className="text-sm text-destructive">
                    {errors.items.message ??
                      "Mindestens eine Sitzung auswählen."}
                  </p>
                )}

                <div className="flex justify-end gap-6 border-t pt-2 text-sm font-medium">
                  <span>Total</span>
                  <span className="tabular-nums">
                    {formatRappen(grandTotal)}
                  </span>
                </div>
              </div>

              <Controller
                control={control}
                name="notes"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="notes">Notizen</FieldLabel>
                    <Textarea id="notes" rows={2} {...field} />
                  </Field>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Abbrechen
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Speichern…" : "Speichern"}
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm: switching patient clears the selected sessions */}
      <AlertDialog
        open={pendingPatient !== null}
        onOpenChange={(o) => !o && setPendingPatient(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Patient wechseln?</AlertDialogTitle>
            <AlertDialogDescription>
              Die ausgewählten Sitzungen gehören zum bisherigen Patienten und
              werden entfernt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingPatient !== null) {
                  setValue("patientId", pendingPatient, {
                    shouldValidate: true,
                  });
                  setValue("items", [], { shouldValidate: true });
                }
                setPendingPatient(null);
              }}
            >
              Wechseln
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm: saving changes to an existing invoice */}
      <AlertDialog
        open={pendingSave !== null}
        onOpenChange={(o) => !o && setPendingSave(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rechnung aktualisieren?</AlertDialogTitle>
            <AlertDialogDescription>
              {hasDrift
                ? "Die Tarife haben sich geändert, seit idiese Rechnung erstellt wurde. Welche Sätze sollen für die Positionen gelten?"
                : "Die Positionen werden gespeichert."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {hasDrift && (
            <div className="border text-sm">
              <div className="grid grid-cols-3 gap-2 border-b bg-muted/50 px-3 py-1.5 text-xs font-medium ">
                <span>Sitzungsart</span>
                <span className="text-right">Erstellt mit</span>
                <span className="text-right">Aktuell</span>
              </div>
              {drift!.map((d) => (
                <div
                  key={d.sessionType}
                  className="grid grid-cols-3 gap-2 px-3 py-1.5 tabular-nums"
                >
                  <span>{d.label}</span>
                  <span className="text-right">
                    {formatRappen(d.oldRappen)} / Std.
                  </span>
                  <span className="text-right">
                    {formatRappen(d.newRappen)} / Std.
                  </span>
                </div>
              ))}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            {hasDrift ? (
              <>
                <AlertDialogAction
                  onClick={() => {
                    if (pendingSave) save(pendingSave, "keepOriginal");
                    setPendingSave(null);
                  }}
                >
                  Ursprüngliche Tarife behalten
                </AlertDialogAction>
                <AlertDialogAction
                  onClick={() => {
                    if (pendingSave) save(pendingSave, "current");
                    setPendingSave(null);
                  }}
                >
                  Auf aktuelle Tarife aktualisieren
                </AlertDialogAction>
              </>
            ) : (
              <AlertDialogAction
                onClick={() => {
                  if (pendingSave) save(pendingSave, "current");
                  setPendingSave(null);
                }}
              >
                Speichern
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

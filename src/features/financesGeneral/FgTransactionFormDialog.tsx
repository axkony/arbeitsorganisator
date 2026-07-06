import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

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
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { francsToRappen, rappenToFrancs } from "@/lib/money";
import { cn } from "@/lib/utils";

import {
  fgRecurrences,
  fgTransactionFormSchema,
  type FgDirection,
  type FgTransactionFormValues,
  type FgTransactionInput,
} from "./fg.schema";
import { FG_DIRECTION_LABELS, FG_RECURRENCE_LABELS } from "./fg.labels";
import type { FgTransaction } from "./fg.api";
import {
  useCreateFgTransaction,
  useFgPersons,
  useFgTags,
  useUpdateFgTransaction,
} from "./fg.hooks";

const NO_PERSON = "none"; // Radix Select forbids an empty-string item value.

function toFormValues(txn?: FgTransaction | null): FgTransactionFormValues {
  return {
    description: txn?.description ?? "",
    amountFrancs: txn ? rappenToFrancs(txn.amountRappen) : "",
    recurrence: txn?.recurrence ?? "once",
    startDate: txn?.startDate ?? "",
    endDate: txn?.endDate ?? "",
    personId: txn?.personId != null ? String(txn.personId) : "",
    notes: txn?.notes ?? "",
    tagIds: txn?.tags.map((t) => t.id) ?? [],
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  direction: FgDirection;
  transaction?: FgTransaction | null;
};

export function FgTransactionFormDialog({
  open,
  onOpenChange,
  direction,
  transaction,
}: Props) {
  const isEditing = transaction != null;
  const { data: persons } = useFgPersons();
  const { data: tags } = useFgTags();

  const createTxn = useCreateFgTransaction();
  const updateTxn = useUpdateFgTransaction();
  const isPending = createTxn.isPending || updateTxn.isPending;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FgTransactionFormValues>({
    resolver: zodResolver(fgTransactionFormSchema),
    defaultValues: toFormValues(null),
  });

  const recurrence = useWatch({ control, name: "recurrence" });
  const isRecurring = recurrence !== "once";

  useEffect(() => {
    if (open) reset(toFormValues(transaction));
  }, [open, transaction, reset]);

  function onValid(v: FgTransactionFormValues) {
    const input: FgTransactionInput = {
      direction,
      description: v.description,
      amountRappen: francsToRappen(v.amountFrancs),
      recurrence: v.recurrence,
      startDate: v.startDate,
      endDate: v.recurrence === "once" ? null : v.endDate || null,
      personId: v.personId ? Number(v.personId) : null,
      notes: v.notes || null,
      tagIds: v.tagIds,
    };

    const handlers = {
      onSuccess: () => {
        toast.success(isEditing ? "Eintrag aktualisiert" : "Eintrag erstellt");
        onOpenChange(false);
      },
      onError: (error: unknown) =>
        toast.error(`Speichern fehlgeschlagen: ${String(error)}`),
    };

    if (isEditing) {
      updateTxn.mutate({ id: transaction.id, values: input }, handlers);
    } else {
      createTxn.mutate(input, handlers);
    }
  }

  const noun = FG_DIRECTION_LABELS[direction];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `${noun} bearbeiten` : `Neue ${noun}`}
          </DialogTitle>
          <DialogDescription>
            {isRecurring
              ? "Wiederkehrende Beträge werden einmal erfasst und über den Zeitraum automatisch hochgerechnet."
              : "Ein einmaliger Betrag an einem bestimmten Datum."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onValid)}>
          <FieldGroup>
            <Controller
              control={control}
              name="description"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="fg-description">Beschreibung</FieldLabel>
                  <Input
                    id="fg-description"
                    aria-invalid={fieldState.invalid}
                    placeholder={
                      direction === "income" ? "z. B. Miete Untermiete" : "z. B. Spotify"
                    }
                    {...field}
                  />
                  <FieldError
                    errors={fieldState.error ? [fieldState.error] : undefined}
                  />
                </Field>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <Controller
                control={control}
                name="amountFrancs"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="fg-amount">Betrag</FieldLabel>
                    <InputGroup>
                      <InputGroupAddon>CHF</InputGroupAddon>
                      <InputGroupInput
                        id="fg-amount"
                        inputMode="decimal"
                        aria-invalid={fieldState.invalid || undefined}
                        className="text-right tabular-nums"
                        placeholder="0,00"
                        {...field}
                      />
                    </InputGroup>
                    <FieldError
                      errors={fieldState.error ? [fieldState.error] : undefined}
                    />
                  </Field>
                )}
              />

              <Controller
                control={control}
                name="recurrence"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="fg-recurrence">Wiederholung</FieldLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger id="fg-recurrence">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fgRecurrences.map((r) => (
                          <SelectItem key={r} value={r}>
                            {FG_RECURRENCE_LABELS[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Controller
                control={control}
                name="startDate"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="fg-start">
                      {isRecurring ? "Ab" : "Datum"}
                    </FieldLabel>
                    <DateTimePicker
                      id="fg-start"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      placeholder="Datum"
                    />
                    <FieldError
                      errors={fieldState.error ? [fieldState.error] : undefined}
                    />
                  </Field>
                )}
              />

              {isRecurring && (
                <Controller
                  control={control}
                  name="endDate"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="fg-end">Bis (optional)</FieldLabel>
                      <DateTimePicker
                        id="fg-end"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        placeholder="Läuft weiter"
                      />
                    </Field>
                  )}
                />
              )}
            </div>

            <Controller
              control={control}
              name="personId"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="fg-person">Person (optional)</FieldLabel>
                  <Select
                    value={field.value ? field.value : NO_PERSON}
                    onValueChange={(v) =>
                      field.onChange(v === NO_PERSON ? "" : v)
                    }
                  >
                    <SelectTrigger id="fg-person">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_PERSON}>Keine</SelectItem>
                      {(persons ?? []).map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />

            {/* Tag chips — toggle membership. Managed in the Kategorien tab. */}
            <Controller
              control={control}
              name="tagIds"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Kategorien</FieldLabel>
                  {tags && tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => {
                        const active = field.value.includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            aria-pressed={active}
                            onClick={() =>
                              field.onChange(
                                active
                                  ? field.value.filter((id) => id !== tag.id)
                                  : [...field.value, tag.id],
                              )
                            }
                            className={cn(
                              "rounded-full border px-3 py-1 text-sm transition-colors",
                              active
                                ? "border-primary bg-primary/10 font-medium"
                                : "hover:bg-muted",
                            )}
                          >
                            <span
                              className="mr-1.5 inline-block size-2 rounded-full align-middle"
                              style={{
                                backgroundColor: tag.color ?? "var(--muted-foreground)",
                              }}
                            />
                            {tag.name}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Noch keine Kategorien — im Tab „Kategorien“ anlegen.
                    </p>
                  )}
                </Field>
              )}
            />

            <Controller
              control={control}
              name="notes"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="fg-notes">Notizen</FieldLabel>
                  <Textarea id="fg-notes" rows={2} {...field} />
                </Field>
              )}
            />

            {errors.root && (
              <p className="text-sm text-destructive">{errors.root.message}</p>
            )}

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
  );
}

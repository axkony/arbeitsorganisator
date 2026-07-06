import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { PatientCombobox } from "@/features/patients/PatientCombobox";

import {
  SESSION_STATUSES,
  SESSION_STATUS_LABELS,
  SESSION_TYPES,
  SESSION_TYPE_LABELS,
  sessionFormSchema,
  type SessionFormValues,
} from "./session.schema";
import type { SessionListItem } from "./sessions.api";
import { useCreateSession, useUpdateSession } from "./sessions.hooks";
import { DateTimePicker } from "@/components/ui/date-time-picker";

function toFormValues(
  session?: SessionListItem | null,
  defaultPatientId?: number,
): SessionFormValues {
  return {
    patientId: session
      ? String(session.patientId)
      : defaultPatientId != null
        ? String(defaultPatientId)
        : "",
    sessionDate: session?.sessionDate ?? "",
    sessionType: session?.sessionType ?? "praxis",
    status: session?.status ?? "open",
    durationMinutes:
      session?.durationMinutes != null ? String(session.durationMinutes) : "",
    reason: session?.reason ?? "",
    summary: session?.summary ?? "",
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session?: SessionListItem | null;
  defaultPatientId?: number;
};

export function SessionFormDialog({
  open,
  onOpenChange,
  session,
  defaultPatientId,
}: Props) {
  const createSession = useCreateSession();
  const updateSession = useUpdateSession();
  const isEditing = Boolean(session);
  const isPending = createSession.isPending || updateSession.isPending;

  const { control, handleSubmit, reset } = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: toFormValues(session, defaultPatientId),
  });

  useEffect(() => {
    if (open) reset(toFormValues(session));
  }, [open, session, reset]);

  function onSubmit(values: SessionFormValues) {
    const handlers = {
      onSuccess: () => {
        toast.success(isEditing ? "Sitzung aktualisiert" : "Sitzung erstellt");
        onOpenChange(false);
      },
      onError: (error: unknown) =>
        toast.error(`Speichern fehlgeschlagen: ${String(error)}`),
    };
    if (session) {
      updateSession.mutate({ id: session.id, values }, handlers);
    } else {
      createSession.mutate(values, handlers);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Sitzung bearbeiten" : "Neue Sitzung"}
          </DialogTitle>
          <DialogDescription>
            Konsultation eines Patienten. Pflichtfelder: Patient und Datum.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup>
            <Controller
              control={control}
              name="patientId"
              render={({ fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <Controller
                    control={control}
                    name="patientId"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="patientId">Patient</FieldLabel>
                        <PatientCombobox
                          id="patientId"
                          value={field.value}
                          onChange={field.onChange}
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

                  <FieldError
                    errors={fieldState.error ? [fieldState.error] : undefined}
                  />
                </Field>
              )}
            />

            <Controller
              control={control}
              name="sessionDate"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="sessionDate">
                    Datum &amp; Zeit
                  </FieldLabel>
                  <DateTimePicker
                    id="sessionDate"
                    withTime
                    value={field.value}
                    onChange={field.onChange}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError
                    errors={fieldState.error ? [fieldState.error] : undefined}
                  />
                </Field>
              )}
            />

            <Controller
              control={control}
              name="durationMinutes"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="durationMinutes">
                    Dauer (Min.)
                  </FieldLabel>
                  <Input
                    id="durationMinutes"
                    type="number"
                    min={0}
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
                name="sessionType"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="sessionType">Art</FieldLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger id="sessionType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SESSION_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {SESSION_TYPE_LABELS[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="status">Status</FieldLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SESSION_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {SESSION_STATUS_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
            </div>

            <Controller
              control={control}
              name="reason"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="reason">Konsultationsgrund</FieldLabel>
                  <Input id="reason" {...field} />
                </Field>
              )}
            />

            <Controller
              control={control}
              name="summary"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="summary">Zusammenfassung</FieldLabel>
                  <Textarea id="summary" rows={3} {...field} />
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
  );
}

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

import {
  GENDERS,
  patientFormSchema,
  type PatientFormValues,
} from "./patient.schema";
import type { Patient } from "./patients.api";
import { useCreatePatient, useUpdatePatient } from "./patients.hooks";
import { DateTimePicker } from "@/components/ui/date-time-picker";

const GENDER_LABELS: Record<(typeof GENDERS)[number], string> = {
  male: "Männlich",
  female: "Weiblich",
  other: "Divers",
  not_specified: "Keine Angabe",
};

function toFormValues(patient?: Patient | null): PatientFormValues {
  return {
    firstName: patient?.firstName ?? "",
    lastName: patient?.lastName ?? "",
    dateOfBirth: patient?.dateOfBirth ?? "",
    gender: patient?.gender ?? undefined,
    phone: patient?.phone ?? "",
    email: patient?.email ?? "",
    address: patient?.address ?? "",
    insuranceInfo: patient?.insuranceInfo ?? "",
    notes: patient?.notes ?? "",
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: Patient | null;
};

export function PatientFormDialog({ open, onOpenChange, patient }: Props) {
  const createPatient = useCreatePatient();
  const updatePatient = useUpdatePatient();
  const isEditing = Boolean(patient);
  const isPending = createPatient.isPending || updatePatient.isPending;

  console.log(isPending);

  const { control, handleSubmit, reset } = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: toFormValues(patient),
  });

  // Refill the form each time the dialog opens (new or different patient).
  useEffect(() => {
    if (open) reset(toFormValues(patient));
  }, [open, patient, reset]);

  function onSubmit(values: PatientFormValues) {
    const handlers = {
      onSuccess: () => {
        toast.success(isEditing ? "Patient aktualisiert" : "Patient erstellt");
        onOpenChange(false);
      },
      onError: (error: unknown) =>
        toast.error(`Speichern fehlgeschlagen: ${String(error)}`),
    };

    if (patient) {
      updatePatient.mutate({ id: patient.id, values }, handlers);
    } else {
      createPatient.mutate(values, handlers);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Patient bearbeiten" : "Neuer Patient"}
          </DialogTitle>
          <DialogDescription>
            Stammdaten des Patienten. Pflichtfelder: Vor- und Nachname.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup>
            <div className="grid grid-cols-2 gap-4">
              <Controller
                control={control}
                name="firstName"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="firstName">Vorname</FieldLabel>
                    <Input
                      id="firstName"
                      aria-invalid={fieldState.invalid}
                      {...field}
                    />
                    <FieldError
                      errors={fieldState.error ? [fieldState.error] : undefined}
                    />
                  </Field>
                )}
              />
              <Controller
                control={control}
                name="lastName"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="lastName">Nachname</FieldLabel>
                    <Input
                      id="lastName"
                      aria-invalid={fieldState.invalid}
                      {...field}
                    />
                    <FieldError
                      errors={fieldState.error ? [fieldState.error] : undefined}
                    />
                  </Field>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Controller
                control={control}
                name="dateOfBirth"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="dateOfBirth">Geburtsdatum</FieldLabel>
                    <DateTimePicker
                      id="dateOfBirth"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      aria-invalid={fieldState.invalid}
                      placeholder="Geburtsdatum wählen"
                    />

                    <FieldError
                      errors={fieldState.error ? [fieldState.error] : undefined}
                    />
                  </Field>
                )}
              />
              <Controller
                control={control}
                name="gender"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="gender">Geschlecht</FieldLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                    >
                      <SelectTrigger
                        id="gender"
                        aria-invalid={fieldState.invalid}
                      >
                        <SelectValue placeholder="Auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {GENDERS.map((g) => (
                          <SelectItem key={g} value={g}>
                            {GENDER_LABELS[g]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError
                      errors={fieldState.error ? [fieldState.error] : undefined}
                    />
                  </Field>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Controller
                control={control}
                name="phone"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="phone">Telefon</FieldLabel>
                    <Input
                      id="phone"
                      aria-invalid={fieldState.invalid}
                      {...field}
                    />
                    <FieldError
                      errors={fieldState.error ? [fieldState.error] : undefined}
                    />
                  </Field>
                )}
              />
              <Controller
                control={control}
                name="email"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="email">E-Mail</FieldLabel>
                    <Input
                      id="email"
                      type="email"
                      aria-invalid={fieldState.invalid}
                      {...field}
                    />
                    <FieldError
                      errors={fieldState.error ? [fieldState.error] : undefined}
                    />
                  </Field>
                )}
              />
            </div>

            <Controller
              control={control}
              name="address"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="address">Adresse</FieldLabel>
                  <Textarea id="address" rows={2} {...field} />
                  <FieldError
                    errors={fieldState.error ? [fieldState.error] : undefined}
                  />
                </Field>
              )}
            />

            <Controller
              control={control}
              name="insuranceInfo"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="insuranceInfo">Versicherung</FieldLabel>
                  <Input id="insuranceInfo" {...field} />
                  <FieldError
                    errors={fieldState.error ? [fieldState.error] : undefined}
                  />
                </Field>
              )}
            />

            <Controller
              control={control}
              name="notes"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="notes">Notizen</FieldLabel>
                  <Textarea id="notes" rows={3} {...field} />
                  <FieldError
                    errors={fieldState.error ? [fieldState.error] : undefined}
                  />
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

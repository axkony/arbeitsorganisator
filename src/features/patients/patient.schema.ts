import { z } from "zod";

export const GENDERS = ["male", "female", "other", "not_specified"] as const;

export const patientFormSchema = z.object({
  firstName: z.string().min(1, "Vorname erforderlich"),
  lastName: z.string().min(1, "Nachname erforderlich"),
  dateOfBirth: z.string().optional(),
  gender: z.enum(GENDERS).optional(),
  phone: z.string().e164("+41000000000").optional().or(z.literal("")),
  email: z
    .string()
    .email("Gültige e-Mail eingeben")
    .optional()
    .or(z.literal("")),
  address: z.string().optional(),
  insuranceInfo: z.string().optional(),
  notes: z.string().optional(),
});

export type PatientFormValues = z.infer<typeof patientFormSchema>;

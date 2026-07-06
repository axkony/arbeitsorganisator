import { z } from "zod";

export const SESSION_TYPES = [
  "praxis",
  "praxis_2",
  "telephone",
  "home_visit",
  "emergency",
] as const;

export const SESSION_STATUSES = ["open", "completed", "cancelled"] as const;

export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const SESSION_TYPE_LABELS: Record<
  (typeof SESSION_TYPES)[number],
  string
> = {
  praxis: "Praxis",
  praxis_2: "Praxis_2",
  telephone: "Telefon",
  emergency: "Notfall",
  home_visit: "Hausbesuch",
};

export const SESSION_STATUS_LABELS: Record<
  (typeof SESSION_STATUSES)[number],
  string
> = {
  open: "Offen",
  completed: "Abgeschlossen",
  cancelled: "Storniert",
};

export const sessionFormSchema = z.object({
  patientId: z.string().min(1, "Patient ist erforderlich"),
  sessionDate: z.string().min(1, "Datum ist erforderlich"),
  sessionType: z.enum(SESSION_TYPES),
  status: z.enum(SESSION_STATUSES),
  durationMinutes: z.string().min(1, "Dauer ist erforderlich"),
  reason: z.string().optional(),
  summary: z.string().optional(),
});

export type SessionFormValues = z.infer<typeof sessionFormSchema>;

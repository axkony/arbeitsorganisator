import { z } from "zod";

export const TODO_STATUSES = [
  "open",
  "in_progress",
  "done",
  "cancelled",
] as const;
export type TodoStatus = (typeof TODO_STATUSES)[number];

export const TODO_STATUS_LABELS: Record<TodoStatus, string> = {
  open: "Offen",
  in_progress: "In Arbeit",
  done: "Erledigt",
  cancelled: "Abgebrochen",
};

// Stored as INTEGER 1|2|3; the form uses strings because <Select> values are strings.
export const TODO_PRIORITIES = ["1", "2", "3"] as const;
export type TodoPriority = (typeof TODO_PRIORITIES)[number];

export const TODO_PRIORITY_LABELS: Record<TodoPriority, string> = {
  "1": "Niedrig",
  "2": "Mittel",
  "3": "Hoch",
};

export const todoFormSchema = z.object({
  title: z.string().min(1, "Titel ist erforderlich"),
  status: z.enum(TODO_STATUSES),
  priority: z.enum(TODO_PRIORITIES),
  patientId: z.string().optional(), // "" = kein Patient
  parentId: z.string().optional(), // "" = top-level
  dueAt: z.string().optional(),
});

export type TodoFormValues = z.infer<typeof todoFormSchema>;

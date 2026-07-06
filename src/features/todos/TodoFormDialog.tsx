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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { PatientCombobox } from "@/features/patients/PatientCombobox";

import {
  TODO_PRIORITIES,
  TODO_PRIORITY_LABELS,
  TODO_STATUSES,
  TODO_STATUS_LABELS,
  todoFormSchema,
  type TodoFormValues,
} from "./todo.schema";
import type { TodoListItem } from "./todos.api";
import { useCreateTodo, useUpdateTodo } from "./todos.hooks";

function toFormValues(
  todo?: TodoListItem | null,
  defaultPatientId?: number,
  defaultParentId?: number,
): TodoFormValues {
  return {
    title: todo?.title ?? "",
    status: todo?.status ?? "open",
    priority: todo
      ? (String(todo.priority) as TodoFormValues["priority"])
      : "2",
    patientId: todo?.patientId
      ? String(todo.patientId)
      : defaultPatientId != null
        ? String(defaultPatientId)
        : "",
    parentId: todo?.parentId
      ? String(todo.parentId)
      : defaultParentId != null
        ? String(defaultParentId)
        : "",
    dueAt: todo?.dueAt ?? "",
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  todo?: TodoListItem | null;
  defaultPatientId?: number;
  defaultParentId?: number;
};

export function TodoFormDialog({
  open,
  onOpenChange,
  todo,
  defaultPatientId,
  defaultParentId,
}: Props) {
  const createTodo = useCreateTodo();
  const updateTodo = useUpdateTodo();
  const isEditing = Boolean(todo);
  const isPending = createTodo.isPending || updateTodo.isPending;

  const { control, handleSubmit, reset } = useForm<TodoFormValues>({
    resolver: zodResolver(todoFormSchema),
    defaultValues: toFormValues(todo, defaultPatientId, defaultParentId),
  });

  // Refill each time the dialog opens (and carry defaultPatientId on create).
  useEffect(() => {
    if (open) reset(toFormValues(todo, defaultPatientId, defaultParentId));
  }, [open, todo, defaultPatientId, defaultParentId, reset]);

  function onSubmit(values: TodoFormValues) {
    const handlers = {
      onSuccess: () => {
        toast.success(isEditing ? "Todo aktualisiert" : "Todo erstellt");
        onOpenChange(false);
      },
      onError: (error: unknown) =>
        toast.error(`Speichern fehlgeschlagen: ${String(error)}`),
    };
    if (todo) {
      updateTodo.mutate({ id: todo.id, values }, handlers);
    } else {
      createTodo.mutate(values, handlers);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Todo bearbeiten" : "Neues Todo"}
          </DialogTitle>
          <DialogDescription>
            Aufgabe, optional einem Patienten und Fälligkeitsdatum zugeordnet.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup>
            <Controller
              control={control}
              name="title"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="title">Titel</FieldLabel>
                  <Input
                    id="title"
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
              name="patientId"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="patientId">
                    Patient (optional)
                  </FieldLabel>
                  <PatientCombobox
                    id="patientId"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    aria-invalid={fieldState.invalid}
                    placeholder="Kein Patient"
                  />
                  <FieldError
                    errors={fieldState.error ? [fieldState.error] : undefined}
                  />
                </Field>
              )}
            />

            <Controller
              control={control}
              name="dueAt"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="dueAt">Fällig (optional)</FieldLabel>
                  <DateTimePicker
                    id="dueAt"
                    withTime
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    aria-invalid={fieldState.invalid}
                    placeholder="Fälligkeitsdatum wählen"
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
                name="priority"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="priority">Priorität</FieldLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger id="priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TODO_PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {TODO_PRIORITY_LABELS[p]}
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
                        {TODO_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {TODO_STATUS_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
            </div>

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

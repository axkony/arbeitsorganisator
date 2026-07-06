import { format, parseISO } from "date-fns";

import { TODO_PRIORITY_LABELS, type TodoPriority } from "./todo.schema";
import { useOpenTodos, useUpdateTodoStatus } from "./todos.hooks";

export function OpenTodosWidget() {
  const { data: todos, isLoading } = useOpenTodos();
  const updateStatus = useUpdateTodoStatus();

  return (
    <div className="flex flex-col">
      {isLoading && (
        <p className="px-3 py-2 text-xs text-muted-foreground">Lädt…</p>
      )}
      {todos && todos.length === 0 && (
        <p className="px-3 py-2 text-xs text-muted-foreground">
          Keine offenen Todos.
        </p>
      )}
      {todos?.map((t) => (
        <div key={t.id} className="flex w-full items-start gap-2 px-3 py-2">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-primary"
            checked={false}
            onChange={() => updateStatus.mutate({ id: t.id, status: "done" })}
            aria-label="Als erledigt markieren"
          />
          <div className="flex flex-col items-start gap-0.5">
            <span className="text-sm font-medium">{t.title}</span>
            <span className="text-xs text-muted-foreground">
              {[
                t.patientLastName
                  ? `${t.patientLastName}, ${t.patientFirstName}`
                  : null,
                t.dueAt ? format(parseISO(t.dueAt), "dd.MM.yyyy HH:mm") : null,
                TODO_PRIORITY_LABELS[String(t.priority) as TodoPriority],
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

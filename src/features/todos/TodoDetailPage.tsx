import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { ArrowLeftIcon, CaretRightIcon, PlusIcon } from "@phosphor-icons/react";

import PageContainer from "@/components/page-container";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  TODO_PRIORITY_LABELS,
  TODO_STATUS_LABELS,
  type TodoPriority,
} from "./todo.schema";
import type { TodoListItem } from "./todos.api";
import { useChildTodos, useTodo, useTodoAncestors } from "./todos.hooks";

import { TodoFormDialog } from "./TodoFormDialog";

type Props = { todoId: number };

function formatDue(value: string | null) {
  if (!value) return "—";
  try {
    return format(parseISO(value), "dd.MM.yyyy HH:mm");
  } catch {
    return value;
  }
}

export function TodoDetailPage({ todoId }: Props) {
  const navigate = useNavigate();
  const { data: todo, isLoading } = useTodo(todoId);
  const { data: children } = useChildTodos(todoId);
  const { data: ancestors } = useTodoAncestors(todoId);

  const [editOpen, setEditOpen] = useState(false);
  const [subtaskOpen, setSubtaskOpen] = useState(false);

  if (isLoading) {
    return (
      <PageContainer>
        <p className="text-muted-foreground">Lädt…</p>
      </PageContainer>
    );
  }
  if (!todo) {
    return (
      <PageContainer>
        <p className="text-destructive">Todo nicht gefunden.</p>
        <Link to="/todos" className="text-sm underline">
          Zurück zur Liste
        </Link>
      </PageContainer>
    );
  }

  function openChild(child: TodoListItem) {
    navigate({ to: "/todos/$todoId", params: { todoId: String(child.id) } });
  }

  return (
    <PageContainer>
      <Button asChild variant="ghost" className="mb-4 -ml-2">
        {todo.parentId ? (
          <Link to="/todos/$todoId" params={{ todoId: String(todo.parentId) }}>
            <ArrowLeftIcon className="size-4" /> Übergeordnetes Todo
          </Link>
        ) : (
          <Link to="/todos">
            <ArrowLeftIcon className="size-4" /> Zurück
          </Link>
        )}
      </Button>

      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{todo.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {[
              TODO_STATUS_LABELS[todo.status],
              TODO_PRIORITY_LABELS[String(todo.priority) as TodoPriority],
              todo.dueAt ? `fällig ${formatDue(todo.dueAt)}` : null,
              todo.patientLastName
                ? `${todo.patientLastName}, ${todo.patientFirstName}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button onClick={() => setSubtaskOpen(true)}>
            <PlusIcon className="size-4" /> Neues Unter-Todo
          </Button>
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            Bearbeiten
          </Button>
        </div>
      </div>

      {ancestors && ancestors.length > 1 && (
        <nav className="mb-3 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          {ancestors.map((crumb, i) => {
            const isLast = i === ancestors.length - 1;
            return (
              <span key={crumb.id} className="flex items-center gap-1">
                {isLast ? (
                  <span className="font-medium text-foreground">
                    {crumb.title}
                  </span>
                ) : (
                  <Link
                    to="/todos/$todoId"
                    params={{ todoId: String(crumb.id) }}
                    className="hover:text-foreground hover:underline"
                  >
                    {crumb.title}
                  </Link>
                )}
                {!isLast && <CaretRightIcon className="size-3 shrink-0" />}
              </span>
            );
          })}
        </nav>
      )}

      <h2 className="mb-3 text-lg font-semibold">Sub-Todos</h2>
      {children && children.length === 0 && (
        <p className="text-muted-foreground">Keine Unter-Todos.</p>
      )}
      {children && children.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titel</TableHead>
              <TableHead>Priorität</TableHead>
              <TableHead>Fällig</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {children.map((c) => (
              <TableRow
                key={c.id}
                onClick={() => openChild(c)}
                className="cursor-pointer"
              >
                <TableCell className="font-medium">{c.title}</TableCell>
                <TableCell>
                  {TODO_PRIORITY_LABELS[String(c.priority) as TodoPriority]}
                </TableCell>
                <TableCell>{formatDue(c.dueAt)}</TableCell>
                <TableCell>{TODO_STATUS_LABELS[c.status]}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <TodoFormDialog open={editOpen} onOpenChange={setEditOpen} todo={todo} />
      <TodoFormDialog
        open={subtaskOpen}
        onOpenChange={setSubtaskOpen}
        defaultParentId={todo.id}
        defaultPatientId={todo.patientId ?? undefined}
      />
    </PageContainer>
  );
}

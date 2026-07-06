import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";

import PageContainer from "@/components/page-container";
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SortableHead, useTableSort } from "@/components/sortable-table";
import { RowActions } from "@/components/row-actions";
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
import { toast } from "sonner";

import { TODO_PRIORITY_LABELS, type TodoPriority } from "./todo.schema";
import type { TodoListItem } from "./todos.api";
import { useSoftDeleteTodo, useTodos } from "./todos.hooks";
import { TodoFormDialog } from "./TodoFormDialog";
import { TodoStatusSelect } from "./TodoStatusSelect";

function formatDue(value: string | null) {
  if (!value) return "—";
  try {
    return format(parseISO(value), "dd.MM.yyyy HH:mm");
  } catch {
    return value;
  }
}

function todoSortValue(t: TodoListItem, key: string): string | number | null {
  switch (key) {
    case "title":
      return t.title;
    case "patient":
      return t.patientLastName
        ? `${t.patientLastName} ${t.patientFirstName}`
        : null;
    case "priority":
      return t.priority;
    case "dueAt":
      return t.dueAt;
    case "status":
      return t.status;
    default:
      return null;
  }
}

export function TodosPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const { data: todos, isLoading, isError } = useTodos({ search });

  const {
    sorted: todoRows,
    sort,
    toggle,
  } = useTableSort(todos, todoSortValue, { key: "priority", dir: "desc" });

  const softDelete = useSoftDeleteTodo();

  const navigate = useNavigate();
  function openDetail(todo: TodoListItem) {
    navigate({ to: "/todos/$todoId", params: { todoId: String(todo.id) } });
  }

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TodoListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TodoListItem | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(todo: TodoListItem) {
    setEditing(todo);
    setDialogOpen(true);
  }
  function confirmDelete() {
    if (!deleteTarget) return;
    softDelete.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Todo gelöscht");
        setDeleteTarget(null);
      },
      onError: (error) =>
        toast.error(`Löschen fehlgeschlagen: ${String(error)}`),
    });
  }

  return (
    <PageContainer>
      <PageHeader title="Todos">
        <Button onClick={openCreate}>Neues Todo</Button>
      </PageHeader>

      <div className="relative mb-4 max-w-sm">
        <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Nach Titel oder Patient suchen…"
          className="pl-8"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      {isLoading && <p className="text-muted-foreground">Lädt…</p>}
      {isError && (
        <p className="text-destructive">Todos konnten nicht geladen werden.</p>
      )}

      {todoRows && todoRows.length === 0 && (
        <p className="text-muted-foreground">
          {search ? "Keine Todos für diese Suche." : "Noch keine Todos."}
        </p>
      )}

      {todoRows && todoRows.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead
                label="Titel"
                sortKey="title"
                sort={sort}
                onToggle={toggle}
              />
              <SortableHead
                label="Patient"
                sortKey="patient"
                sort={sort}
                onToggle={toggle}
              />
              <SortableHead
                label="Priorität"
                sortKey="priority"
                sort={sort}
                onToggle={toggle}
              />
              <SortableHead
                label="Fällig"
                sortKey="dueAt"
                sort={sort}
                onToggle={toggle}
              />
              <SortableHead
                label="Status"
                sortKey="status"
                sort={sort}
                onToggle={toggle}
              />
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {todoRows.map((todo) => (
              <TableRow
                key={todo.id}
                className="cursor-pointer"
                onClick={() => openDetail(todo)}
              >
                <TableCell className="font-medium">{todo.title}</TableCell>
                <TableCell>
                  {todo.patientLastName
                    ? `${todo.patientLastName}, ${todo.patientFirstName}`
                    : "—"}
                </TableCell>
                <TableCell>
                  {TODO_PRIORITY_LABELS[String(todo.priority) as TodoPriority]}
                </TableCell>
                <TableCell>{formatDue(todo.dueAt)}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <TodoStatusSelect todoId={todo.id} status={todo.status} />
                </TableCell>
                <TableCell
                  className="text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <RowActions
                    onEdit={() => openEdit(todo)}
                    onDelete={() => setDeleteTarget(todo)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <TodoFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        todo={editing}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Todo löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? `„${deleteTarget.title}“ wird entfernt.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}

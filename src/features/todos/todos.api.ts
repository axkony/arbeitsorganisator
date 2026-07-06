import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNull,
  like,
  or,
  type SQL,
} from "drizzle-orm";

import { db } from "@/db";
import { patients, todos } from "@/db/schema";
import type { TodoFormValues, TodoStatus } from "./todo.schema";

export type Todo = typeof todos.$inferSelect;

function toRow(values: TodoFormValues) {
  const clean = (v?: string) => (v && v.trim() !== "" ? v.trim() : null);
  const toId = (v?: string) => (v && v.trim() !== "" ? Number(v) : null);
  return {
    title: values.title.trim(),
    status: values.status,
    priority: Number(values.priority),
    patientId: toId(values.patientId),
    parentId: toId(values.parentId),
    dueAt: clean(values.dueAt),
    // completedAt mirrors status: set when done, cleared otherwise.
    completedAt: values.status === "done" ? new Date().toISOString() : null,
  };
}

// Shared selection: todo fields + (nullable) patient name.
const listColumns = {
  id: todos.id,
  title: todos.title,
  status: todos.status,
  priority: todos.priority,
  parentId: todos.parentId,
  patientId: todos.patientId,
  dueAt: todos.dueAt,
  completedAt: todos.completedAt,
  createdAt: todos.createdAt,
  patientFirstName: patients.firstName,
  patientLastName: patients.lastName,
};

export async function listTodos(
  filters: { search?: string; status?: TodoStatus; patientId?: number } = {},
) {
  // Top-level only (parentId IS NULL); sub-todos live on the detail page.
  const where: (SQL | undefined)[] = [
    isNull(todos.deletedAt),
    isNull(todos.parentId),
  ];

  if (filters.patientId != null) {
    where.push(eq(todos.patientId, filters.patientId));
  }
  if (filters.status) {
    where.push(eq(todos.status, filters.status));
  }

  const term = filters.search?.trim();
  if (term) {
    const pattern = `%${term}%`;
    where.push(
      or(
        like(todos.title, pattern),
        like(patients.firstName, pattern),
        like(patients.lastName, pattern),
      ),
    );
  }

  return db
    .select(listColumns)
    .from(todos)
    .leftJoin(patients, eq(todos.patientId, patients.id))
    .where(and(...where))
    .orderBy(desc(todos.priority), asc(todos.dueAt));
}

// Inferred row shape (todo fields + patient name).
export type TodoListItem = Awaited<ReturnType<typeof listTodos>>[number];

export async function getTodo(id: number) {
  // No parent filter: works for top-level todos and sub-todos alike.
  const [row] = await db
    .select(listColumns)
    .from(todos)
    .leftJoin(patients, eq(todos.patientId, patients.id))
    .where(and(eq(todos.id, id), isNull(todos.deletedAt)));
  return row ?? null;
}

// Direct children of a todo (one level). Drill deeper by navigating into each
// child's own detail page — every view is one exact query against the DB.
export async function listChildTodos(
  parentId: number,
): Promise<TodoListItem[]> {
  return db
    .select(listColumns)
    .from(todos)
    .leftJoin(patients, eq(todos.patientId, patients.id))
    .where(and(isNull(todos.deletedAt), eq(todos.parentId, parentId)))
    .orderBy(desc(todos.priority), asc(todos.dueAt));
}

export async function listOpenTodos(): Promise<TodoListItem[]> {
  return db
    .select(listColumns)
    .from(todos)
    .leftJoin(patients, eq(todos.patientId, patients.id))
    .where(
      and(
        isNull(todos.deletedAt),
        isNull(todos.parentId), // widget shows parent todos only
        inArray(todos.status, ["open", "in_progress"]),
      ),
    )
    .orderBy(desc(todos.priority), asc(todos.dueAt));
}

export async function createTodo(values: TodoFormValues) {
  const [row] = await db.insert(todos).values(toRow(values)).returning();
  return row;
}

export async function updateTodo(id: number, values: TodoFormValues) {
  const [row] = await db
    .update(todos)
    .set(toRow(values))
    .where(eq(todos.id, id))
    .returning();
  return row;
}

export async function updateTodoStatus(id: number, status: TodoStatus) {
  await db
    .update(todos)
    .set({
      status,
      completedAt: status === "done" ? new Date().toISOString() : null,
    })
    .where(eq(todos.id, id));
}

// Walk the subtree level-by-level with the typed query builder (not a raw CTE,
// which would return positional arrays through the proxy). The Set guards
// against accidental cycles so this can never loop forever.
async function collectSubtreeIds(rootId: number): Promise<number[]> {
  const seen = new Set<number>([rootId]);
  let frontier = [rootId];
  while (frontier.length > 0) {
    const children = await db
      .select({ id: todos.id })
      .from(todos)
      .where(and(isNull(todos.deletedAt), inArray(todos.parentId, frontier)));
    const next: number[] = [];
    for (const { id } of children) {
      if (!seen.has(id)) {
        seen.add(id);
        next.push(id);
      }
    }
    frontier = next;
  }
  return [...seen];
}

// Soft-delete a todo together with its entire subtree of sub-todos.
export async function softDeleteTodo(id: number) {
  const ids = await collectSubtreeIds(id);
  await db
    .update(todos)
    .set({ deletedAt: new Date().toISOString() })
    .where(inArray(todos.id, ids));
}

export type TodoCrumb = { id: number; title: string; parentId: number | null };

// Walk up the parent chain → returns the path root-first, INCLUDING the todo
// itself as the last element. Set guards against accidental cycles.
export async function listTodoAncestors(id: number): Promise<TodoCrumb[]> {
  const chain: TodoCrumb[] = [];
  const seen = new Set<number>();
  let currentId: number | null = id;
  while (currentId != null && !seen.has(currentId)) {
    seen.add(currentId);
    const [row] = await db
      .select({ id: todos.id, title: todos.title, parentId: todos.parentId })
      .from(todos)
      .where(and(eq(todos.id, currentId), isNull(todos.deletedAt)));
    if (!row) break;
    chain.unshift(row); // prepend so the array ends up root → … → current
    currentId = row.parentId;
  }
  return chain;
}

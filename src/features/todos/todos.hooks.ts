import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { TodoFormValues, TodoStatus } from "./todo.schema";
import * as api from "./todos.api";
import { todoKeys } from "./todos.keys";

export function useTodos(
  filters: { search?: string; status?: TodoStatus; patientId?: number } = {},
) {
  return useQuery({
    queryKey: todoKeys.list(filters),
    queryFn: () => api.listTodos(filters),
  });
}

export function useTodo(id: number) {
  return useQuery({
    queryKey: todoKeys.detail(id),
    queryFn: () => api.getTodo(id),
  });
}

export function useChildTodos(parentId: number) {
  return useQuery({
    queryKey: todoKeys.children(parentId),
    queryFn: () => api.listChildTodos(parentId),
  });
}

export function useTodoAncestors(id: number) {
  return useQuery({
    queryKey: todoKeys.ancestors(id),
    queryFn: () => api.listTodoAncestors(id),
  });
}

export function useOpenTodos() {
  return useQuery({
    queryKey: todoKeys.open(),
    queryFn: () => api.listOpenTodos(),
  });
}

export function useCreateTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: TodoFormValues) => api.createTodo(values),
    onSuccess: () => qc.invalidateQueries({ queryKey: todoKeys.all }),
  });
}

export function useUpdateTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; values: TodoFormValues }) =>
      api.updateTodo(vars.id, vars.values),
    onSuccess: () => qc.invalidateQueries({ queryKey: todoKeys.all }),
  });
}

export function useUpdateTodoStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; status: TodoStatus }) =>
      api.updateTodoStatus(vars.id, vars.status),
    onSuccess: () => qc.invalidateQueries({ queryKey: todoKeys.all }),
  });
}

export function useSoftDeleteTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.softDeleteTodo(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: todoKeys.all }),
  });
}

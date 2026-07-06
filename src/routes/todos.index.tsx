import { createFileRoute } from "@tanstack/react-router";
import { TodosPage } from "@/features/todos/TodosPage";

export const Route = createFileRoute("/todos/")({
  component: TodosPage,
});

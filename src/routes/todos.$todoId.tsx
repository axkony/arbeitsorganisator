import { createFileRoute } from "@tanstack/react-router";
import { TodoDetailPage } from "@/features/todos/TodoDetailPage";

export const Route = createFileRoute("/todos/$todoId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { todoId } = Route.useParams();
  return <TodoDetailPage todoId={Number(todoId)} />;
}

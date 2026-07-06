import { createFileRoute } from "@tanstack/react-router";
import { SessionDetailPage } from "@/features/sessions/SessionDetailPage";

export const Route = createFileRoute("/sessions/$sessionId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { sessionId } = Route.useParams();
  return <SessionDetailPage sessionId={Number(sessionId)} />;
}

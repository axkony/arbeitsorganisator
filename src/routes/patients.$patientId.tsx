import { createFileRoute } from "@tanstack/react-router";
import { PatientDetailPage } from "@/features/patients/PatientDetailPage";

export const Route = createFileRoute("/patients/$patientId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { patientId } = Route.useParams();
  return <PatientDetailPage patientId={Number(patientId)} />;
}

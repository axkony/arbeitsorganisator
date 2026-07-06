import { createFileRoute } from "@tanstack/react-router";
import { PatientsPage } from "@/features/patients/PatientsPage";

export const Route = createFileRoute("/patients/")({
  component: PatientsPage,
});

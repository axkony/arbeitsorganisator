import { createFileRoute } from "@tanstack/react-router";
import { PatientImportPage } from "@/features/patients/import/PatientImportPage";

// TEMPORARY: one-time patient CSV import. Remove this route (and the sidebar
// entry + src/features/patients/import/) once the import has been run.
export const Route = createFileRoute("/import")({
  component: PatientImportPage,
});

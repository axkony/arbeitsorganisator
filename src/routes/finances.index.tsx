import { createFileRoute } from "@tanstack/react-router";
import { FinancesPage } from "@/features/invoices/FinancesPage";

export const Route = createFileRoute("/finances/")({
  component: FinancesPage,
});

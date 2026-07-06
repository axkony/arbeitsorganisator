import { createFileRoute } from "@tanstack/react-router";
import { InvoiceDetailPage } from "@/features/invoices/InvoiceDetailPage";

export const Route = createFileRoute("/finances/$invoiceId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { invoiceId } = Route.useParams();
  return <InvoiceDetailPage invoiceId={Number(invoiceId)} />;
}

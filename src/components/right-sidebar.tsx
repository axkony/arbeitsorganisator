import { UpcomingSessionsWidget } from "@/features/sessions/UpcomingSessionsWidget";
import { OpenTodosWidget } from "@/features/todos/OpenTodosWidget";
import { SidebarPanels } from "@/components/sidebar-panels";
import { UnsentInvoicesWidget } from "@/features/invoices/UnsentInvoicesWidget";

export function RightSidebar() {
  return (
    <SidebarPanels
      panels={[
        {
          id: "sessions",
          title: "Anstehende Sitzungen",
          content: <UpcomingSessionsWidget />,
        },
        {
          id: "todos",
          title: "Offene Todos",
          content: <OpenTodosWidget />,
        },
        {
          id: "invoices",
          title: "Nicht gesendete Rechnungen",
          content: <UnsentInvoicesWidget />,
        },
      ]}
    />
  );
}

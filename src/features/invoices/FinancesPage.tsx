import { useState } from "react";

import PageContainer from "@/components/page-container";
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { InvoiceFormDialog } from "./InvoiceFormDialog";
import { AllInvoicesTab } from "./AllInvoicesTab";
import { PatientFinancesTab } from "./PatientFinancesTab";
import { OpenPaidInvoicesTab } from "./OpenPaidInvoicesTab";
import { UninvoicedSessionsTab } from "./UninvoicedSessionsTab";

export function FinancesPage() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <PageContainer>
      <PageHeader title="Finanzen">
        <Button onClick={() => setCreateOpen(true)}>Neue Rechnung</Button>
      </PageHeader>

      <Tabs defaultValue="all" className="mt-2">
        <TabsList>
          <TabsTrigger value="all">Alle Rechnungen</TabsTrigger>
          <TabsTrigger value="patient">Pro Patient</TabsTrigger>
          <TabsTrigger value="open-paid">Offen &amp; Bezahlt</TabsTrigger>
          <TabsTrigger value="uninvoiced">
            Nicht verrechnete Sitzungen
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <AllInvoicesTab />
        </TabsContent>
        <TabsContent value="patient" className="mt-4">
          <PatientFinancesTab />
        </TabsContent>
        <TabsContent value="open-paid" className="mt-4">
          <OpenPaidInvoicesTab />
        </TabsContent>
        <TabsContent value="uninvoiced" className="mt-4">
          <UninvoicedSessionsTab />
        </TabsContent>
      </Tabs>

      <InvoiceFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </PageContainer>
  );
}

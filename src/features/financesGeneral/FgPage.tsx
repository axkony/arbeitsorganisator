import PageContainer from "@/components/page-container";
import PageHeader from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { FgOverviewTab } from "./FgOverviewTab";
import { FgTransactionsTab } from "./FgTransactionsTab";
import { FgTagsTab } from "./FgTagsTab";
import { FgPersonsTab } from "./FgPersonsTab";

function FgPage() {
  return (
    <PageContainer>
      <PageHeader title="Finanzen Gesamt" />

      <Tabs defaultValue="overview" className="mt-2">
        <TabsList>
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="income">Einnahmen</TabsTrigger>
          <TabsTrigger value="expense">Ausgaben</TabsTrigger>
          <TabsTrigger value="tags">Kategorien</TabsTrigger>
          <TabsTrigger value="persons">Personen</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <FgOverviewTab />
        </TabsContent>
        <TabsContent value="income" className="mt-4">
          <FgTransactionsTab direction="income" />
        </TabsContent>
        <TabsContent value="expense" className="mt-4">
          <FgTransactionsTab direction="expense" />
        </TabsContent>
        <TabsContent value="tags" className="mt-4">
          <FgTagsTab />
        </TabsContent>
        <TabsContent value="persons" className="mt-4">
          <FgPersonsTab />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}

export default FgPage;

import { Link } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { ArrowLeftIcon } from "@phosphor-icons/react";

import PageContainer from "@/components/page-container";
import { Button } from "@/components/ui/button";

import { SESSION_STATUS_LABELS, SESSION_TYPE_LABELS } from "./session.schema";
import { useSession } from "./sessions.hooks";
import { SessionEntriesContainer } from "./SessionEntriesContainer";

type Props = { sessionId: number };

export function SessionDetailPage({ sessionId }: Props) {
  const { data: session, isLoading } = useSession(sessionId);

  if (isLoading) {
    return (
      <PageContainer>
        <p className="text-muted-foreground">Lädt…</p>
      </PageContainer>
    );
  }
  if (!session) {
    return (
      <PageContainer>
        <p className="text-destructive">Sitzung nicht gefunden.</p>
        <Link to="/sessions" className="text-sm underline">
          Zurück
        </Link>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Button asChild variant="ghost" className="mb-4 -ml-2">
        <Link to="/sessions">
          <ArrowLeftIcon className="size-4" /> Zurück
        </Link>
      </Button>

      <div className="mb-6">
        <Link
          to="/patients/$patientId"
          params={{ patientId: String(session.patientId) }}
          className="inline-block cursor-pointer hover:underline"
        >
          <h1 className="text-2xl font-semibold">
            {session.patientLastName}, {session.patientFirstName}
          </h1>
        </Link>
        <p className="mt-1 text-sm text-muted-foreground">
          {format(parseISO(session.sessionDate), "dd.MM.yyyy HH:mm")} /{" "}
          {SESSION_TYPE_LABELS[session.sessionType]} /{" "}
          {SESSION_STATUS_LABELS[session.status]}
        </p>
        {session.reason && <p className="mt-2 text-sm">{session.reason}</p>}
      </div>

      <h2 className="mb-3 text-lg font-semibold">Einträge</h2>
      <SessionEntriesContainer sessionId={sessionId} />
    </PageContainer>
  );
}

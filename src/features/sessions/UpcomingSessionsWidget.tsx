import { useNavigate } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";

import { SESSION_TYPE_LABELS } from "./session.schema";
import { useUpcomingSessions } from "./sessions.hooks";

export function UpcomingSessionsWidget() {
  const navigate = useNavigate();
  const { data: sessions, isLoading } = useUpcomingSessions();

  return (
    <div className="flex flex-col">
      {isLoading && (
        <p className="px-3 py-2 text-xs text-muted-foreground">Lädt…</p>
      )}
      {sessions && sessions.length === 0 && (
        <p className="px-3 py-2 text-xs text-muted-foreground">
          Keine anstehenden Sitzungen.
        </p>
      )}
      {sessions?.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() =>
            navigate({
              to: "/sessions/$sessionId",
              params: { sessionId: String(s.id) },
            })
          }
          className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-accent"
        >
          <span className="font-medium">
            {s.patientLastName}, {s.patientFirstName}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(parseISO(s.sessionDate), "dd.MM.yyyy HH:mm")} ·{" "}
            {SESSION_TYPE_LABELS[s.sessionType]}
          </span>
        </button>
      ))}
    </div>
  );
}

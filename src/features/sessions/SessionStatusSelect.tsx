import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  SESSION_STATUSES,
  SESSION_STATUS_LABELS,
  type SessionStatus,
} from "./session.schema";
import { useUpdateSessionStatus } from "./sessions.hooks";

type Props = {
  sessionId: number;
  status: SessionStatus;
};

export function SessionStatusSelect({ sessionId, status }: Props) {
  const updateStatus = useUpdateSessionStatus();

  return (
    <Select
      value={status}
      onValueChange={(value) =>
        updateStatus.mutate(
          { id: sessionId, status: value as SessionStatus },
          {
            onError: (error) =>
              toast.error(`Status fehlgeschlagen: ${String(error)}`),
          },
        )
      }
    >
      {/* stopPropagation keeps this safe if the row ever becomes clickable */}
      <SelectTrigger
        className="h-8 w-[150px]"
        onClick={(e) => e.stopPropagation()}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SESSION_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {SESSION_STATUS_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

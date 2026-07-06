import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  TODO_STATUSES,
  TODO_STATUS_LABELS,
  type TodoStatus,
} from "./todo.schema";
import { useUpdateTodoStatus } from "./todos.hooks";

type Props = {
  todoId: number;
  status: TodoStatus;
};

export function TodoStatusSelect({ todoId, status }: Props) {
  const updateStatus = useUpdateTodoStatus();

  return (
    <Select
      value={status}
      onValueChange={(value) =>
        updateStatus.mutate(
          { id: todoId, status: value as TodoStatus },
          {
            onError: (error) =>
              toast.error(`Status fehlgeschlagen: ${String(error)}`),
          },
        )
      }
    >
      <SelectTrigger
        className="h-8 w-[150px]"
        onClick={(e) => e.stopPropagation()}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TODO_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {TODO_STATUS_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

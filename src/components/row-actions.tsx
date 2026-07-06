import type { ReactNode } from "react";
import { DotsThreeIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  onEdit?: () => void;
  onDelete?: () => void;
  children?: ReactNode; // extra items rendered above Edit/Delete
};

export function RowActions({ onEdit, onDelete, children }: Props) {
  const hasEditOrDelete = Boolean(onEdit || onDelete);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="size-8 p-0">
          <DotsThreeIcon className="size-4" weight="bold" />
          <span className="sr-only">Aktionen öffnen</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {children}
        {children && hasEditOrDelete && <DropdownMenuSeparator />}
        {onEdit && (
          <DropdownMenuItem onSelect={onEdit}>Bearbeiten</DropdownMenuItem>
        )}
        {onDelete && (
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={onDelete}
          >
            Löschen
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

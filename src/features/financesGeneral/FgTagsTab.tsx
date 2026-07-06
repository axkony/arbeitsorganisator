import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RowActions } from "@/components/row-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import type { FgTag } from "./fg.api";
import { useCreateFgTag, useDeleteFgTag, useFgTags } from "./fg.hooks";

export function FgTagsTab() {
  const { data: tags, isLoading } = useFgTags();
  const create = useCreateFgTag();
  const del = useDeleteFgTag();

  const [name, setName] = useState("");
  const [color, setColor] = useState("#64748b");
  const [deleteTarget, setDeleteTarget] = useState<FgTag | null>(null);

  function add() {
    const trimmed = name.trim();
    if (!trimmed) return;
    create.mutate(
      { name: trimmed, color },
      {
        onSuccess: () => {
          toast.success("Kategorie angelegt");
          setName("");
        },
        onError: (e) => toast.error(`Fehlgeschlagen: ${String(e)}`),
      },
    );
  }

  return (
    <div className="max-w-xl space-y-4">
      <p className="text-sm text-muted-foreground">
        Kategorien (Tags) zum Ordnen von Einnahmen und Ausgaben, z. B. „Privat“,
        „Software“, „Musik“.
      </p>

      <div className="flex items-end gap-2">
        <input
          type="color"
          aria-label="Farbe"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="size-9 shrink-0 cursor-pointer rounded border bg-transparent"
        />
        <Input
          placeholder="Neue Kategorie…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <Button onClick={add} disabled={!name.trim() || create.isPending}>
          Hinzufügen
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground">Lädt…</p>}
      {tags && tags.length === 0 && (
        <p className="text-muted-foreground">Noch keine Kategorien.</p>
      )}

      {tags && tags.length > 0 && (
        <div className="divide-y border">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center justify-between gap-3 px-4 py-2.5"
            >
              <span className="flex items-center gap-2 text-sm">
                <span
                  className="inline-block size-3 rounded-full"
                  style={{ backgroundColor: tag.color ?? "var(--muted-foreground)" }}
                />
                {tag.name}
              </span>
              <RowActions onDelete={() => setDeleteTarget(tag)} />
            </div>
          ))}
        </div>
      )}

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kategorie löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `„${deleteTarget.name}“ wird entfernt. Bestehende Einträge verlieren diese Kategorie.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteTarget) return;
                del.mutate(deleteTarget.id, {
                  onSuccess: () => {
                    toast.success("Kategorie gelöscht");
                    setDeleteTarget(null);
                  },
                  onError: (e) => toast.error(`Fehlgeschlagen: ${String(e)}`),
                });
              }}
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

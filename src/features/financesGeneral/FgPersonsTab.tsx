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

import type { FgPerson } from "./fg.api";
import { useCreateFgPerson, useDeleteFgPerson, useFgPersons } from "./fg.hooks";

export function FgPersonsTab() {
  const { data: persons, isLoading } = useFgPersons();
  const create = useCreateFgPerson();
  const del = useDeleteFgPerson();

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<FgPerson | null>(null);

  function add() {
    const trimmed = name.trim();
    if (!trimmed) return;
    create.mutate(
      { name: trimmed, notes: notes.trim() || null },
      {
        onSuccess: () => {
          toast.success("Person angelegt");
          setName("");
          setNotes("");
        },
        onError: (e) => toast.error(`Fehlgeschlagen: ${String(e)}`),
      },
    );
  }

  return (
    <div className="max-w-xl space-y-4">
      <p className="text-sm text-muted-foreground">
        Personen für wiederkehrende oder einmalige Einnahmen und Ausgaben
        (z. B. Vermieter, Auftraggeber). Können jedem Eintrag zugeordnet werden.
      </p>

      <div className="flex items-end gap-2">
        <Input
          placeholder="Name…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <Input
          placeholder="Notiz (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <Button onClick={add} disabled={!name.trim() || create.isPending}>
          Hinzufügen
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground">Lädt…</p>}
      {persons && persons.length === 0 && (
        <p className="text-muted-foreground">Noch keine Personen.</p>
      )}

      {persons && persons.length > 0 && (
        <div className="divide-y border">
          {persons.map((person) => (
            <div
              key={person.id}
              className="flex items-center justify-between gap-3 px-4 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{person.name}</p>
                {person.notes && (
                  <p className="truncate text-xs text-muted-foreground">
                    {person.notes}
                  </p>
                )}
              </div>
              <RowActions onDelete={() => setDeleteTarget(person)} />
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
            <AlertDialogTitle>Person löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `„${deleteTarget.name}“ wird entfernt und ist für neue Einträge nicht mehr auswählbar. Bestehende Einträge bleiben unverändert.`
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
                    toast.success("Person gelöscht");
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

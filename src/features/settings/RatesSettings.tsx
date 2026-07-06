import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  SESSION_TYPES,
  SESSION_TYPE_LABELS,
} from "@/features/sessions/session.schema";
import { formatRappen, francsToRappen, rappenToFrancs } from "@/lib/money";

import { useSessionRates, useUpdateSessionRate } from "./rates.hooks";

// Accepts "130", "130.5", "130,50" — up to two decimal places.
const FRANCS_RE = /^\d+([.,]\d{1,2})?$/;

export function RatesSettings() {
  const { data: rates, isLoading, isError } = useSessionRates();
  const updateRate = useUpdateSessionRate();

  // Overlay of edited francs strings, keyed by session type. A type stays
  // absent until the user edits it, so a background refetch can never clobber
  // a value being typed — only untouched rows follow the query.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const rateMap = new Map(
    (rates ?? []).map((r) => [r.sessionType, r.rateRappen]),
  );

  const rows = SESSION_TYPES.filter((type) => rateMap.has(type)).map((type) => {
    const rateRappen = rateMap.get(type)!;
    const draft = drafts[type];
    const value = draft ?? rappenToFrancs(rateRappen);
    const invalid = draft !== undefined && !FRANCS_RE.test(draft.trim());
    const dirty =
      draft !== undefined && !invalid && francsToRappen(value) !== rateRappen;
    return { type, rateRappen, value, dirty, invalid };
  });

  const dirtyRows = rows.filter((r) => r.dirty);
  const hasInvalid = rows.some((r) => r.invalid);
  const canSave = dirtyRows.length > 0 && !hasInvalid && !saving;

  async function handleSave() {
    if (dirtyRows.length === 0 || hasInvalid) return;
    setSaving(true);
    try {
      await Promise.all(
        dirtyRows.map((r) =>
          updateRate.mutateAsync({
            sessionType: r.type,
            rateRappen: francsToRappen(r.value),
          }),
        ),
      );
      setDrafts({});
      toast.success(
        dirtyRows.length === 1 ? "Tarif gespeichert" : "Tarife gespeichert",
      );
    } catch (error) {
      toast.error(`Speichern fehlgeschlagen: ${String(error)}`);
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Lädt…</p>;
  }
  if (isError) {
    return (
      <p className="text-sm text-destructive">
        Tarife konnten nicht geladen werden.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="divide-y border">
        {rows.map((row) => (
          <div
            key={row.type}
            className="flex items-center justify-between gap-4 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {SESSION_TYPE_LABELS[row.type]}
              </p>
              <p className="text-xs text-muted-foreground">
                Aktuell {formatRappen(row.rateRappen)} / Std.
              </p>
            </div>
            <InputGroup className="w-44">
              <InputGroupAddon>CHF</InputGroupAddon>
              <InputGroupInput
                inputMode="decimal"
                aria-label={`Stundensatz ${SESSION_TYPE_LABELS[row.type]}`}
                aria-invalid={row.invalid || undefined}
                className="text-right tabular-nums"
                value={row.value}
                onChange={(e) =>
                  setDrafts((d) => ({ ...d, [row.type]: e.target.value }))
                }
              />
              <InputGroupAddon align="inline-end">/ Std.</InputGroupAddon>
            </InputGroup>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-3">
        {hasInvalid ? (
          <span className="text-xs text-destructive">Ungültiger Betrag</span>
        ) : (
          dirtyRows.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {dirtyRows.length} ungespeicherte Änderung
              {dirtyRows.length > 1 ? "en" : ""}
            </span>
          )
        )}
        <Button onClick={handleSave} disabled={!canSave}>
          {saving ? "Speichert…" : "Speichern"}
        </Button>
      </div>
    </div>
  );
}

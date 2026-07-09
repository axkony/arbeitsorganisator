import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import PageContainer from "@/components/page-container";
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { bulkCreatePatients } from "../patients.api";
import { patientKeys } from "../patients.keys";
import { buildPreview } from "./patientImport";

const GENDER_LABEL: Record<string, string> = {
  female: "Frau",
  male: "Herr",
  other: "—",
  not_specified: "—",
};

// One-time CSV importer. Paste the CSV, review the preview, then import.
// This screen is temporary and can be removed once the import has run.
export function PatientImportPage() {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const preview = useMemo(
    () => (text.trim() ? buildPreview(text) : null),
    [text],
  );

  async function runImport() {
    if (!preview || preview.toImport.length === 0) return;
    setImporting(true);
    try {
      const { inserted, skippedExisting } = await bulkCreatePatients(
        preview.toImport,
      );
      await qc.invalidateQueries({ queryKey: patientKeys.all });
      const msg = `${inserted} Patient:innen importiert${
        skippedExisting > 0 ? `, ${skippedExisting} bereits vorhanden` : ""
      }.`;
      setDone(msg);
      toast.success(msg);
    } catch (e) {
      toast.error(`Import fehlgeschlagen: ${String(e)}`);
    } finally {
      setImporting(false);
    }
  }

  return (
    <PageContainer>
      <PageHeader title="Patienten importieren" />

      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          CSV-Inhalt hier einfügen (mit Kopfzeile). Vorschau prüfen, dann
          importieren. Doppelte Einträge werden automatisch nur einmal
          angelegt; bereits vorhandene Patient:innen werden übersprungen.
        </p>

        <Textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setDone(null);
          }}
          placeholder="Name,Adresse 1,…,Vorname,…,Geburtsdatum,…"
          className="h-40 font-mono text-xs"
        />

        {preview && (
          <>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span>
                <strong>{preview.totalRows}</strong> Zeilen gelesen
              </span>
              <span className="text-emerald-600">
                <strong>{preview.toImport.length}</strong> werden importiert
              </span>
              <span className="text-muted-foreground">
                {preview.duplicateCount} Duplikate übersprungen
              </span>
              {preview.missingNameCount > 0 && (
                <span className="text-amber-600">
                  {preview.missingNameCount} ohne Namen übersprungen
                </span>
              )}
            </div>

            <div className="max-h-[420px] overflow-auto border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nachname</TableHead>
                    <TableHead>Vorname</TableHead>
                    <TableHead>Geburtsdatum</TableHead>
                    <TableHead>Anrede</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.rows.map((r, i) => (
                    <TableRow
                      key={i}
                      className={
                        !r.hasName
                          ? "opacity-40"
                          : r.isDuplicate
                            ? "opacity-50"
                            : ""
                      }
                    >
                      <TableCell>{r.lastName || "—"}</TableCell>
                      <TableCell>{r.firstName || "—"}</TableCell>
                      <TableCell>
                        {r.dateOfBirth || (
                          <span className="text-amber-600">kein Datum</span>
                        )}
                      </TableCell>
                      <TableCell>{GENDER_LABEL[r.gender]}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {!r.hasName
                          ? "kein Name"
                          : r.isDuplicate
                            ? "Duplikat"
                            : "neu"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={runImport}
                disabled={importing || preview.toImport.length === 0 || !!done}
              >
                {importing
                  ? "Importiere…"
                  : `${preview.toImport.length} Patient:innen importieren`}
              </Button>
              {done && (
                <span className="text-sm text-emerald-600">{done}</span>
              )}
            </div>
          </>
        )}
      </div>
    </PageContainer>
  );
}

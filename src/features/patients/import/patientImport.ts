import type { PatientFormValues } from "../patient.schema";

// One-time CSV importer for the existing patient list.
// Everything here is PURE (no DB): parse text -> preview. The actual insert
// happens via bulkCreatePatients in patients.api.ts, after the user confirms.

// --- RFC-4180-ish CSV parser -------------------------------------------------
// Handles quoted fields, commas inside quotes, escaped quotes (""), and CRLF.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  // strip a leading BOM if present
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++; // skip the escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      // finish the field/row; swallow \r\n as one break
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  // trailing field/row (file not ending in newline)
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // drop rows that are entirely empty (e.g. a trailing blank line)
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

// --- field helpers -----------------------------------------------------------
const clean = (v?: string) => (v && v.trim() !== "" ? v.trim() : "");

// "05.12.1962" -> "1962-12-05". Returns "" if it isn't a valid dd.mm.yyyy.
export function normalizeDate(raw?: string): string {
  const v = clean(raw);
  if (!v) return "";
  const m = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return "";
  const [, d, mo, y] = m;
  const dd = d.padStart(2, "0");
  const mm = mo.padStart(2, "0");
  if (+dd < 1 || +dd > 31 || +mm < 1 || +mm > 12) return "";
  return `${y}-${mm}-${dd}`;
}

function mapGender(
  anrede?: string,
): NonNullable<PatientFormValues["gender"]> {
  const v = clean(anrede).toLowerCase();
  if (v === "frau") return "female";
  if (v === "herr") return "male";
  return "not_specified";
}

function joinNonEmpty(parts: (string | undefined)[], sep: string): string {
  return parts.map(clean).filter(Boolean).join(sep);
}

// --- mapping one CSV row -> a patient ----------------------------------------
export type PreviewRow = {
  lastName: string;
  firstName: string;
  dateOfBirth: string; // normalized ISO or ""
  gender: NonNullable<PatientFormValues["gender"]>;
  values: PatientFormValues; // what gets inserted
  isDuplicate: boolean; // duplicate of an earlier row in this file
  hasName: boolean; // false => will be skipped (no first+last name)
};

export type ImportPreview = {
  totalRows: number; // data rows in the file
  rows: PreviewRow[]; // every parsed row, in file order
  toImport: PatientFormValues[]; // unique, named rows only
  duplicateCount: number;
  missingNameCount: number;
};

// header -> column index, trimmed + lowercased so "Tel-Nr. Privat " matches
function headerIndex(header: string[]): (name: string) => number {
  const map = new Map<string, number>();
  header.forEach((h, i) => map.set(h.trim().toLowerCase(), i));
  return (name: string) => map.get(name.trim().toLowerCase()) ?? -1;
}

export function buildPreview(text: string): ImportPreview {
  const table = parseCsv(text);
  if (table.length < 2) {
    return {
      totalRows: 0,
      rows: [],
      toImport: [],
      duplicateCount: 0,
      missingNameCount: 0,
    };
  }

  const header = table[0];
  const idx = headerIndex(header);
  const col = (row: string[], name: string) => {
    const i = idx(name);
    return i >= 0 ? (row[i] ?? "") : "";
  };

  const iLast = idx("Name");
  const iFirst = idx("Vorname");

  const seen = new Set<string>();
  const rows: PreviewRow[] = [];
  const toImport: PatientFormValues[] = [];
  let duplicateCount = 0;
  let missingNameCount = 0;

  for (let r = 1; r < table.length; r++) {
    const row = table[r];

    const lastName = clean(iLast >= 0 ? row[iLast] : "");
    const firstName = clean(iFirst >= 0 ? row[iFirst] : "");
    const dateOfBirth = normalizeDate(col(row, "Geburtsdatum"));
    const gender = mapGender(col(row, "Anrede"));

    const phone = joinNonEmpty(
      [
        col(row, "Tel-Nr. mobile"),
        col(row, "Tel-Nr. Privat"),
        col(row, "Tel-Nr. Geschäft"),
      ],
      "",
    )
      ? clean(col(row, "Tel-Nr. mobile")) ||
        clean(col(row, "Tel-Nr. Privat")) ||
        clean(col(row, "Tel-Nr. Geschäft"))
      : "";

    const address = joinNonEmpty(
      [
        col(row, "Adresse 1"),
        col(row, "Adresse 2"),
        joinNonEmpty([col(row, "Plz"), col(row, "Ortschaft")], " "),
        col(row, "Land"),
      ],
      "\n",
    );

    const insuranceInfo = joinNonEmpty(
      [
        clean(col(row, "AHV-Nr.")) && `AHV: ${clean(col(row, "AHV-Nr."))}`,
        clean(col(row, "Unfallversicherungs-Nr.")) &&
          `Unfall: ${clean(col(row, "Unfallversicherungs-Nr."))}`,
        clean(col(row, "Invalidenversicherungs-Nr.:")) &&
          `IV: ${clean(col(row, "Invalidenversicherungs-Nr.:"))}`,
      ],
      "\n",
    );

    const notes = joinNonEmpty(
      [
        col(row, "Notizen"),
        clean(col(row, "Beruf")) && `Beruf: ${clean(col(row, "Beruf"))}`,
      ],
      "\n",
    );

    const hasName = !!(firstName && lastName);
    const key = `${lastName.toLowerCase()}|${firstName.toLowerCase()}|${dateOfBirth}`;
    const isDuplicate = hasName && seen.has(key);

    if (!hasName) {
      missingNameCount++;
    } else if (isDuplicate) {
      duplicateCount++;
    } else {
      seen.add(key);
      toImport.push({
        firstName,
        lastName,
        dateOfBirth: dateOfBirth || undefined,
        gender,
        phone: phone || undefined,
        email: clean(col(row, "E-Mail")) || undefined,
        address: address || undefined,
        insuranceInfo: insuranceInfo || undefined,
        notes: notes || undefined,
      });
    }

    rows.push({
      lastName,
      firstName,
      dateOfBirth,
      gender,
      values: toImport[toImport.length - 1] ?? ({} as PatientFormValues),
      isDuplicate,
      hasName,
    });
  }

  return {
    totalRows: table.length - 1,
    rows,
    toImport,
    duplicateCount,
    missingNameCount,
  };
}

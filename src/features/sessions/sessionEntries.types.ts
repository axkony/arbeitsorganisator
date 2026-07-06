export const COLUMN_TYPES = [
  { type: "text", label: "Text" },
  { type: "number", label: "Nummer" },
  { type: "date", label: "Datum" },
  { type: "time", label: "Zeit" },
  { type: "boolean", label: "Ja/Nein" },
] as const;

export type ColumnType = (typeof COLUMN_TYPES)[number]["type"];

export const COLUMN_TYPE_LABEL: Record<ColumnType, string> = {
  text: "Text",
  number: "Zahl",
  date: "Datum",
  time: "Zeit",
  boolean: "Ja/Nein",
};

export type EntryColumn = {
  id: string;
  type: ColumnType;
  label: string;
  value: string; // everything stored as string; boolean = "true"/"false"
};

type EntryBase = {
  id: number;
  label: string;
  sortOrder: number;
};

export type ColumnsEntry = EntryBase & {
  kind: "columns";
  columns: EntryColumn[];
};

export type TextEntry = EntryBase & {
  kind: "text";
  text: string;
};

export type SessionEntry = ColumnsEntry | TextEntry;

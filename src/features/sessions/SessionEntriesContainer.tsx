import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  CaretDownIcon,
  CaretRightIcon,
  PlusIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import {
  COLUMN_TYPES,
  COLUMN_TYPE_LABEL,
  type ColumnsEntry,
  type ColumnType,
  type EntryColumn,
  type SessionEntry,
  type TextEntry,
} from "./sessionEntries.types";
import {
  useCreateSessionEntry,
  useDeleteSessionEntry,
  useSessionEntries,
  useUpdateSessionEntry,
} from "./sessionEntries.hooks";

function ColumnTypePicker({
  onPick,
  children,
}: {
  onPick: (type: ColumnType) => void;
  children: ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {COLUMN_TYPES.map((t) => (
          <DropdownMenuItem key={t.type} onSelect={() => onPick(t.type)}>
            {t.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NewEntryPicker({
  onPickColumn,
  onPickText,
  children,
}: {
  onPickColumn: (type: ColumnType) => void;
  onPickText: () => void;
  children: ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {COLUMN_TYPES.map((t) => (
          <DropdownMenuItem key={t.type} onSelect={() => onPickColumn(t.type)}>
            {t.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onPickText}>Textblock</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Shared header: collapse toggle + title input + delete. Used by both row kinds.
function EntryHeader({
  label,
  onLabelChange,
  collapsed,
  onToggleCollapse,
  onDelete,
}: {
  label: string;
  onLabelChange: (value: string) => void;
  collapsed: boolean;
  onToggleCollapse: (e: MouseEvent) => void;
  onDelete: () => void;
}) {
  return (
    <div className={cn("flex items-center gap-2", !collapsed && "mb-3")}>
      <button
        type="button"
        onClick={onToggleCollapse}
        className="text-muted-foreground hover:text-foreground"
        aria-label={collapsed ? "Ausklappen" : "Einklappen"}
      >
        {collapsed ? (
          <CaretRightIcon className="size-4" />
        ) : (
          <CaretDownIcon className="size-4" />
        )}
      </button>
      <Input
        className="h-8 max-w-xs border-none"
        placeholder="Eintrag-Bezeichnung (optional)"
        value={label}
        onChange={(e) => onLabelChange(e.target.value)}
      />
      <Button
        variant="ghost"
        className="ml-auto size-8 p-0 hover:text-destructive"
        onClick={onDelete}
        aria-label="Eintrag löschen"
      >
        <TrashIcon className="size-4" />
      </Button>
    </div>
  );
}

function TypedInput({
  column,
  onChange,
}: {
  column: EntryColumn;
  onChange: (value: string) => void;
}) {
  if (column.type === "boolean") {
    return (
      <input
        type="checkbox"
        className="size-8 accent-primary"
        checked={column.value === "true"}
        onChange={(e) => onChange(e.target.checked ? "true" : "false")}
      />
    );
  }
  const inputType =
    column.type === "number"
      ? "number"
      : column.type === "date"
        ? "date"
        : column.type === "time"
          ? "time"
          : "text";
  return (
    <Input
      className=" h-8 border-none"
      type={inputType}
      value={column.value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function ColumnsEntryRow({
  sessionId,
  entry,
  onDelete,
  collapsed,
  onToggleCollapse,
}: {
  sessionId: number;
  entry: ColumnsEntry;
  onDelete: () => void;
  collapsed: boolean;
  onToggleCollapse: (e: MouseEvent) => void;
}) {
  const updateEntry = useUpdateSessionEntry(sessionId);
  const [label, setLabel] = useState(entry.label);
  const [columns, setColumns] = useState<EntryColumn[]>(entry.columns);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const t = setTimeout(() => {
      updateEntry.mutate({ id: entry.id, kind: "columns", label, columns });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label, columns]);

  function updateColumn(colId: string, patch: Partial<EntryColumn>) {
    setColumns((cols) =>
      cols.map((c) => (c.id === colId ? { ...c, ...patch } : c)),
    );
  }
  function addColumn(type: ColumnType) {
    setColumns((cols) => [
      ...cols,
      { id: crypto.randomUUID(), type, label: "", value: "" },
    ]);
  }
  function removeColumn(colId: string) {
    setColumns((cols) => cols.filter((c) => c.id !== colId));
  }

  return (
    <div className="border p-3">
      <EntryHeader
        label={label}
        onLabelChange={setLabel}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
        onDelete={onDelete}
      />

      {!collapsed && (
        <div className="flex flex-wrap items-end gap-2">
          {columns.map((col) => (
            <div key={col.id} className="flex w-44 gap-1 border px-0">
              <div className="flex flex-col items-center">
                <Input
                  className="text-xs h-8 border-b border-x-0 border-t-0 "
                  placeholder={COLUMN_TYPE_LABEL[col.type]}
                  value={col.label}
                  onChange={(e) =>
                    updateColumn(col.id, { label: e.target.value })
                  }
                />
                <TypedInput
                  column={col}
                  onChange={(value) => updateColumn(col.id, { value })}
                />
              </div>
              <button
                type="button"
                onClick={() => removeColumn(col.id)}
                className="px-2 text-muted-foreground hover:text-destructive "
                aria-label="Spalte löschen"
              >
                <XIcon className="size-3.5" />
              </button>
            </div>
          ))}

          <ColumnTypePicker onPick={addColumn}>
            <Button variant="outline" size="sm" className="h-9">
              <PlusIcon className="size-4" /> Spalte
            </Button>
          </ColumnTypePicker>
        </div>
      )}
    </div>
  );
}

function TextEntryRow({
  sessionId,
  entry,
  onDelete,
  collapsed,
  onToggleCollapse,
}: {
  sessionId: number;
  entry: TextEntry;
  onDelete: () => void;
  collapsed: boolean;
  onToggleCollapse: (e: MouseEvent) => void;
}) {
  const updateEntry = useUpdateSessionEntry(sessionId);
  const [label, setLabel] = useState(entry.label);
  const [text, setText] = useState(entry.text);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const t = setTimeout(() => {
      updateEntry.mutate({ id: entry.id, kind: "text", label, text });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label, text]);

  return (
    <div className="border p-3">
      <EntryHeader
        label={label}
        onLabelChange={setLabel}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
        onDelete={onDelete}
      />

      {!collapsed && (
        <Textarea
          className="resize-none border-none"
          placeholder="Text…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      )}
    </div>
  );
}

function EntryRow({
  sessionId,
  entry,
  onDelete,
  collapsed,
  onToggleCollapse,
}: {
  sessionId: number;
  entry: SessionEntry;
  onDelete: () => void;
  collapsed: boolean;
  onToggleCollapse: (e: MouseEvent) => void;
}) {
  if (entry.kind === "text") {
    return (
      <TextEntryRow
        sessionId={sessionId}
        entry={entry}
        onDelete={onDelete}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
      />
    );
  }
  return (
    <ColumnsEntryRow
      sessionId={sessionId}
      entry={entry}
      onDelete={onDelete}
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
    />
  );
}

export function SessionEntriesContainer({ sessionId }: { sessionId: number }) {
  const { data: entries, isLoading } = useSessionEntries(sessionId);
  const createEntry = useCreateSessionEntry(sessionId);
  const deleteEntry = useDeleteSessionEntry(sessionId);

  // Collapsed entries by id (lifted here so "collapse/expand all" works).
  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set());

  const allCollapsed =
    !!entries &&
    entries.length > 0 &&
    entries.every((e) => collapsedIds.has(e.id));

  function toggleCollapse(id: number) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function handleToggle(id: number, e: MouseEvent) {
    if (e.altKey && entries) {
      // Option-click: make every entry match the clicked one's current state.
      const isCollapsed = collapsedIds.has(id);
      setCollapsedIds(
        isCollapsed ? new Set(entries.map((en) => en.id)) : new Set(),
      );
    } else {
      toggleCollapse(id);
    }
  }

  function toggleAll() {
    if (!entries) return;
    setCollapsedIds(
      allCollapsed ? new Set() : new Set(entries.map((e) => e.id)),
    );
  }

  function addColumnsEntry(firstType: ColumnType) {
    createEntry.mutate({
      kind: "columns",
      columns: [
        { id: crypto.randomUUID(), type: firstType, label: "", value: "" },
      ],
      sortOrder: entries?.length ?? 0,
    });
  }
  function addTextEntry() {
    createEntry.mutate({
      kind: "text",
      text: "",
      sortOrder: entries?.length ?? 0,
    });
  }

  return (
    <div className="space-y-3">
      {entries && entries.length > 0 && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={toggleAll}>
            {allCollapsed ? "Alle ausklappen" : "Alle einklappen"}
          </Button>
        </div>
      )}

      {isLoading && <p className="text-muted-foreground">Lädt…</p>}

      {entries?.map((entry) => (
        <EntryRow
          key={entry.id}
          sessionId={sessionId}
          entry={entry}
          onDelete={() => deleteEntry.mutate(entry.id)}
          collapsed={collapsedIds.has(entry.id)}
          onToggleCollapse={(e) => handleToggle(entry.id, e)}
        />
      ))}

      <NewEntryPicker onPickColumn={addColumnsEntry} onPickText={addTextEntry}>
        <Button variant="outline">
          <PlusIcon className="size-4" /> Neuer Eintrag
        </Button>
      </NewEntryPicker>
    </div>
  );
}

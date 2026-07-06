import { useMemo, useState } from "react";
import {
  CaretDownIcon,
  CaretUpDownIcon,
  CaretUpIcon,
} from "@phosphor-icons/react";

import { TableHead } from "@/components/ui/table";

export type SortDir = "asc" | "desc";
export type SortState = { key: string; dir: SortDir } | null;

export function useTableSort<T>(
  rows: T[] | undefined,
  getValue: (row: T, key: string) => string | number | null,
  initial: SortState = null,
) {
  const [sort, setSort] = useState<SortState>(initial);

  function toggle(key: string) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null; // third click clears sorting
    });
  }

  const sorted = useMemo(() => {
    if (!rows || !sort) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = getValue(a, sort.key);
      const bv = getValue(b, sort.key);
      if (av == null && bv == null) return 0;
      if (av == null) return 1; // nulls always last
      if (bv == null) return -1;
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv), "de", { numeric: true });
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sort, getValue]);

  return { sorted, sort, toggle };
}

export function SortableHead({
  label,
  sortKey,
  sort,
  onToggle,
  className,
}: {
  label: string;
  sortKey: string;
  sort: SortState;
  onToggle: (key: string) => void;
  className?: string;
}) {
  const active = sort?.key === sortKey;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onToggle(sortKey)}
        className="inline-flex select-none items-center gap-1 hover:text-foreground"
      >
        {label}
        {active ? (
          sort?.dir === "asc" ? (
            <CaretUpIcon className="size-3" />
          ) : (
            <CaretDownIcon className="size-3" />
          )
        ) : (
          <CaretUpDownIcon className="size-3 opacity-40" />
        )}
      </button>
    </TableHead>
  );
}

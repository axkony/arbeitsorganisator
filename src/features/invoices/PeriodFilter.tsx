import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  addQuarters,
  addYears,
  format,
  parseISO,
  startOfMonth,
  startOfQuarter,
  startOfYear,
} from "date-fns";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import type { Period } from "./invoices.api";

export function PeriodFilter({ onChange }: { onChange: (p: Period) => void }) {
  const [preset, setPreset] = useState("year");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const period = useMemo<Period>(() => {
    const now = new Date();
    const f = (d: Date) => format(d, "yyyy-MM-dd");
    switch (preset) {
      case "month":
        return {
          from: f(startOfMonth(now)),
          to: f(startOfMonth(addMonths(now, 1))),
        };
      case "quarter":
        return {
          from: f(startOfQuarter(now)),
          to: f(startOfQuarter(addQuarters(now, 1))),
        };
      case "year":
        return {
          from: f(startOfYear(now)),
          to: f(startOfYear(addYears(now, 1))),
        };
      case "custom":
        return {
          from: customFrom ? f(parseISO(customFrom)) : undefined,
          to: customTo ? f(addDays(parseISO(customTo), 1)) : undefined,
        };
      default:
        return {};
    }
  }, [preset, customFrom, customTo]);

  useEffect(() => {
    onChange(period);
  }, [period, onChange]);

  return (
    <div className="flex items-center gap-2">
      <Select value={preset} onValueChange={setPreset}>
        <SelectTrigger className="w-[170px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="month">Dieser Monat</SelectItem>
          <SelectItem value="quarter">Dieses Quartal</SelectItem>
          <SelectItem value="year">Dieses Jahr</SelectItem>
          <SelectItem value="all">Alle</SelectItem>
          <SelectItem value="custom">Benutzerdefiniert</SelectItem>
        </SelectContent>
      </Select>
      {preset === "custom" && (
        <>
          <DateTimePicker
            value={customFrom}
            onChange={setCustomFrom}
            placeholder="Von"
          />
          <DateTimePicker
            value={customTo}
            onChange={setCustomTo}
            placeholder="Bis"
          />
        </>
      )}
    </div>
  );
}

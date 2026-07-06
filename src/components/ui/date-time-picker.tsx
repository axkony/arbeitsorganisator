import * as React from "react";
import { format, parse } from "date-fns";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const DATE_FMT = "yyyy-MM-dd";

type DateTimePickerProps = {
  value: string;
  onChange: (value: string) => void;
  withTime?: boolean;
  id?: string;
  placeholder?: string;
  fromYear?: number;
  toYear?: number;
  "aria-invalid"?: boolean;
};

// Parse the stored string ("yyyy-MM-dd" or "yyyy-MM-ddTHH:mm") into the
// calendar's Date + the time field's "HH:mm".
function parseValue(value: string, withTime: boolean) {
  if (!value) {
    return {
      date: undefined as Date | undefined,
      time: withTime ? "09:00" : "",
    };
  }
  const [datePart, timePart] = value.split("T");
  const parsed = datePart ? parse(datePart, DATE_FMT, new Date()) : undefined;
  const date = parsed && !Number.isNaN(parsed.getTime()) ? parsed : undefined;
  return { date, time: withTime ? timePart?.slice(0, 5) || "09:00" : "" };
}

export function DateTimePicker({
  value,
  onChange,
  withTime = false,
  id,
  placeholder = "Datum wählen",
  fromYear = 1920,
  toYear = new Date().getFullYear() + 5,
  "aria-invalid": ariaInvalid,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const { date, time } = parseValue(value, withTime);

  // Recombine date + time back into the stored string format.
  function emit(nextDate: Date | undefined, nextTime: string) {
    if (!nextDate) {
      onChange("");
      return;
    }
    const datePart = format(nextDate, DATE_FMT);
    onChange(withTime ? `${datePart}T${nextTime || "09:00"}` : datePart);
  }

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            id={id}
            aria-invalid={ariaInvalid}
            className={cn(
              "flex-1 justify-start font-normal",
              !date && "text-muted-foreground",
            )}
          >
            {date ? format(date, "dd.MM.yyyy") : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            defaultMonth={date}
            captionLayout="dropdown"
            startMonth={new Date(fromYear, 0)}
            endMonth={new Date(toYear, 11)}
            onSelect={(d) => {
              emit(d, time);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>

      {withTime && (
        <Input
          type="time"
          aria-invalid={ariaInvalid}
          value={time}
          onChange={(e) => emit(date ?? new Date(), e.target.value)}
          className="w-28"
        />
      )}
    </div>
  );
}

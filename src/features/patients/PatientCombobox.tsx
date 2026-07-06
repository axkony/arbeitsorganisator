import * as React from "react";
import { CaretUpDown, Check } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { usePatients } from "./patients.hooks";

type Props = {
  value: string; // patient id as string ("" = none selected)
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  "aria-invalid"?: boolean;
  renderMeta?: (patientId: number) => React.ReactNode;
};

export function PatientCombobox({
  value,
  onChange,
  id,
  placeholder = "Patient auswählen",
  "aria-invalid": ariaInvalid,
  renderMeta,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const { data: patients } = usePatients();
  const selected = patients?.find((p) => String(p.id) === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={ariaInvalid}
          id={id}
          className="w-full justify-between font-normal"
        >
          {selected ? (
            `${selected.lastName}, ${selected.firstName}`
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <CaretUpDown className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Patient suchen…" />
          <CommandList>
            <CommandEmpty>Kein Patient gefunden.</CommandEmpty>
            <CommandGroup>
              {patients?.map((p) => {
                const label = `${p.lastName}, ${p.firstName}`;
                return (
                  <CommandItem
                    key={p.id}
                    value={label}
                    onSelect={() => {
                      onChange(String(p.id));
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "size-4",
                        String(p.id) === value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="flex-1 truncate">{label}</span>
                    {renderMeta?.(p.id)}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
  group?: string;
}

export function Combobox({
  name,
  options,
  defaultValue,
  placeholder = "Select…",
  emptyText = "No results.",
  required,
}: {
  name: string;
  options: ComboboxOption[];
  defaultValue?: string | null;
  placeholder?: string;
  emptyText?: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(defaultValue ?? "");
  const selected = options.find((o) => o.value === value);
  const groups = Array.from(new Set(options.map((o) => o.group ?? "")));

  return (
    <>
      <input type="hidden" name={name} value={value} required={required} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
            {selected ? selected.label : <span className="text-muted-foreground">{placeholder}</span>}
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput placeholder="Type to search…" />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              {groups.map((group) => (
                <CommandGroup key={group || "_"} heading={group || undefined}>
                  {options
                    .filter((o) => (o.group ?? "") === group)
                    .map((o) => (
                      <CommandItem
                        key={o.value}
                        value={`${o.label} ${o.value}`}
                        onSelect={() => {
                          setValue(o.value === value ? "" : o.value);
                          setOpen(false);
                        }}
                      >
                        <Check className={cn("mr-2 size-4", value === o.value ? "opacity-100" : "opacity-0")} />
                        {o.label}
                      </CommandItem>
                    ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
}

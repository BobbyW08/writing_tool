"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function LocationSelect({
  name,
  defaultValue,
  options,
}: {
  name: string;
  defaultValue: string | null;
  options: { id: string; name: string }[];
}) {
  return (
    <Select name={name} defaultValue={defaultValue ?? undefined}>
      <SelectTrigger className="w-72">
        <SelectValue placeholder="No location" />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

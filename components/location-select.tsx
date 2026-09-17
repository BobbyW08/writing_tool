"use client";

import { Combobox } from "@/components/combobox";

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
    <Combobox
      name={name}
      defaultValue={defaultValue}
      placeholder="No location"
      emptyText="No locations found."
      options={options.map((o) => ({ value: o.id, label: o.name }))}
    />
  );
}

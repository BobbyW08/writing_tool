"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ENTITY_TYPES } from "@/lib/data/entity-types";

export function TypeSelect({ name, defaultValue }: { name: string; defaultValue: string }) {
  return (
    <Select name={name} defaultValue={defaultValue}>
      <SelectTrigger className="w-56">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ENTITY_TYPES.map((t) => (
          <SelectItem key={t.dbType} value={t.dbType}>
            {t.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

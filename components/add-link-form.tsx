"use client";

import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export interface PickerOption {
  id: string;
  name: string;
  group: string;
}

export function AddLinkForm({
  action,
  options,
  targetFieldName,
  labelFieldName,
  labelPlaceholder,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  options: PickerOption[];
  targetFieldName: string;
  labelFieldName?: string;
  labelPlaceholder?: string;
  submitLabel: string;
}) {
  const groups = Array.from(new Set(options.map((o) => o.group)));

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <Select name={targetFieldName} required>
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Choose one…" />
        </SelectTrigger>
        <SelectContent>
          {groups.map((group) => (
            <SelectGroup key={group}>
              <SelectLabel>{group}</SelectLabel>
              {options
                .filter((o) => o.group === group)
                .map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
      {labelFieldName && <Input name={labelFieldName} placeholder={labelPlaceholder} className="w-48" />}
      <Button type="submit" size="sm" variant="outline">
        <Plus className="size-4" /> {submitLabel}
      </Button>
    </form>
  );
}

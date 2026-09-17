"use client";

import { Combobox } from "@/components/combobox";
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
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <div className="w-64">
        <Combobox
          name={targetFieldName}
          required
          placeholder="Choose one…"
          emptyText="No matches."
          options={options.map((o) => ({ value: o.id, label: o.name, group: o.group }))}
        />
      </div>
      {labelFieldName && <Input name={labelFieldName} placeholder={labelPlaceholder} className="w-48" />}
      <Button type="submit" size="sm" variant="outline">
        <Plus className="size-4" /> {submitLabel}
      </Button>
    </form>
  );
}

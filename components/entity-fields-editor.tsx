"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X, Plus } from "lucide-react";

interface FieldRow {
  key: string;
  value: string;
}

export function EntityFieldsEditor({ initialFields }: { initialFields: Record<string, string> }) {
  const [rows, setRows] = useState<FieldRow[]>(() => Object.entries(initialFields).map(([key, value]) => ({ key, value })));

  const asJson = JSON.stringify(Object.fromEntries(rows.filter((r) => r.key.trim()).map((r) => [r.key.trim(), r.value])));

  return (
    <div className="space-y-4">
      <input type="hidden" name="fields" value={asJson} />
      {rows.map((row, i) => (
        <div key={i} className="space-y-1 rounded-md border p-3">
          <div className="flex items-center gap-2">
            <Label className="sr-only">Field name</Label>
            <Input
              value={row.key}
              placeholder="Field name (e.g. Origin)"
              className="font-medium"
              onChange={(e) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, key: e.target.value } : r)))}
            />
            <Button type="button" variant="ghost" size="icon" onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))} aria-label="Remove field">
              <X className="size-4" />
            </Button>
          </div>
          <Textarea
            value={row.value}
            placeholder="Value"
            rows={3}
            onChange={(e) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, value: e.target.value } : r)))}
          />
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => setRows((rs) => [...rs, { key: "", value: "" }])}>
        <Plus className="size-4" /> Add field
      </Button>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createEraAction } from "@/lib/world/actions";
import { EditableField } from "@/components/editable-field";
import { DeleteRecordButton } from "@/components/delete-record-button";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";

export interface EraRow {
  id: number;
  code: string;
  name: string;
  startYear: number | null;
  endYear: number | null;
  yearLabel: string | null;
  color: string | null;
  kind: string;
}

const KIND_OPTIONS = [
  { label: "Era", value: "era" },
  { label: "Age", value: "age" },
  { label: "Period", value: "period" },
];

export function EraManager({ eras }: { eras: EraRow[] }) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [startYear, setStartYear] = useState("");
  const [endYear, setEndYear] = useState("");
  const [color, setColor] = useState("#6b7280");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    setError("");
    const result = await createEraAction({
      name: name.trim(),
      startYear: startYear === "" ? null : Number(startYear),
      endYear: endYear === "" ? null : Number(endYear),
      yearLabel: null,
      color,
      kind: "era",
      parentId: null,
    });
    setAdding(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setName("");
    setStartYear("");
    setEndYear("");
    router.refresh();
  }

  return (
    <div className="rounded-md border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-semibold"
      >
        <span>Eras ({eras.length})</span>
        {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>

      {open && (
        <div className="space-y-3 border-t p-3">
          {eras.length === 0 && (
            <p className="text-sm text-muted-foreground">No eras yet. The timeline draws era bands from this list.</p>
          )}
          <ul className="space-y-2">
            {eras.map((era) => (
              <li key={era.id} className="flex flex-wrap items-center gap-3 rounded border p-2 text-sm">
                <span
                  className="inline-block size-3 shrink-0 rounded-full border"
                  style={{ backgroundColor: era.color ?? "var(--color-muted)" }}
                />
                <span className="font-mono text-xs text-muted-foreground">{era.code}</span>
                <div className="min-w-32 flex-1">
                  <EditableField collection="eras" docId={era.id} fieldName="name" value={era.name} kind="text" />
                </div>
                <div className="w-20">
                  <EditableField collection="eras" docId={era.id} fieldName="startYear" value={era.startYear} kind="number" placeholder="start" />
                </div>
                <div className="w-20">
                  <EditableField collection="eras" docId={era.id} fieldName="endYear" value={era.endYear} kind="number" placeholder="end" />
                </div>
                <div className="w-28">
                  <EditableField collection="eras" docId={era.id} fieldName="kind" value={era.kind} kind="select" options={KIND_OPTIONS} />
                </div>
                <input
                  type="color"
                  defaultValue={era.color ?? "#6b7280"}
                  onChange={async (e) => {
                    const { updateFieldAction } = await import("@/lib/world/actions");
                    await updateFieldAction("eras", era.id, "color", e.target.value);
                    router.refresh();
                  }}
                  className="size-6 rounded border"
                  title="Band color"
                />
                <DeleteRecordButton collection="eras" id={era.id} code={era.code} name={era.name} onDeleted={() => router.refresh()} />
              </li>
            ))}
          </ul>

          <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2 border-t pt-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. The Second Age"
                className="w-48 rounded border bg-background px-2 py-1 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Start year</label>
              <input
                type="number"
                value={startYear}
                onChange={(e) => setStartYear(e.target.value)}
                className="w-24 rounded border bg-background px-2 py-1 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">End year</label>
              <input
                type="number"
                value={endYear}
                onChange={(e) => setEndYear(e.target.value)}
                className="w-24 rounded border bg-background px-2 py-1 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Color</label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="size-8 rounded border"
              />
            </div>
            <Button type="submit" size="sm" disabled={adding || !name.trim()}>
              <Plus className="size-4" /> {adding ? "Adding..." : "Add era"}
            </Button>
          </form>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}

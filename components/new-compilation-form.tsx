"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createEntityAction } from "@/lib/world/actions";

const KIND_OPTIONS: { value: string; label: string }[] = [
  { value: "age", label: "Age" },
  { value: "chapter", label: "Chapter" },
  { value: "custom", label: "Custom" },
];

export function NewCompilationForm() {
  const [name, setName] = useState("");
  const [kind, setKind] = useState("custom");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError("");
    const result = await createEntityAction("compilations", { name: name.trim(), kind });
    setCreating(false);
    if (result.error || !result.code) {
      setError(result.error ?? "Failed to create compilation");
      return;
    }
    router.push(`/compilations/${result.code}`);
  }

  return (
    <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-2 rounded-md border p-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. The Age of Embers"
          className="w-56 rounded border bg-background px-2 py-1 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Kind</label>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="rounded border bg-background px-2 py-1 text-sm"
        >
          {KIND_OPTIONS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
        </select>
      </div>
      <button type="submit" disabled={creating || !name.trim()} className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50">
        {creating ? "Creating..." : "New compilation"}
      </button>
      {error && <p className="w-full text-sm text-destructive">{error}</p>}
    </form>
  );
}

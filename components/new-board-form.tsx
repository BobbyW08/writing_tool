"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createEntityAction } from "@/lib/world/actions";

const KIND_OPTIONS = [
  { value: "node_map", label: "Node map" },
  { value: "content_tree", label: "Content tree" },
  { value: "family_tree", label: "Family tree" },
  { value: "causal_tree", label: "Causal tree" },
  { value: "story_map", label: "Story map" },
  { value: "whiteboard", label: "Whiteboard" },
];

export function NewBoardForm() {
  const [name, setName] = useState("");
  const [kind, setKind] = useState("node_map");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError("");
    const result = await createEntityAction("boards", { name: name.trim(), kind });
    setCreating(false);
    if (result.error || !result.code) {
      setError(result.error ?? "Failed to create board");
      return;
    }
    router.push(`/boards/${result.code}`);
  }

  return (
    <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-2 rounded-md border p-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. The Asharan family tree"
          className="w-56 rounded border bg-background px-2 py-1 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Kind</label>
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="h-[30px] rounded border bg-background px-2 text-sm">
          {KIND_OPTIONS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
        </select>
      </div>
      <button type="submit" disabled={creating || !name.trim()} className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50">
        {creating ? "Creating..." : "New board"}
      </button>
      {error && <p className="w-full text-sm text-destructive">{error}</p>}
    </form>
  );
}

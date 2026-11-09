"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateEventPinsAction, resolveEntryForLinkAction } from "@/lib/world/actions";

export type EventPinRef = { id: number; code: string; name: string; mapId: number; map: { code: string; name: string } | null };

export function EventPinsEditor({ eventId, pins }: { eventId: number; pins: EventPinRef[] }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  async function handleAdd() {
    if (!code.trim()) return;
    const resolved = await resolveEntryForLinkAction(code.trim());
    if (!resolved || resolved.collection !== "map-pins") { setError(`No map pin found for "${code}"`); return; }
    if (pins.some(p => p.id === resolved.entryId)) { setCode(""); return; }
    const next = [...pins.map(p => p.id), resolved.entryId];
    await updateEventPinsAction(eventId, next);
    setCode(""); setError("");
    router.refresh();
  }

  async function handleRemove(pinId: number) {
    const next = pins.filter(p => p.id !== pinId).map(p => p.id);
    await updateEventPinsAction(eventId, next);
    router.refresh();
  }

  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pins (where this happened)</p>
      {pins.length > 0 && (
        <ul className="space-y-0.5">
          {pins.map(p => (
            <li key={p.id} className="flex items-center justify-between gap-1 text-sm">
              <span>
                {p.name}
                {p.map && <> on <Link href={`/maps/${p.map.code}?pin=${p.code}`} className="text-blue-600 hover:underline">{p.map.name}</Link></>}
              </span>
              <button onClick={() => handleRemove(p.id)} className="text-xs text-muted-foreground hover:text-destructive">×</button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-1">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Pin code or name"
          className="w-48 rounded border bg-background px-2 py-1 text-xs"
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
        />
        <button onClick={handleAdd} className="rounded border px-2 py-1 text-xs">Add</button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

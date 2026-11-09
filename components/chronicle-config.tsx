"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateFieldAction, resolveEntryForLinkAction, resolveCodeForDisplayAction } from "@/lib/world/actions";

type MapPeriod = {
  mapId: number;
  fromYear: number | null;
  toYear: number | null;
  isDefault: boolean;
  map: { code: string; name: string } | null;
};

export function MapPeriodsEditor({ chronicleId, periods }: { chronicleId: number; periods: MapPeriod[] }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [fromYear, setFromYear] = useState("");
  const [toYear, setToYear] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState("");

  function plain(list: MapPeriod[]) {
    return list.map(p => ({ mapId: p.mapId, fromYear: p.fromYear, toYear: p.toYear, isDefault: p.isDefault }));
  }

  async function handleAdd() {
    if (!code.trim()) return;
    const resolved = await resolveEntryForLinkAction(code.trim());
    if (!resolved || resolved.collection !== "maps") { setError(`No map found for "${code}"`); return; }
    const next = [
      ...plain(periods),
      { mapId: resolved.entryId, fromYear: fromYear ? Number(fromYear) : null, toYear: toYear ? Number(toYear) : null, isDefault },
    ];
    await updateFieldAction("chronicles", chronicleId, "mapPeriods", next);
    setCode(""); setFromYear(""); setToYear(""); setIsDefault(false); setError("");
    router.refresh();
  }

  async function handleRemove(mapId: number) {
    const next = plain(periods.filter(p => p.mapId !== mapId));
    await updateFieldAction("chronicles", chronicleId, "mapPeriods", next);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase text-muted-foreground">Map periods</p>
      {periods.length > 0 && (
        <ul className="space-y-1">
          {periods.map(p => (
            <li key={p.mapId} className="flex items-center justify-between gap-2 text-sm">
              <span>
                {p.map ? <Link href={`/maps/${p.map.code}`} className="text-blue-600 hover:underline">{p.map.name}</Link> : "Unknown map"}{" "}
                <span className="text-xs text-muted-foreground">
                  (Year {p.fromYear ?? "?"} to {p.toYear ?? "?"}{p.isDefault ? ", default" : ""})
                </span>
              </span>
              <button onClick={() => handleRemove(p.mapId)} className="text-xs text-muted-foreground hover:text-destructive">×</button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Map code" className="w-28 rounded border bg-background px-2 py-1 text-xs" />
        <input type="number" value={fromYear} onChange={(e) => setFromYear(e.target.value)} placeholder="From year" className="w-24 rounded border bg-background px-2 py-1 text-xs" />
        <input type="number" value={toYear} onChange={(e) => setToYear(e.target.value)} placeholder="To year" className="w-24 rounded border bg-background px-2 py-1 text-xs" />
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} /> Default
        </label>
        <button onClick={handleAdd} className="rounded border px-2 py-1 text-xs">Add</button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

type EraRef = { id: number; code: string; name: string };

export function ChronicleErasEditor({ chronicleId, eras }: { chronicleId: number; eras: EraRef[] }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  async function handleAdd() {
    if (!code.trim()) return;
    const resolved = await resolveEntryForLinkAction(code.trim());
    if (!resolved || resolved.collection !== "eras") { setError(`No era found for "${code}"`); return; }
    const next = [...new Set([...eras.map(e => e.id), resolved.entryId])];
    await updateFieldAction("chronicles", chronicleId, "eraIds", next);
    setCode(""); setError("");
    router.refresh();
  }

  async function handleRemove(id: number) {
    const next = eras.filter(e => e.id !== id).map(e => e.id);
    await updateFieldAction("chronicles", chronicleId, "eraIds", next);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase text-muted-foreground">Eras shown on the strip</p>
      {eras.length > 0 && (
        <ul className="flex flex-wrap gap-1">
          {eras.map(e => (
            <li key={e.id} className="flex items-center gap-1 rounded border px-2 py-0.5 text-xs">
              {e.name}
              <button onClick={() => handleRemove(e.id)} className="text-muted-foreground hover:text-destructive">×</button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-1">
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Era code" className="w-28 rounded border bg-background px-2 py-1 text-xs" />
        <button onClick={handleAdd} className="rounded border px-2 py-1 text-xs">Add</button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

const WORLD_COLLECTIONS = [
  { value: "characters", label: "Characters" },
  { value: "locations", label: "Locations" },
  { value: "items", label: "Items" },
  { value: "cultures", label: "Cultures" },
  { value: "factions", label: "Factions" },
  { value: "races", label: "Races" },
  { value: "languages", label: "Languages" },
  { value: "lore", label: "Lore" },
];

export type ChronicleFilter = { collections: string[]; tagIds: number[]; involvesCodes: string[] };

export function ChronicleFilterEditor({ chronicleId, filter }: { chronicleId: number; filter: ChronicleFilter }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  async function toggleCollection(value: string) {
    const next = filter.collections.includes(value)
      ? filter.collections.filter(c => c !== value)
      : [...filter.collections, value];
    await updateFieldAction("chronicles", chronicleId, "filter", { ...filter, collections: next });
    router.refresh();
  }

  async function handleAddInvolves() {
    if (!code.trim()) return;
    const resolved = await resolveCodeForDisplayAction(code.trim());
    if (!resolved) { setError(`No entry found for "${code}"`); return; }
    if (filter.involvesCodes.includes(resolved.code)) { setCode(""); return; }
    const next = [...filter.involvesCodes, resolved.code];
    await updateFieldAction("chronicles", chronicleId, "filter", { ...filter, involvesCodes: next });
    setCode(""); setError("");
    router.refresh();
  }

  async function handleRemoveInvolves(entryCode: string) {
    const next = filter.involvesCodes.filter(c => c !== entryCode);
    await updateFieldAction("chronicles", chronicleId, "filter", { ...filter, involvesCodes: next });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase text-muted-foreground">Filter which events appear</p>
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Only show events involving these collections</p>
        <div className="flex flex-wrap gap-2">
          {WORLD_COLLECTIONS.map(c => (
            <label key={c.value} className="flex items-center gap-1 text-xs">
              <input type="checkbox" checked={filter.collections.includes(c.value)} onChange={() => toggleCollection(c.value)} />
              {c.label}
            </label>
          ))}
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Only show events involving these specific entries</p>
        {filter.involvesCodes.length > 0 && (
          <ul className="flex flex-wrap gap-1">
            {filter.involvesCodes.map(c => (
              <li key={c} className="flex items-center gap-1 rounded border px-2 py-0.5 text-xs">
                {c}
                <button onClick={() => handleRemoveInvolves(c)} className="text-muted-foreground hover:text-destructive">×</button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-1">
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code or name" className="w-40 rounded border bg-background px-2 py-1 text-xs" />
          <button onClick={handleAddInvolves} className="rounded border px-2 py-1 text-xs">Add</button>
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

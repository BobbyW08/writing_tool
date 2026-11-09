"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select";
import { getConvergenceGraphAction, type ConvergenceGraphResult } from "@/lib/convergence/actions";

export interface ConvergenceCandidate {
  code: string;
  name: string;
  collection: string;
}

const COLLECTION_LABELS: Record<string, string> = {
  characters: "Characters", locations: "Locations", items: "Items", factions: "Factions",
  cultures: "Cultures", races: "Races", languages: "Languages", lore: "Lore",
};

const LINE_COLORS = ["#2563eb", "#dc2626", "#059669", "#d97706", "#7c3aed", "#db2777", "#0891b2", "#65a30d"];

function hrefFor(collection: string, code: string): string {
  return `/${collection}/${code}`;
}

export function ConvergenceView({ candidates }: { candidates: ConvergenceCandidate[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<ConvergenceGraphResult | null>(null);
  const [loading, setLoading] = useState(false);

  const options: MultiSelectOption[] = useMemo(
    () => candidates.map(c => ({ value: c.code, label: c.name, group: COLLECTION_LABELS[c.collection] ?? c.collection })),
    [candidates],
  );
  const nameOf = useMemo(() => new Map(candidates.map(c => [c.code, c.name])), [candidates]);
  const collectionOf = useMemo(() => new Map(candidates.map(c => [c.code, c.collection])), [candidates]);

  useEffect(() => {
    if (selected.length < 2) {
      setResult(null);
      return;
    }
    setLoading(true);
    getConvergenceGraphAction(selected).then((r) => {
      setResult(r);
      setLoading(false);
    });
  }, [selected]);

  return (
    <div className="rounded-md border p-3 space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Multi-lane convergence view</h2>
        <p className="text-xs text-muted-foreground">
          Pick two or more entries. Their lines braid together at any event whose &quot;involves&quot; names two or more of them.
        </p>
      </div>

      <MultiSelect
        options={options}
        selected={selected}
        onChange={setSelected}
        placeholder="Pick entries to compare..."
      />

      {loading && <p className="text-sm text-muted-foreground">Laying out...</p>}
      {result?.error && <p className="text-sm text-muted-foreground italic">{result.error}</p>}

      {result?.paths && result.characters && (
        <div className="space-y-2">
          <svg viewBox={`0 0 ${result.width} ${result.height}`} className="w-full rounded border bg-muted/20" style={{ height: result.height }}>
            {result.paths.map((d, i) => (
              <path key={result.characters![i]} d={d} fill="none" stroke={LINE_COLORS[i % LINE_COLORS.length]} strokeWidth={3} strokeLinecap="round" />
            ))}
          </svg>
          <div className="flex flex-wrap gap-3 text-xs">
            {result.characters.map((code, i) => (
              <Link key={code} href={hrefFor(collectionOf.get(code) ?? "characters", code)} className="flex items-center gap-1.5 hover:underline">
                <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: LINE_COLORS[i % LINE_COLORS.length] }} />
                {nameOf.get(code) ?? code}
              </Link>
            ))}
          </div>
          {result.points && result.points.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Converges at:{" "}
              {result.points.map((p, i) => (
                <span key={p.eventCode}>
                  {i > 0 && ", "}
                  <Link href={`/events/${p.eventCode}`} className="hover:underline">Year {p.year} — {p.eventName}</Link>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

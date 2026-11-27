"use client";

import { type NodeProps } from "@xyflow/react";
import type { ShelfCollection } from "@/lib/world/queries";

export type EntryNodeData = {
  collection: ShelfCollection;
  code: string;
  name: string;
  // The year the box currently sits at on the canvas (its horizontal position, rounded). Never stored
  // itself (hard rule 18): events, stories and items write their own year field on a drag, the rest
  // keep it as a board position only.
  atYear: number;
  // True when the entry has no year of its own yet, so the box shows the dashed "no date" state.
  undated: boolean;
  birthYear: number | null;
  // Step SB5: true while another box is being dragged onto this one, as the merge drop target.
  highlighted?: boolean;
  // Step SB7: "What happens next" idea generation, only meaningful for a story box (a character,
  // location, event, item or lore box has no "next beat" of its own to suggest).
  onSuggest?: (code: string) => void;
};

export const ENTRY_COLLECTION_LABELS: Record<ShelfCollection, string> = {
  characters: "Character",
  locations: "Location",
  events: "Event",
  stories: "Story",
  items: "Item",
  lore: "Lore",
};

function detailLine(d: EntryNodeData): string {
  if (d.collection === "characters") {
    if (d.birthYear == null) return "Age unknown";
    const age = d.atYear - d.birthYear;
    return age < 0 ? `Not born yet at Year ${d.atYear}` : `Age ${age} at Year ${d.atYear}`;
  }
  if (d.undated) return "";
  if (d.collection === "locations") return `Year ${d.atYear}`;
  if (d.collection === "items") return `Made Year ${d.atYear}`;
  return `Year ${d.atYear}`;
}

// Board 5's solid white entry box: type label, name, and the year line that fits the type
// (a character shows an age at the year it sits on, an item its made year, and so on).
export function EntryNode({ data, selected }: NodeProps & { data: EntryNodeData }) {
  const line = detailLine(data);
  const dashed = data.undated && data.collection !== "characters";
  return (
    <div
      className="rounded-md bg-white px-3 py-2 text-xs"
      style={{
        width: 200,
        border: `2px ${dashed ? "dashed" : "solid"} ${data.highlighted ? "#16a34a" : selected ? "#1f6fdc" : "#222"}`,
        boxShadow: data.highlighted ? "0 0 0 3px rgba(22,163,74,0.35), 3px 3px 0 #222" : "3px 3px 0 #222",
      }}
    >
      <div className="mb-0.5 flex items-center justify-between gap-2">
        <span className="font-semibold uppercase tracking-wide text-neutral-500">{ENTRY_COLLECTION_LABELS[data.collection]}</span>
        {dashed && (
          <span className="shrink-0 rounded-full bg-neutral-200 px-1.5 py-0.5 text-[9px] font-medium text-neutral-600">no date</span>
        )}
      </div>
      <p className="break-words text-sm font-bold text-neutral-900">{data.name}</p>
      {line && <p className="mt-1 text-[11px] text-neutral-500">{line}</p>}
      {selected && data.collection === "stories" && data.onSuggest && (
        <button
          type="button"
          className="nodrag nopan mt-1.5 w-full rounded border border-neutral-300 bg-neutral-50 px-1 py-0.5 text-[11px] text-neutral-700 outline-none hover:bg-neutral-100"
          onClick={(e) => { e.stopPropagation(); data.onSuggest!(data.code); }}
        >
          Suggest ideas
        </button>
      )}
    </div>
  );
}

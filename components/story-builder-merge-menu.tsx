"use client";

import { useState } from "react";
import { RELATIONSHIP_TYPES } from "@/lib/relationshipTypes";
import type { MergePairing } from "@/lib/story-builder/merge";

const PLACES_TYPES = RELATIONSHIP_TYPES.filter((t) => t.group === "Places");

// Board 5's "a small menu asks what the merge means, and nothing is written until a choice is
// made" (hard rule 19). One component for all three pairings the Canvas spec names; any other
// dragged-onto pairing is refused before this ever opens (see resolveMergePairing).
export function MergeMenu({
  pairing,
  dropYear,
  saving,
  onClose,
  onGroup,
  onConfirm,
}: {
  pairing: MergePairing;
  dropYear: number;
  saving: boolean;
  onClose: () => void;
  onGroup: () => void;
  onConfirm: (type: string) => void;
}) {
  const [type, setType] = useState<string>(
    pairing.kind === "character-character" ? RELATIONSHIP_TYPES[0].value : PLACES_TYPES[0].value
  );

  return (
    <div className="absolute bottom-3 right-3 z-20 w-72 space-y-2 rounded-md border-2 border-neutral-800 bg-white p-3 text-sm shadow-lg">
      <div className="flex items-center justify-between">
        <span className="font-semibold">Merge</span>
        <button type="button" onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
          Cancel
        </button>
      </div>

      {pairing.kind === "character-character" && (
        <>
          <p className="text-xs text-neutral-600">
            {pairing.a.name} onto {pairing.b.name}, Year {dropYear}
          </p>
          <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded border px-2 py-1 text-sm">
            {RELATIONSHIP_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={onGroup}
              disabled={saving}
              className="rounded border px-2 py-1 text-xs hover:bg-neutral-50 disabled:opacity-50"
            >
              Group on this canvas only
            </button>
            <button
              type="button"
              onClick={() => onConfirm(type)}
              disabled={saving}
              className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground disabled:opacity-50"
            >
              {saving ? "Recording…" : "Record relationship"}
            </button>
          </div>
        </>
      )}

      {pairing.kind === "appears-in" && (
        <>
          <p className="text-xs text-neutral-600">
            Record that {pairing.character.name} appears in {pairing.story.name}, Year {dropYear}?
          </p>
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => onConfirm("appears_in")}
              disabled={saving}
              className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground disabled:opacity-50"
            >
              {saving ? "Recording…" : "Confirm"}
            </button>
          </div>
        </>
      )}

      {pairing.kind === "participated-in" && (
        <>
          <p className="text-xs text-neutral-600">
            Record {pairing.event.name} as one of {pairing.character.name}&apos;s life events, Year {dropYear}?
          </p>
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => onConfirm("participated_in")}
              disabled={saving}
              className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground disabled:opacity-50"
            >
              {saving ? "Recording…" : "Confirm"}
            </button>
          </div>
        </>
      )}

      {pairing.kind === "places" && (
        <>
          <p className="text-xs text-neutral-600">
            {pairing.actor.name} and {pairing.location.name}, Year {dropYear}
          </p>
          <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded border px-2 py-1 text-sm">
            {PLACES_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => onConfirm(type)}
              disabled={saving}
              className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground disabled:opacity-50"
            >
              {saving ? "Recording…" : "Confirm"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  getBoxPopupDataAction, updateEntryNotesAction,
  type BoxPopupData,
} from "@/lib/story-builder/popup-actions";

type Chip = { id: number; name: string };
import {
  addStoryInvolvesAction, removeStoryInvolvesAction,
  addStoryDramatizesAction, removeStoryDramatizesAction,
  resolveEntryForLinkAction, updateFieldAction,
} from "@/lib/world/actions";
import { WritingEditor } from "@/app/(app)/write/[code]/editor";
import { StoryAiPanel } from "@/components/story-builder-ai-panel";

export type BoxPopupTarget =
  | { kind: "entry"; collection: string; code: string; name: string; label: string }
  | { kind: "beat"; code: string; name: string };

// Step SB6: "clicking a box opens a large popup" (plan, "Expanded box popup"), built as a true
// overlay (not a navigated route) so the left menu stays visible-but-dimmed behind it, per that
// section's own instruction -- every other view in this app is a plain route instead.
export function StoryBuilderBoxPopup({ target, onClose }: { target: BoxPopupTarget; onClose: () => void }) {
  const [data, setData] = useState<BoxPopupData | null>(null);

  useEffect(() => {
    setData(null);
    const box = target.kind === "beat" ? { kind: "beat" as const, code: target.code } : { kind: "entry" as const, collection: target.collection, code: target.code };
    getBoxPopupDataAction(box).then(setData);
  }, [target]);

  const title = target.kind === "beat" ? "BEAT" : target.label.toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-5xl flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <span className="text-sm font-semibold">
            <span className="mr-2 text-xs uppercase tracking-wide text-muted-foreground">{title}</span>
            {target.name}
          </span>
          <div className="flex items-center gap-3">
            {data && !("error" in data) && data.kind !== "storyless-beat" && (
              <Link href={data.openFullPageHref} className="text-xs text-blue-600 hover:underline">Open full page</Link>
            )}
            <button type="button" onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!data ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : "error" in data ? (
            <p className="text-sm text-destructive">{data.error}</p>
          ) : data.kind === "storyless-beat" ? (
            <p className="text-sm text-muted-foreground">
              This idea isn&apos;t grouped into a story yet, so there&apos;s nothing to write against. Drag it
              onto another box and merge to group it into a story first.
            </p>
          ) : data.kind === "notes" ? (
            <EntryNotesEditor collection={data.collection} id={data.id} initialBody={data.body} />
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
              <div className="space-y-4">
                <WritingEditor
                  record={data.writing}
                  stories={data.stories}
                  summary={data.summary}
                  codeMap={data.codeMap}
                  history={data.history}
                />
                <StoryAiPanel writingId={data.writing.id} storyId={data.storyId} storyCode={data.storyCode} />
              </div>
              {data.storyQuestions && <StoryQuestionsPanel initial={data.storyQuestions} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// A plain textarea against the entry's own `body` field (hard rule: all editing happens in place,
// no separate edit mode) -- debounced so it saves as Bobby types, same spirit as the Studio editor.
function EntryNotesEditor({ collection, id, initialBody }: { collection: string; id: number; initialBody: string | null }) {
  const [value, setValue] = useState(initialBody ?? "");
  const [saving, setSaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onChange(next: string) {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSaving(true);
      await updateEntryNotesAction(collection, id, next);
      setSaving(false);
    }, 800);
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-muted-foreground">Notes</p>
        <span className="text-xs text-muted-foreground">{saving ? "Saving…" : ""}</span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={16}
        className="w-full rounded-md border p-3 text-sm leading-relaxed"
        placeholder="Freeform notes about this entry..."
      />
    </div>
  );
}

const INVOLVES_LABELS: Record<"characters" | "locations" | "items" | "lore", string> = {
  characters: "Characters", locations: "Locations", items: "Items", lore: "Lore",
};

function InvolvesQuestion({
  storyId, collection, entries,
}: {
  storyId: number;
  collection: "characters" | "locations" | "items" | "lore";
  entries: Chip[];
}) {
  const [list, setList] = useState(entries);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  async function handleAdd() {
    if (!code.trim()) return;
    const resolved = await resolveEntryForLinkAction(code.trim());
    if (!resolved || resolved.collection !== collection) {
      setError(`No ${collection.slice(0, -1)} found for "${code}"`);
      return;
    }
    if (list.some((e) => e.id === resolved.entryId)) { setCode(""); setError(""); return; }
    await addStoryInvolvesAction(storyId, collection, resolved.entryId);
    setList((prev) => [...prev, { id: resolved.entryId, name: resolved.name }]);
    setCode(""); setError("");
  }

  async function handleRemove(entryId: number) {
    await removeStoryInvolvesAction(storyId, collection, entryId);
    setList((prev) => prev.filter((e) => e.id !== entryId));
  }

  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{INVOLVES_LABELS[collection]}</p>
      {list.length > 0 && (
        <ul className="flex flex-wrap gap-1">
          {list.map((e) => (
            <li key={e.id} className="flex items-center gap-1 rounded-full border bg-neutral-50 px-2 py-0.5 text-xs">
              {e.name}
              <button type="button" onClick={() => handleRemove(e.id)} className="text-muted-foreground hover:text-destructive">×</button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-1">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Code or name"
          className="w-full rounded border bg-background px-2 py-1 text-xs"
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
        />
        <button type="button" onClick={handleAdd} className="shrink-0 rounded border px-2 py-1 text-xs">Add</button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function EventsQuestion({ storyId, entries }: { storyId: number; entries: Chip[] }) {
  const [list, setList] = useState(entries);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  async function handleAdd() {
    if (!code.trim()) return;
    const resolved = await resolveEntryForLinkAction(code.trim());
    if (!resolved || resolved.collection !== "events") { setError(`No event found for "${code}"`); return; }
    if (list.some((e) => e.id === resolved.entryId)) { setCode(""); setError(""); return; }
    await addStoryDramatizesAction(storyId, resolved.entryId);
    setList((prev) => [...prev, { id: resolved.entryId, name: resolved.name }]);
    setCode(""); setError("");
  }

  async function handleRemove(eventId: number) {
    await removeStoryDramatizesAction(storyId, eventId);
    setList((prev) => prev.filter((e) => e.id !== eventId));
  }

  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Events</p>
      {list.length > 0 && (
        <ul className="flex flex-wrap gap-1">
          {list.map((e) => (
            <li key={e.id} className="flex items-center gap-1 rounded-full border bg-neutral-50 px-2 py-0.5 text-xs">
              {e.name}
              <button type="button" onClick={() => handleRemove(e.id)} className="text-muted-foreground hover:text-destructive">×</button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-1">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Event code or name"
          className="w-full rounded border bg-background px-2 py-1 text-xs"
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
        />
        <button type="button" onClick={handleAdd} className="shrink-0 rounded border px-2 py-1 text-xs">Add</button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// Step SB6: "Story details" / "Story questions" panel (plan, "Expanded box (popup)"). Themes and
// arc stays hidden until step AR exists, per the plan's own note.
function StoryQuestionsPanel({ initial }: { initial: import("@/lib/story-builder/popup-actions").StoryQuestionsData }) {
  const { storyId } = initial;
  const [startYear, setStartYear] = useState(initial.startYear?.toString() ?? "");
  const [endYear, setEndYear] = useState(initial.endYear?.toString() ?? "");
  const [yearLabel, setYearLabel] = useState(initial.yearLabel ?? "");
  const [summary, setSummary] = useState(initial.summary ?? "");

  async function saveTimeframe() {
    await Promise.all([
      updateFieldAction("stories", storyId, "startYear", startYear.trim() ? Number(startYear) : null),
      updateFieldAction("stories", storyId, "endYear", endYear.trim() ? Number(endYear) : null),
      updateFieldAction("stories", storyId, "yearLabel", yearLabel.trim() || null),
    ]);
  }

  return (
    <div className="space-y-4 rounded-md border bg-neutral-50 p-3">
      <p className="text-sm font-semibold">Story details</p>

      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Timeframe</p>
        <div className="flex gap-1">
          <input value={startYear} onChange={(e) => setStartYear(e.target.value)} onBlur={saveTimeframe} placeholder="Start year" className="w-full rounded border bg-background px-2 py-1 text-xs" />
          <input value={endYear} onChange={(e) => setEndYear(e.target.value)} onBlur={saveTimeframe} placeholder="End year" className="w-full rounded border bg-background px-2 py-1 text-xs" />
        </div>
        <input value={yearLabel} onChange={(e) => setYearLabel(e.target.value)} onBlur={saveTimeframe} placeholder="Or a label, e.g. &quot;Age 150-350&quot;" className="w-full rounded border bg-background px-2 py-1 text-xs" />
      </div>

      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Story (what happens)</p>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          onBlur={() => updateFieldAction("stories", storyId, "summary", summary.trim() || null)}
          rows={4}
          className="w-full rounded border bg-background p-2 text-xs"
        />
      </div>

      <InvolvesQuestion storyId={storyId} collection="characters" entries={initial.characters} />
      <InvolvesQuestion storyId={storyId} collection="locations" entries={initial.locations} />
      <EventsQuestion storyId={storyId} entries={initial.events} />
      <InvolvesQuestion storyId={storyId} collection="items" entries={initial.items} />
      <InvolvesQuestion storyId={storyId} collection="lore" entries={initial.lore} />
    </div>
  );
}

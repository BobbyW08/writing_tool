"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateTimelineSettingsAction } from "@/lib/world/actions";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import type { TimeGap } from "@/lib/timeline-scale";

// Edits timeline_settings.gaps (a singleton jsonb list, lib/world/actions.ts's
// updateTimelineSettingsAction) — each gap squeezes an empty stretch of years down to a few
// pixels on the timeline canvas so a boring 900-year gap doesn't dominate the view.
export function TimelineGapsManager({ gaps }: { gaps: TimeGap[] }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fromYear, setFromYear] = useState("");
  const [toYear, setToYear] = useState("");
  const [collapsedTo, setCollapsedTo] = useState("5");
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function save(next: TimeGap[]) {
    setSaving(true);
    setError("");
    const result = await updateTimelineSettingsAction({ gaps: next });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const from = Number(fromYear);
    const to = Number(toYear);
    const collapsed = Number(collapsedTo);
    if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) {
      setError("End year must be after start year.");
      return;
    }
    if (!Number.isFinite(collapsed) || collapsed < 0 || collapsed > to - from) {
      setError("Collapsed width must be between 0 and the gap's real span.");
      return;
    }
    await save([...gaps, { fromYear: from, toYear: to, collapsedTo: collapsed, label: label.trim() || `${to - from} years skipped` }]);
    setFromYear("");
    setToYear("");
    setCollapsedTo("5");
    setLabel("");
  }

  function handleRemove(i: number) {
    save(gaps.filter((_, idx) => idx !== i));
  }

  return (
    <div className="rounded-md border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-semibold"
      >
        <span>Time gaps ({gaps.length})</span>
        {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>

      {open && (
        <div className="space-y-3 border-t p-3">
          <p className="text-xs text-muted-foreground">
            Squeeze an empty stretch of years down on the canvas so it doesn&apos;t dominate the view. The real year never changes, only where it sits on screen.
          </p>
          {gaps.length === 0 && <p className="text-sm text-muted-foreground">No gaps configured.</p>}
          <ul className="space-y-1.5">
            {gaps.map((g, i) => (
              <li key={i} className="flex items-center gap-3 rounded border p-2 text-sm">
                <span className="flex-1">
                  Year {g.fromYear} &rarr; {g.toYear} <span className="text-muted-foreground">({g.toYear - g.fromYear} years, shown as {g.collapsedTo})</span>
                </span>
                <span className="text-xs text-muted-foreground">{g.label}</span>
                <button type="button" onClick={() => handleRemove(i)} className="rounded p-1 hover:bg-accent" title="Remove gap">
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>

          <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2 border-t pt-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">From year</label>
              <input type="number" value={fromYear} onChange={(e) => setFromYear(e.target.value)} className="w-24 rounded border bg-background px-2 py-1 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">To year</label>
              <input type="number" value={toYear} onChange={(e) => setToYear(e.target.value)} className="w-24 rounded border bg-background px-2 py-1 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Shown as (years)</label>
              <input type="number" value={collapsedTo} onChange={(e) => setCollapsedTo(e.target.value)} className="w-24 rounded border bg-background px-2 py-1 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Label (optional)</label>
              <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. The quiet centuries" className="w-48 rounded border bg-background px-2 py-1 text-sm" />
            </div>
            <Button type="submit" size="sm" disabled={saving || !fromYear || !toYear}>
              <Plus className="size-4" /> {saving ? "Saving..." : "Add gap"}
            </Button>
          </form>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}

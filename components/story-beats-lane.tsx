"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  createBeatAction,
  updateBeatInvolvesAction,
  moveBeatAction,
  promoteBeatToEventAction,
  deleteEntityAction,
  updateFieldAction,
  resolveEntryForLinkAction,
} from "@/lib/world/actions";
import { generateBeatCardsAction } from "@/lib/ai/actions";
import type { BeatCard } from "@/lib/ai/beats";

export type BeatRow = {
  id: number;
  code: string;
  name: string;
  summary: string | null;
  state: string;
  order: number;
  promotedToEventId: number | null;
  promotedEventCode: string | null;
  involves: { collection: string; entryId: number; code: string; name: string }[];
};

const STATE_LABEL: Record<string, string> = { idea: "Idea", planned: "Planned", promoted: "Promoted" };

function BeatCardRow({
  beat,
  isFirst,
  isLast,
  onChanged,
}: {
  beat: BeatRow;
  isFirst: boolean;
  isLast: boolean;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState(beat.summary ?? "");
  const [involveCode, setInvolveCode] = useState("");
  const [pending, startTransition] = useTransition();

  function run(label: string, fn: () => Promise<{ ok: boolean; error?: string } | { ok: boolean; eventCode?: string; error?: string }>) {
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        onChanged();
      } else {
        toast.error(result.error ?? `Could not ${label}.`);
      }
    });
  }

  function saveSummary() {
    run("save summary", () => updateFieldAction("beats", beat.id, "summary", summary));
  }

  async function addInvolve() {
    if (!involveCode.trim()) return;
    const resolved = await resolveEntryForLinkAction(involveCode.trim());
    if (!resolved) {
      toast.error(`No record found for "${involveCode}".`);
      return;
    }
    const next = [...beat.involves.map((i) => ({ relationTo: i.collection, value: i.entryId })), { relationTo: resolved.collection, value: resolved.entryId }];
    setInvolveCode("");
    run("add", () => updateBeatInvolvesAction(beat.id, next));
  }

  function removeInvolve(entryId: number) {
    const next = beat.involves.filter((i) => i.entryId !== entryId).map((i) => ({ relationTo: i.collection, value: i.entryId }));
    run("remove", () => updateBeatInvolvesAction(beat.id, next));
  }

  function promote() {
    startTransition(async () => {
      const result = await promoteBeatToEventAction(beat.id);
      if (result.ok) {
        toast.success("Promoted to an event.");
        onChanged();
      } else {
        toast.error(result.error);
      }
    });
  }

  function remove() {
    run("delete this beat", () => deleteEntityAction("beats", beat.id));
  }

  return (
    <li className="rounded-md border px-4 py-3 text-sm">
      <div className="flex items-start gap-3">
        <div className="flex shrink-0 flex-col gap-0.5 pt-0.5">
          <Button type="button" size="sm" variant="ghost" className="h-5 px-1" disabled={pending || isFirst} onClick={() => run("move up", () => moveBeatAction((beat as unknown as { storyId: number }).storyId, beat.id, "up"))}>
            ↑
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-5 px-1" disabled={pending || isLast} onClick={() => run("move down", () => moveBeatAction((beat as unknown as { storyId: number }).storyId, beat.id, "down"))}>
            ↓
          </Button>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{beat.code}</span>
            <button type="button" className="font-medium hover:underline" onClick={() => setOpen((o) => !o)}>
              {beat.name}
            </button>
            <Badge variant={beat.state === "promoted" ? "secondary" : "outline"}>{STATE_LABEL[beat.state] ?? beat.state}</Badge>
            {beat.promotedEventCode && (
              <Link href={`/events/${beat.promotedEventCode}`} className="text-xs text-muted-foreground hover:underline">
                {beat.promotedEventCode}
              </Link>
            )}
          </div>
          {beat.summary && !open && <p className="mt-1 text-muted-foreground">{beat.summary}</p>}

          {open && (
            <div className="mt-3 space-y-3 border-t pt-3">
              <div>
                <p className="mb-1 text-xs font-semibold text-muted-foreground">Summary</p>
                <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} onBlur={saveSummary} rows={2} disabled={pending} />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-muted-foreground">Involves</p>
                <div className="flex flex-wrap gap-1">
                  {beat.involves.map((i) => (
                    <Badge key={i.entryId + i.collection} variant="outline" className="gap-1">
                      {i.code} {i.name}
                      <button type="button" onClick={() => removeInvolve(i.entryId)} className="ml-1 text-muted-foreground hover:text-foreground">
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="mt-1 flex gap-2">
                  <Input value={involveCode} onChange={(e) => setInvolveCode(e.target.value)} placeholder="C4" disabled={pending} className="h-8 max-w-[120px]" onKeyDown={(e) => e.key === "Enter" && addInvolve()} />
                  <Button type="button" size="sm" variant="outline" disabled={pending} onClick={addInvolve}>
                    Add
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                {beat.state !== "promoted" && (
                  <Button type="button" size="sm" disabled={pending} onClick={promote}>
                    Promote to event
                  </Button>
                )}
                <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={remove}>
                  Delete beat
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

export function StoryBeatsLane({ storyCode, storyId, beats }: { storyCode: string; storyId: number; beats: BeatRow[] }) {
  const router = useRouter();
  const [cards, setCards] = useState<BeatCard[] | null>(null);
  const [pending, startTransition] = useTransition();

  // Keep storyId reachable from BeatCardRow's move buttons without threading it through every row.
  const beatsWithStory = beats.map((b) => ({ ...b, storyId }));

  function suggest() {
    startTransition(async () => {
      const result = await generateBeatCardsAction(storyCode);
      if (result.ok) {
        if (!result.cards?.length) toast.info("No suggestions this time.");
        setCards(result.cards ?? []);
      } else {
        toast.error(result.error);
      }
    });
  }

  function pickCard(card: BeatCard) {
    startTransition(async () => {
      const nextOrder = beats.length ? Math.max(...beats.map((b) => b.order)) + 1 : 0;
      const result = await createBeatAction({ storyId, name: card.name, summary: card.summary, order: nextOrder });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setCards(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {beatsWithStory.length === 0 ? (
        <p className="text-sm text-muted-foreground">No beats planned yet.</p>
      ) : (
        <ul className="space-y-2">
          {beatsWithStory.map((beat, i) => (
            <BeatCardRow
              key={beat.id}
              beat={beat}
              isFirst={i === 0}
              isLast={i === beatsWithStory.length - 1}
              onChanged={() => router.refresh()}
            />
          ))}
        </ul>
      )}

      <Button type="button" variant="outline" disabled={pending} onClick={suggest}>
        Suggest next beats
      </Button>

      {cards && cards.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-3">
          {cards.map((card, i) => (
            <button
              key={i}
              type="button"
              disabled={pending}
              onClick={() => pickCard(card)}
              className="rounded-md border px-3 py-2 text-left text-sm hover:bg-accent"
            >
              <p className="font-medium">{card.name}</p>
              <p className="mt-1 text-muted-foreground">{card.summary}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getTopGapsAction } from "@/lib/gaps/actions";
import type { RankedGap } from "@/lib/gaps/types";

// Step UX1's "Ask AI to recommend a gap" (board 1's home panel, and board 2's type-page panel
// once UX2 reuses this). Only reads (hard rules 1 and 4): nothing here creates or changes a
// record. "Not now" only hides a suggestion for this page view, as the plan specifies.
export function GapRecommender() {
  const [pending, startTransition] = useTransition();
  const [gaps, setGaps] = useState<RankedGap[] | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const ask = () =>
    startTransition(async () => {
      const result = await getTopGapsAction(3);
      setGaps(result);
      setDismissed(new Set());
    });

  const visible = (gaps ?? []).filter((g) => !dismissed.has(g.key));

  return (
    <section className="flex flex-1 min-w-0 flex-col gap-3 rounded-lg border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Not sure where to start?</div>
          <p className="text-sm text-muted-foreground">
            Ranked by how much each gap affects the stories you are writing or have written. It only suggests.
          </p>
        </div>
        <Button type="button" variant="outline" disabled={pending} onClick={ask}>
          Ask AI to recommend a gap
        </Button>
      </div>

      {gaps === null && !pending && (
        <p className="text-xs text-muted-foreground">Nothing fetched yet. Click the button above.</p>
      )}
      {pending && <p className="text-xs text-muted-foreground">Looking for the biggest gaps...</p>}
      {gaps !== null && !pending && visible.length === 0 && (
        <p className="text-xs text-muted-foreground">No open gaps right now, or you dismissed them all for this visit.</p>
      )}

      {visible.length > 0 && (
        <ul className="flex flex-col gap-2">
          {visible.map((g, i) => (
            <li key={g.key} className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 rounded-md border px-3 py-2.5">
              <div className="min-w-[200px] flex-1 basis-0">
                <div className="text-sm">
                  {i + 1}. {g.name}: {g.prompt}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">Why first: {g.whyFirst}</div>
              </div>
              <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">{g.screenLabel}</span>
                <Link href={g.href} className="text-sm font-medium text-blue-500 hover:underline">
                  Work on this
                </Link>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setDismissed((prev) => new Set(prev).add(g.key))}
                >
                  Not now
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { entityHref } from "@/lib/continuity/links";
import {
  acceptReviewWritingSuggestionAction,
  getReviewWritingSuggestionsAction,
} from "@/lib/ai/review-writing-actions";
import {
  listReviewFactsAction,
  resolveReviewFactAction,
  runReviewFactsCheckAction,
} from "@/lib/story-builder/review-actions";
import type { WritingReviewSuggestion } from "@/lib/ai/review-writing";

export type ReviewPiece = {
  id: number;
  code: string;
  name: string;
  wordCount: number;
  canonState: string;
};

export type ReviewFact = {
  code: string;
  kind: string;
  fieldLabel: string;
  existingExcerpt: string | null;
  newQuote: string;
  explanation: string | null;
  entryCollection: string;
  entryId: number;
  entryName: string;
  entrySlug: string;
  writingName: string;
  priority: "high" | "normal";
};

const STATE_LABELS: Record<string, string> = { draft: "Draft", canon: "Canon", set_aside: "Set aside" };

type Tool = "writing" | "facts" | null;

export function ReviewWorkspace({
  storyName,
  pieces,
  initialFacts,
}: {
  storyName: string;
  pieces: ReviewPiece[];
  initialFacts: ReviewFact[];
}) {
  const reviewable = useMemo(() => pieces.filter((p) => p.canonState !== "set_aside" && p.wordCount > 0), [pieces]);
  const [selected, setSelected] = useState<Set<number>>(new Set(reviewable.map((p) => p.id)));
  const [activeTool, setActiveTool] = useState<Tool>(null);
  const [pending, startTransition] = useTransition();

  const [writingSuggestions, setWritingSuggestions] = useState<WritingReviewSuggestion[] | null>(null);
  const [writingDiscarded, setWritingDiscarded] = useState(0);
  const [writingIndex, setWritingIndex] = useState(0);

  const [facts, setFacts] = useState<ReviewFact[]>(initialFacts);
  const [factIndex, setFactIndex] = useState(0);

  const totalWords = pieces.reduce((sum, p) => sum + p.wordCount, 0);
  const selectedIds = useMemo(() => [...selected], [selected]);

  function togglePiece(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function askReviewWriting() {
    setActiveTool("writing");
    startTransition(async () => {
      const result = await getReviewWritingSuggestionsAction(selectedIds);
      if (!result.ok) {
        toast.error(result.error ?? "Could not get suggestions.");
        return;
      }
      setWritingSuggestions(result.suggestions ?? []);
      setWritingDiscarded(result.discarded ?? 0);
      setWritingIndex(0);
      if (!result.suggestions || result.suggestions.length === 0) {
        toast.message("Nothing to suggest right now.");
      }
    });
  }

  function askReviewFacts() {
    setActiveTool("facts");
    startTransition(async () => {
      const ran = await runReviewFactsCheckAction(selectedIds);
      if (!ran.ok) {
        toast.error(ran.error ?? "Could not run the check.");
        return;
      }
      const result = await listReviewFactsAction(selectedIds);
      setFacts(result.flags);
      setFactIndex(0);
    });
  }

  function acceptSuggestion(s: WritingReviewSuggestion) {
    startTransition(async () => {
      const result = await acceptReviewWritingSuggestionAction(s.writingId, s.before, s.after);
      if (!result.ok) {
        toast.error(result.error ?? "Could not apply that edit.");
        return;
      }
      setWritingSuggestions((prev) => (prev ? prev.filter((x) => x !== s) : prev));
      toast.success("Edit applied.");
    });
  }

  function skipSuggestion(s: WritingReviewSuggestion) {
    setWritingSuggestions((prev) => (prev ? prev.filter((x) => x !== s) : prev));
  }

  function resolveFact(f: ReviewFact, choice: "keep_canon" | "update_canon" | "decide_later") {
    startTransition(async () => {
      const result = await resolveReviewFactAction(f, choice);
      if (!result.ok) {
        toast.error(result.error ?? "Could not record that decision.");
        return;
      }
      setFacts((prev) => prev.filter((x) => x.code !== f.code));
      setFactIndex(0);
    });
  }

  const currentSuggestion = writingSuggestions && writingSuggestions.length > 0
    ? writingSuggestions[Math.min(writingIndex, writingSuggestions.length - 1)]
    : null;
  const currentFact = facts.length > 0 ? facts[Math.min(factIndex, facts.length - 1)] : null;

  return (
    <div className="flex flex-col gap-5 lg:flex-row">
      <aside className="flex w-full shrink-0 flex-col gap-2 lg:w-72">
        <div className="text-sm text-muted-foreground">Written so far</div>
        {reviewable.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing here has words yet.</p>
        )}
        {reviewable.map((p) => (
          <label key={p.id} className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm hover:bg-accent/40">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={selected.has(p.id)}
              onChange={() => togglePiece(p.id)}
            />
            <span>
              <span className="block font-medium">{p.name}</span>
              <span className="block text-xs text-muted-foreground">
                {p.wordCount.toLocaleString()} words, {STATE_LABELS[p.canonState] ?? p.canonState}
              </span>
            </span>
          </label>
        ))}
        <p className="text-xs text-muted-foreground">Review the whole story, or tick a piece.</p>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={askReviewWriting}
            disabled={pending || selectedIds.length === 0}
            className={`flex-1 rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              activeTool === "writing" ? "border-blue-600 bg-blue-600 text-white" : "bg-card hover:bg-accent/40"
            }`}
          >
            <span className="block text-base font-bold">Review writing</span>
            <span className={`block text-sm ${activeTool === "writing" ? "text-blue-100" : "text-muted-foreground"}`}>
              Grammar, style, vocabulary and flow in your voice. One suggestion at a time.
            </span>
          </button>
          <button
            type="button"
            onClick={askReviewFacts}
            disabled={pending || selectedIds.length === 0}
            className={`flex-1 rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              activeTool === "facts" ? "border-blue-600 bg-blue-600 text-white" : "bg-card hover:bg-accent/40"
            }`}
          >
            <span className="block text-base font-bold">Review facts</span>
            <span className={`block text-sm ${activeTool === "facts" ? "text-blue-100" : "text-muted-foreground"}`}>
              Checks motivations, promises, dates and places against everything you have written.
            </span>
          </button>
          <Link
            href="/continuity"
            className="flex-1 rounded-xl border bg-card p-4 text-left hover:bg-accent/40"
          >
            <span className="block text-base font-bold">Open continuity inbox</span>
            <span className="block text-sm text-muted-foreground">
              Everything the automatic check logged from this story, with Undo.
            </span>
          </Link>
        </div>

        {activeTool === "writing" && (
          <div className="rounded-xl border bg-card p-4">
            {pending && !writingSuggestions && <p className="text-sm text-muted-foreground">Reading {storyName}&rsquo;s prose&hellip;</p>}
            {writingSuggestions && writingSuggestions.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nothing to suggest right now.
                {writingDiscarded > 0 && ` (${writingDiscarded} possible edit${writingDiscarded === 1 ? "" : "s"} could not be matched back to your exact wording and were skipped.)`}
              </p>
            )}
            {currentSuggestion && (
              <div className="flex flex-col gap-3">
                <div className="text-sm text-muted-foreground">
                  Suggestion {Math.min(writingIndex, writingSuggestions!.length - 1) + 1} of {writingSuggestions!.length}, Review writing
                  <span className="ml-2">&middot; {currentSuggestion.writingName}</span>
                </div>
                <div className="text-sm"><span className="text-muted-foreground">Before:</span> {currentSuggestion.before}</div>
                <div className="text-sm"><span className="text-muted-foreground">After:</span> {currentSuggestion.after}</div>
                <div className="text-xs text-muted-foreground">{currentSuggestion.reason}</div>
                <div className="flex gap-2">
                  <Button size="sm" disabled={pending} onClick={() => acceptSuggestion(currentSuggestion)}>Accept this one</Button>
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => skipSuggestion(currentSuggestion)}>Reject</Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending || writingSuggestions!.length <= 1}
                    onClick={() => setWritingIndex((i) => (i + 1) % writingSuggestions!.length)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTool === "facts" && (
          <div className="rounded-xl border bg-card p-4">
            {pending && <p className="text-sm text-muted-foreground">Checking {storyName} against canon&hellip;</p>}
            {!pending && facts.length === 0 && <p className="text-sm text-muted-foreground">Nothing is waiting for a decision.</p>}
            {!pending && currentFact && (
              <div className="flex flex-col gap-2">
                <div className="text-sm text-muted-foreground">
                  Review facts, {facts.length} item{facts.length === 1 ? "" : "s"} found
                  {currentFact.priority === "high" && <Badge className="ml-2 bg-red-600 text-white hover:bg-red-600">Against Locked canon</Badge>}
                </div>
                <div className="text-sm">
                  <Link href={entityHref(currentFact.entryCollection, currentFact.entrySlug)} className="font-medium hover:underline">
                    {currentFact.entryName}
                  </Link>
                  , {currentFact.fieldLabel}: canon says &ldquo;{currentFact.existingExcerpt ?? "(nothing recorded yet)"}&rdquo;, your writing ({currentFact.writingName}) says &ldquo;{currentFact.newQuote}&rdquo;.
                </div>
                {currentFact.explanation && <div className="text-sm text-muted-foreground">{currentFact.explanation}</div>}
                <div className="mt-1 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => resolveFact(currentFact, "keep_canon")}>Keep canon</Button>
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => resolveFact(currentFact, "update_canon")}>Keep my writing</Button>
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => resolveFact(currentFact, "decide_later")}>Decide later</Button>
                  <Link href={`/continuity/${currentFact.code}`} className="self-center text-xs text-muted-foreground hover:underline">
                    More options (both true, changed over time)
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="rounded-lg border border-dashed border-blue-400 bg-blue-500/5 p-3 text-xs text-blue-700 dark:text-blue-300">
          Only a single sentence edit can ever be shown as text, and only as before and after of your own words. Fact items never change anything until you pick one.
        </div>

        <div className="text-xs text-muted-foreground">{totalWords.toLocaleString()} words in {pieces.length} piece{pieces.length === 1 ? "" : "s"}</div>
      </section>
    </div>
  );
}

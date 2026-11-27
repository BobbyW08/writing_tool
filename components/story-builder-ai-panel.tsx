"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { entityHref } from "@/lib/continuity/links";
import {
  getReviewWritingSuggestionsAction,
  acceptReviewWritingSuggestionAction,
} from "@/lib/ai/review-writing-actions";
import {
  runReviewFactsCheckAction,
  listReviewFactsAction,
  resolveReviewFactAction,
} from "@/lib/story-builder/review-actions";
import { generateBeatCardsAction, askAnythingAction } from "@/lib/ai/actions";
import { acceptBeatCardAction } from "@/lib/story-builder/popup-actions";
import type { WritingReviewSuggestion } from "@/lib/ai/review-writing";
import type { BeatCard } from "@/lib/ai/beats";

// Step SB7's "Review facts" result shape, kept as its own local type rather than importing FlagRow
// (lib/continuity/queries.ts is 'server-only') -- same convention components/review-workspace.tsx
// already established for the same reason.
type ReviewFact = {
  code: string;
  fieldLabel: string;
  existingExcerpt: string | null;
  newQuote: string;
  explanation: string | null;
  entryCollection: string;
  entryId: number;
  entryName: string;
  entrySlug: string;
  priority: "high" | "normal";
};

type Tool = "writing" | "facts" | "next" | "ask" | null;

// Step SB7: the popup's "AI helpers" panel and "AI results" row (plan, "Expanded box (popup)").
// Review writing and Review facts are the exact UX4 lanes (components/review-workspace.tsx),
// reused here scoped to this one writing record instead of a whole-story piece picker. What happens
// next reuses the existing beat-card generator (components/story-beats-lane.tsx's "Suggest next
// beats"), and Ask AI anything is the one built chip from the plan's "more helper ideas" list -- the
// rest stay optional, future additions, per the plan's own wording.
export function StoryAiPanel({ writingId, storyId, storyCode }: { writingId: number; storyId: number; storyCode: string }) {
  const [activeTool, setActiveTool] = useState<Tool>(null);
  const [pending, startTransition] = useTransition();

  const [writingSuggestions, setWritingSuggestions] = useState<WritingReviewSuggestion[] | null>(null);
  const [writingDiscarded, setWritingDiscarded] = useState(0);
  const [writingIndex, setWritingIndex] = useState(0);

  const [facts, setFacts] = useState<ReviewFact[]>([]);
  const [factIndex, setFactIndex] = useState(0);
  const [factsChecked, setFactsChecked] = useState(false);

  const [cards, setCards] = useState<BeatCard[] | null>(null);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);

  function askReviewWriting() {
    setActiveTool("writing");
    startTransition(async () => {
      const result = await getReviewWritingSuggestionsAction([writingId]);
      if (!result.ok) {
        toast.error(result.error ?? "Could not get suggestions.");
        return;
      }
      setWritingSuggestions(result.suggestions ?? []);
      setWritingDiscarded(result.discarded ?? 0);
      setWritingIndex(0);
    });
  }

  function askReviewFacts() {
    setActiveTool("facts");
    startTransition(async () => {
      const ran = await runReviewFactsCheckAction([writingId]);
      if (!ran.ok) {
        toast.error(ran.error ?? "Could not run the check.");
        return;
      }
      const result = await listReviewFactsAction([writingId]);
      setFacts(result.flags as unknown as ReviewFact[]);
      setFactIndex(0);
      setFactsChecked(true);
    });
  }

  function askWhatHappensNext() {
    setActiveTool("next");
    startTransition(async () => {
      const result = await generateBeatCardsAction(storyCode);
      if (!result.ok) {
        toast.error(result.error ?? "Could not get ideas.");
        return;
      }
      if (!result.cards?.length) toast.info("No suggestions this time.");
      setCards(result.cards ?? []);
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

  function pickCard(card: BeatCard) {
    startTransition(async () => {
      const result = await acceptBeatCardAction(storyId, card.name, card.summary);
      if (!result.ok) {
        toast.error(result.error ?? "Could not save that idea.");
        return;
      }
      setCards((prev) => (prev ? prev.filter((c) => c !== card) : prev));
      toast.success(`${card.name} added as a new idea on the canvas.`);
    });
  }

  function askAnything() {
    if (!question.trim()) return;
    setActiveTool("ask");
    startTransition(async () => {
      const result = await askAnythingAction(storyCode, question.trim());
      if (!result.ok) {
        toast.error(result.error ?? "Could not get an answer.");
        return;
      }
      setAnswer(result.answer ?? null);
    });
  }

  const currentSuggestion = writingSuggestions && writingSuggestions.length > 0
    ? writingSuggestions[Math.min(writingIndex, writingSuggestions.length - 1)]
    : null;
  const currentFact = facts.length > 0 ? facts[Math.min(factIndex, facts.length - 1)] : null;

  return (
    <div className="space-y-3 rounded-md border bg-neutral-50 p-3">
      <p className="text-sm font-semibold">AI helpers</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant={activeTool === "writing" ? "default" : "outline"} disabled={pending} onClick={askReviewWriting}>
          Review writing
        </Button>
        <Button type="button" size="sm" variant={activeTool === "facts" ? "default" : "outline"} disabled={pending} onClick={askReviewFacts}>
          Review facts
        </Button>
        <Button type="button" size="sm" variant={activeTool === "next" ? "default" : "outline"} disabled={pending} onClick={askWhatHappensNext}>
          What happens next
        </Button>
      </div>

      <div className="flex gap-1">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask AI anything about this story…"
          className="w-full rounded border bg-background px-2 py-1 text-xs"
          onKeyDown={(e) => { if (e.key === "Enter") askAnything(); }}
        />
        <Button type="button" size="sm" variant="outline" disabled={pending || !question.trim()} onClick={askAnything}>
          Ask
        </Button>
      </div>

      <div className="rounded-md border bg-card p-3 text-sm">
        {activeTool === null && (
          <p className="text-xs text-muted-foreground">Nothing applies until you accept it.</p>
        )}

        {activeTool === "writing" && (
          <>
            {pending && !writingSuggestions && <p className="text-xs text-muted-foreground">Reading this writing&hellip;</p>}
            {writingSuggestions && writingSuggestions.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nothing to suggest right now.
                {writingDiscarded > 0 && ` (${writingDiscarded} possible edit${writingDiscarded === 1 ? "" : "s"} skipped.)`}
              </p>
            )}
            {currentSuggestion && (
              <div className="flex flex-col gap-2">
                <div className="text-xs text-muted-foreground">
                  Suggestion {Math.min(writingIndex, writingSuggestions!.length - 1) + 1} of {writingSuggestions!.length}
                </div>
                <div className="text-xs"><span className="text-muted-foreground">Before:</span> {currentSuggestion.before}</div>
                <div className="text-xs"><span className="text-muted-foreground">After:</span> {currentSuggestion.after}</div>
                <div className="text-xs text-muted-foreground">{currentSuggestion.reason}</div>
                <div className="flex gap-2">
                  <Button size="sm" disabled={pending} onClick={() => acceptSuggestion(currentSuggestion)}>Accept</Button>
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => skipSuggestion(currentSuggestion)}>Reject</Button>
                  <Button
                    size="sm" variant="outline"
                    disabled={pending || writingSuggestions!.length <= 1}
                    onClick={() => setWritingIndex((i) => (i + 1) % writingSuggestions!.length)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {activeTool === "facts" && (
          <>
            {pending && <p className="text-xs text-muted-foreground">Checking against canon&hellip;</p>}
            {!pending && factsChecked && facts.length === 0 && <p className="text-xs text-muted-foreground">Nothing is waiting for a decision.</p>}
            {!pending && currentFact && (
              <div className="flex flex-col gap-2">
                <div className="text-xs text-muted-foreground">
                  {facts.length} item{facts.length === 1 ? "" : "s"} found
                  {currentFact.priority === "high" && <Badge className="ml-2 bg-red-600 text-white hover:bg-red-600">Against Locked canon</Badge>}
                </div>
                <div className="text-xs">
                  <Link href={entityHref(currentFact.entryCollection, currentFact.entrySlug)} className="font-medium hover:underline">
                    {currentFact.entryName}
                  </Link>
                  , {currentFact.fieldLabel}: canon says &ldquo;{currentFact.existingExcerpt ?? "(nothing recorded yet)"}&rdquo;, this writing says &ldquo;{currentFact.newQuote}&rdquo;.
                </div>
                {currentFact.explanation && <div className="text-xs text-muted-foreground">{currentFact.explanation}</div>}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => resolveFact(currentFact, "keep_canon")}>Keep canon</Button>
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => resolveFact(currentFact, "update_canon")}>Keep my writing</Button>
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => resolveFact(currentFact, "decide_later")}>Decide later</Button>
                  <Link href={`/continuity/${currentFact.code}`} className="self-center text-xs text-muted-foreground hover:underline">
                    More options
                  </Link>
                </div>
              </div>
            )}
          </>
        )}

        {activeTool === "next" && (
          <>
            {pending && !cards && <p className="text-xs text-muted-foreground">Reading the story so far&hellip;</p>}
            {cards && cards.length === 0 && <p className="text-xs text-muted-foreground">No suggestions this time.</p>}
            {cards && cards.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-1">
                {cards.map((card, i) => (
                  <button
                    key={i} type="button" disabled={pending} onClick={() => pickCard(card)}
                    className="rounded-md border px-3 py-2 text-left text-xs hover:bg-accent"
                  >
                    <p className="font-medium">{card.name}</p>
                    <p className="mt-1 text-muted-foreground">{card.summary}</p>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {activeTool === "ask" && (
          <>
            {pending && !answer && <p className="text-xs text-muted-foreground">Thinking&hellip;</p>}
            {answer && <p className="text-xs">{answer}</p>}
          </>
        )}
      </div>
    </div>
  );
}

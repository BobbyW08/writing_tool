import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { movedTo } from "@/lib/codes-history";
import { getStoryByCode } from "@/lib/world/queries";
import { getWritingListByStory } from "@/lib/studio/queries";
import { getStoryStats } from "@/lib/story-builder/queries";
import { listOpenDecisionsForWritingIds } from "@/lib/continuity/queries";
import { ReviewWorkspace, type ReviewFact, type ReviewPiece } from "@/components/review-workspace";

type StoryDoc = { id: number; code: string; name: string };

// Step UX4, board 6: "Review what I have so far". Only reachable once getStoryStats(id).hasProse
// is true (see the Review card on the actions screen), but this page re-checks that itself rather
// than trusting the link, since it can be navigated to directly.
export default async function StoryReviewPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const story = await getStoryByCode(code);
  if (!story) {
    const moved = await movedTo(code);
    if (moved) redirect(moved);
    notFound();
  }

  const doc = story as unknown as StoryDoc;
  const [writingList, stats] = await Promise.all([
    getWritingListByStory(doc.id),
    getStoryStats(doc.id),
  ]);
  if (!stats.hasProse) redirect(`/story-builder/${doc.code}`);

  const pieces: ReviewPiece[] = writingList.map((w) => ({
    id: w.id,
    code: w.code,
    name: w.name,
    wordCount: w.wordCount,
    canonState: w.canonState,
  }));

  const reviewableIds = pieces.filter((p) => p.canonState !== "set_aside" && p.wordCount > 0).map((p) => p.id);
  const flags = await listOpenDecisionsForWritingIds(reviewableIds);
  const initialFacts: ReviewFact[] = flags.map((f) => ({
    code: f.code,
    kind: f.kind,
    fieldLabel: f.fieldLabel,
    existingExcerpt: f.existingExcerpt,
    newQuote: f.newQuote,
    explanation: f.explanation,
    entryCollection: f.entryCollection,
    entryId: f.entryId,
    entryName: f.entryName,
    entrySlug: f.entrySlug,
    writingName: f.writingName,
    priority: f.priority,
  }));

  return (
    <div className="space-y-6">
      <div className="flex gap-1.5 text-sm text-muted-foreground">
        <Link href="/" className="hover:underline">Home</Link>
        <span>/</span>
        <Link href="/story-builder" className="hover:underline">Stories</Link>
        <span>/</span>
        <Link href={`/story-builder/${doc.code}`} className="hover:underline">{doc.name}</Link>
        <span>/</span>
        <span>Review</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Review what I have so far</h1>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
          {stats.wordCount.toLocaleString()} words in {stats.pieceCount} piece{stats.pieceCount === 1 ? "" : "s"}
        </span>
      </div>

      <ReviewWorkspace storyName={doc.name} pieces={pieces} initialFacts={initialFacts} />
    </div>
  );
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { movedTo } from "@/lib/codes-history";
import { getStoryByCode } from "@/lib/world/queries";
import { getWritingListByStory } from "@/lib/studio/queries";
import { createWriting } from "@/lib/studio/actions";
import { getStoryStats } from "@/lib/story-builder/queries";
import { STORY_STAGE_LABELS } from "@/lib/stories";

type StoryDoc = {
  id: number;
  code: string;
  name: string;
  stage?: string | null;
  startYear?: number | null;
  endYear?: number | null;
  yearLabel?: string | null;
};

export default async function StoryBuilderActionsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const story = await getStoryByCode(code);
  if (!story) {
    const moved = await movedTo(code);
    if (moved) redirect(moved);
    notFound();
  }

  const doc = story as unknown as StoryDoc;
  const storyCode = doc.code;

  // Same get-or-create as app/(app)/stories/[code]/page.tsx's "Keep writing" section: "Write it
  // myself" always has somewhere real to land, idempotent once the first record exists.
  let writingList = await getWritingListByStory(doc.id);
  if (writingList.length === 0) {
    const created = await createWriting(`${doc.name} — untitled`, doc.id);
    if (created.code) writingList = await getWritingListByStory(doc.id);
  }
  const activeWritingCode = writingList[0]?.code ?? null;

  const stats = await getStoryStats(doc.id);

  const yearRange =
    doc.yearLabel ?? (doc.startYear != null ? `Year ${doc.startYear}${doc.endYear != null && doc.endYear !== doc.startYear ? ` to ${doc.endYear}` : ""}` : null);

  return (
    <div className="space-y-6">
      <div className="flex gap-1.5 text-sm text-muted-foreground">
        <Link href="/" className="hover:underline">Home</Link>
        <span>/</span>
        <Link href="/story-builder" className="hover:underline">Stories</Link>
        <span>/</span>
        <span>{doc.name}</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{doc.name}</h1>
        {doc.stage && (
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
            {STORY_STAGE_LABELS[doc.stage] ?? doc.stage}
          </span>
        )}
        {yearRange && <span className="text-sm text-muted-foreground">{yearRange}</span>}
      </div>

      <div className="text-lg font-semibold">What do you want to do?</div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          href={activeWritingCode ? `/write/${activeWritingCode}` : "/write"}
          className="flex min-h-[170px] flex-col gap-2 rounded-xl border border-blue-600 bg-blue-600 p-5 text-white hover:bg-blue-500"
        >
          <span className="text-xl font-bold">Write it myself</span>
          <span className="text-sm text-blue-100">A blank page that saves as you type. Type a name and press Tab to link it.</span>
          <span className="mt-auto text-xs text-blue-100">Opens: the writing studio, on this story</span>
        </Link>

        <Link
          href={`/stories/${storyCode}/beats`}
          className="flex min-h-[170px] flex-col gap-2 rounded-xl border bg-card p-5 hover:bg-accent/40"
        >
          <span className="text-xl font-bold">Use the Story Builder</span>
          <span className="text-sm text-muted-foreground">
            Lay this story out with its characters, places and years. Select a beat to get ideas for what happens next.
          </span>
          <span className="mt-auto text-xs text-muted-foreground">Opens: the beats page, on this story (the canvas is not built yet)</span>
        </Link>

        {stats.hasProse ? (
          <Link
            href={`/story-builder/${storyCode}/review`}
            className="flex min-h-[170px] flex-col gap-2 rounded-xl border bg-card p-5 hover:bg-accent/40"
          >
            <span className="text-xl font-bold">Review what I have so far</span>
            <span className="text-sm text-muted-foreground">Grammar, style and flow suggestions, and a fact check against your canon.</span>
            <span className="mt-auto text-xs text-muted-foreground">{stats.wordCount.toLocaleString()} words written</span>
          </Link>
        ) : (
          <div className="flex min-h-[170px] cursor-not-allowed flex-col gap-2 rounded-xl border border-dashed p-5 text-muted-foreground">
            <span className="text-xl font-bold">Review what I have so far</span>
            <span className="text-sm">Grammar, style and flow suggestions, and a fact check against your canon.</span>
            <span className="mt-auto text-xs">Unavailable: no written prose yet. Notes and data do not count.</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span>Written: {stats.wordCount.toLocaleString()} words</span>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs">{stats.pieceCount} pieces</span>
        <span>Beats: {stats.beatCount}</span>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs">{stats.linkedEntryCount} linked entries</span>
      </div>
    </div>
  );
}

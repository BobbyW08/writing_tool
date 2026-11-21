import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { movedTo } from "@/lib/codes-history";
import { getStoryByCode, getBeatsForStory, getBeatInvolves, resolveLinkEntries } from "@/lib/world/queries";
import { StoryBeatsLane, type BeatRow } from "@/components/story-beats-lane";

export default async function StoryBeatsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const doc = await getStoryByCode(code) as { id: number; code: string; name: string } | null;
  if (!doc) {
    const moved = await movedTo(code);
    if (moved) redirect(`${moved}/beats`);
    notFound();
  }

  const rawBeats = await getBeatsForStory(doc.id);
  const beats: BeatRow[] = await Promise.all(rawBeats.map(async (b) => {
    const involvesRows = await getBeatInvolves(b.id);
    const involves = (await resolveLinkEntries(involvesRows)).map((e) => ({
      collection: e.collection, entryId: e.id, code: e.code, name: e.name,
    }));
    const promoted = b.promotedToEventId
      ? (await resolveLinkEntries([{ entryCollection: "events", entryId: b.promotedToEventId }]))[0]
      : null;
    return {
      id: b.id,
      code: b.code,
      name: b.name,
      summary: b.summary,
      state: b.state,
      order: b.order,
      promotedToEventId: b.promotedToEventId,
      promotedEventCode: promoted?.code ?? null,
      involves,
    };
  }));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href={`/stories/${doc.code}`} className="text-sm text-muted-foreground hover:underline">
          {doc.name}
        </Link>
        <h1 className="text-2xl font-semibold">Story Builder</h1>
        <p className="text-sm text-muted-foreground">
          Plan beats for this story. A beat is plan, not canon, until you promote it to an event.
        </p>
      </div>
      <StoryBeatsLane storyCode={doc.code} storyId={doc.id} beats={beats} />
    </div>
  );
}

import { getStoriesList, isUnk } from "@/lib/world/queries";
import { StoryBoardClient, type BoardStory } from "@/components/story-board-client";

type Story = {
  id: number;
  code?: string | null;
  name: string;
  stage?: string | null;
  era?: string | null;
  floating?: boolean | null;
  tagIds?: number[] | null;
};

// Stories grouped by era and stage (traveler-wiki-build-plan.md's "Story board"), floating
// stories (no fixed place on the timeline yet) in their own lane above the era grid. Step U6:
// drag and drop between cells, handled client-side in StoryBoardClient.
export default async function StoryBoardPage() {
  const { docs } = await getStoriesList();
  const stories: BoardStory[] = (docs as Story[]).map((s) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    stage: s.stage,
    era: s.era,
    floating: s.floating,
    unk: isUnk(s.tagIds ?? null),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Story board</h1>
        <p className="text-sm text-muted-foreground">Stories grouped by era and stage. Floating stories have no fixed place yet. Drag a card to move it.</p>
      </div>

      <StoryBoardClient stories={stories} />
    </div>
  );
}

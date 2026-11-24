import Link from "next/link";
import { getStoryCanvasBoard, getCanvasBeats, type BoardNodePositions } from "@/lib/world/queries";
import { createEntityAction } from "@/lib/world/actions";
import { StoryBuilderCanvas } from "@/components/story-builder-canvas";

// Step SB2 (board 5): the endless canvas itself. Previously this bare route was the UX3 "new story
// or pick existing" picker; that moved to /story-builder/pick once the canvas needed the real route
// the plan specifies. The canvas's own board (code D, kind = story_canvas) is a singleton, created
// lazily on first open -- there is exactly one, shared across every story, same as the master timeline.
export default async function StoryBuilderCanvasPage() {
  let board = await getStoryCanvasBoard();
  if (!board) {
    await createEntityAction("boards", { kind: "story_canvas", name: "Story Builder canvas" });
    board = await getStoryCanvasBoard();
  }
  if (!board) {
    return <p className="text-sm text-destructive">Could not create the Story Builder canvas board.</p>;
  }

  const beats = await getCanvasBeats();

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Story Builder</h1>
          <p className="text-sm text-muted-foreground">
            Drag to pan, scroll to pan, ctrl/pinch-scroll to zoom. Double-click, or press N, to add an idea.
          </p>
        </div>
        <Link href="/story-builder/pick" className="text-sm text-blue-500 hover:underline">
          Stories
        </Link>
      </div>

      <StoryBuilderCanvas
        boardId={board.id}
        initialViewport={board.viewport}
        initialBeats={beats}
        initialNodePositions={(board.nodePositions ?? {}) as BoardNodePositions}
      />
    </div>
  );
}

import Link from "next/link";
import { getBoardsList } from "@/lib/world/queries";
import { NewBoardForm } from "@/components/new-board-form";

const KIND_LABELS: Record<string, string> = {
  node_map: "Node map", content_tree: "Content tree", family_tree: "Family tree",
  causal_tree: "Causal tree", story_map: "Story map", whiteboard: "Whiteboard",
};

export default async function BoardsPage() {
  const { docs } = await getBoardsList();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Boards</h1>
        <p className="text-sm text-muted-foreground">
          Saved node maps, trees and the story map read from the link index. Whiteboards are free-form canvases. A board never creates links — it only draws them.
        </p>
      </div>

      <NewBoardForm />

      {docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No boards yet.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {(docs as { id: number; code: string; name: string; kind: string }[]).map((b) => (
            <li key={b.id}>
              <Link href={`/boards/${b.code}`} className="flex items-center gap-2 p-2.5 hover:bg-accent">
                <span className="font-mono text-xs text-muted-foreground">{b.code}</span>
                <span className="text-sm">{b.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{KIND_LABELS[b.kind] ?? b.kind}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

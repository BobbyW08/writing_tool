import Link from "next/link";
import { notFound } from "next/navigation";
import { getBoardByCode, getGraphCandidates } from "@/lib/world/queries";
import { EditableField } from "@/components/editable-field";
import { RecordActions } from "@/components/record-actions";
import { WhatLinksHere } from "@/components/what-links-here";
import { BoardGraphView } from "@/components/board-graph-view";
import { BoardWhiteboard } from "@/components/board-whiteboard";
import type { TLEditorSnapshot } from "tldraw";

const KIND_LABELS: Record<string, string> = {
  node_map: "Node map", content_tree: "Content tree", family_tree: "Family tree",
  causal_tree: "Causal tree", story_map: "Story map", whiteboard: "Whiteboard",
};

export default async function BoardPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const board = await getBoardByCode(code);
  if (!board) notFound();

  const candidates = board.kind === "whiteboard" ? [] : await getGraphCandidates();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/boards" className="hover:underline">Boards</Link>
          <span>/</span>
          <span>{KIND_LABELS[board.kind] ?? board.kind}</span>
        </div>
        <div className="mt-1 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold">
              <EditableField collection="boards" docId={board.id} fieldName="name" value={board.name} kind="text" className="text-2xl font-semibold" />
            </h1>
            <p className="font-mono text-xs text-muted-foreground">{board.code}</p>
          </div>
          <RecordActions collection="boards" id={board.id} code={board.code} name={board.name} status={board.status} />
        </div>
        <div className="mt-2">
          <EditableField collection="boards" docId={board.id} fieldName="summary" value={board.summary} kind="textarea" placeholder="Click to add summary" className="text-sm" />
        </div>
      </div>

      {board.kind === "whiteboard" ? (
        <BoardWhiteboard boardId={board.id} initialScene={board.scene as TLEditorSnapshot | undefined} />
      ) : (
        <BoardGraphView
          boardId={board.id}
          candidates={candidates}
          initialRootCodes={board.rootCodes}
          initialQuery={board.query}
          initialLayoutMode={board.layoutMode}
          initialNodePositions={board.nodePositions}
        />
      )}

      <WhatLinksHere code={board.code} />
    </div>
  );
}

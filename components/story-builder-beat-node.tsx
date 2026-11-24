"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { type NodeProps } from "@xyflow/react";

export type BeatNodeData = {
  beatId: number;
  name: string;
  startYear: number | null;
  onRename: (beatId: number, name: string) => void;
};

// Board 5's loose "IDEA" box: dashed outline and a "no date" badge until it has a startYear, then a
// solid outline with the year it landed on. Double-click to rename in place.
export function BeatNode({ data, selected }: NodeProps & { data: BeatNodeData }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const undated = data.startYear == null;

  function commit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (!trimmed || trimmed === data.name) {
      setDraft(data.name);
      return;
    }
    data.onRename(data.beatId, trimmed);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") inputRef.current?.blur();
    if (e.key === "Escape") {
      setDraft(data.name);
      setEditing(false);
    }
  }

  return (
    <div
      onDoubleClick={() => setEditing(true)}
      className="rounded-md border-2 bg-blue-50/80 px-3 py-2 text-xs shadow-sm"
      style={{
        width: 224,
        borderStyle: undated ? "dashed" : "solid",
        borderColor: selected ? "#2563eb" : "#93c5fd",
      }}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-semibold uppercase tracking-wide text-blue-700">Idea</span>
        {undated ? (
          <span className="shrink-0 rounded-full bg-neutral-200 px-1.5 py-0.5 text-[9px] font-medium text-neutral-600">no date</span>
        ) : (
          <span className="shrink-0 text-[10px] text-blue-600">Year {data.startYear}</span>
        )}
      </div>
      {editing ? (
        <input
          ref={inputRef}
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
          className="w-full rounded border border-blue-300 bg-white px-1 py-0.5 text-sm outline-none"
        />
      ) : (
        <p className="break-words text-sm text-neutral-800">{data.name}</p>
      )}
    </div>
  );
}

export const STORY_BUILDER_NODE_TYPES = { beat: BeatNode, draft: BeatDraftNode };

export type BeatDraftNodeData = { onCommit: (name: string) => void; onCancel: () => void };

// The blank box that appears on double-click or N, per board 5: "Double click blank canvas, or
// press N, to create a new box. Type anything." Nothing is saved until this commits non-empty text.
function BeatDraftNode({ data }: NodeProps & { data: BeatDraftNodeData }) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") inputRef.current?.blur();
    if (e.key === "Escape") data.onCancel();
  }

  function onBlur() {
    const trimmed = text.trim();
    if (trimmed) data.onCommit(trimmed);
    else data.onCancel();
  }

  return (
    <div className="rounded-md border-2 border-dashed border-blue-400 bg-blue-50/80 px-3 py-2 text-xs shadow-sm" style={{ width: 224 }}>
      <div className="mb-1 font-semibold uppercase tracking-wide text-blue-700">Idea</div>
      <input
        ref={inputRef}
        autoFocus
        placeholder="Type anything…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        className="w-full rounded border border-blue-300 bg-white px-1 py-0.5 text-sm outline-none"
      />
    </div>
  );
}

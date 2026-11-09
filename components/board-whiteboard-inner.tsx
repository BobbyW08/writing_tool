"use client";

import { useState, useCallback, useRef } from "react";
import { Tldraw, type Editor, type TLEditorSnapshot } from "tldraw";
import "tldraw/tldraw.css";
import { updateFieldAction, createRelationshipAction, resolveCodeForDisplayAction } from "@/lib/world/actions";
import { RELATIONSHIP_TYPES } from "@/lib/relationshipTypes";

// tldraw owns the scene JSON entirely (hard rule 10: off-the-shelf before hand-rolling) — this
// component only persists editor.getSnapshot() into the board's `scene` column and reloads it.
export function BoardWhiteboardInner({ boardId, initialScene }: { boardId: number; initialScene: TLEditorSnapshot | undefined }) {
  const editorRef = useRef<Editor | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [fromCode, setFromCode] = useState("");
  const [toCode, setToCode] = useState("");
  const [relType, setRelType] = useState<string>(RELATIONSHIP_TYPES[0].value);
  const [promoteMsg, setPromoteMsg] = useState("");

  const handleMount = useCallback((editor: Editor) => {
    editorRef.current = editor;
  }, []);

  async function handleSave() {
    if (!editorRef.current) return;
    setSaving(true);
    const snapshot = editorRef.current.getSnapshot();
    await updateFieldAction("boards", boardId, "scene", snapshot);
    setSaving(false);
    setSavedAt(new Date());
  }

  async function handlePromote() {
    setPromoteMsg("");
    const from = await resolveCodeForDisplayAction(fromCode.trim());
    const to = await resolveCodeForDisplayAction(toCode.trim());
    if (!from || !to) { setPromoteMsg("One or both codes were not found."); return; }
    const result = await createRelationshipAction(from.code, to.code, relType);
    if (!result.ok) { setPromoteMsg(result.error ?? "Failed to create relationship."); return; }
    setPromoteMsg(`Created ${from.code} → ${to.code}.`);
    setFromCode(""); setToCode("");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-md border p-2">
        <button
          type="button" onClick={handleSave} disabled={saving}
          className="h-8 rounded-md bg-primary px-3 text-xs text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save board"}
        </button>
        {savedAt && <span className="text-xs text-muted-foreground">Saved {savedAt.toLocaleTimeString()}</span>}
        <span className="mx-2 h-5 w-px bg-border" />
        <span className="text-xs font-medium text-muted-foreground">Promote to relationship:</span>
        <input value={fromCode} onChange={(e) => setFromCode(e.target.value)} placeholder="From code" className="h-8 w-28 rounded border bg-background px-2 text-xs" />
        <select value={relType} onChange={(e) => setRelType(e.target.value)} className="h-8 rounded border bg-background px-2 text-xs">
          {RELATIONSHIP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <input value={toCode} onChange={(e) => setToCode(e.target.value)} placeholder="To code" className="h-8 w-28 rounded border bg-background px-2 text-xs" />
        <button type="button" onClick={handlePromote} disabled={!fromCode.trim() || !toCode.trim()} className="h-8 rounded-md border px-3 text-xs hover:bg-accent disabled:opacity-50">
          Create link
        </button>
        {promoteMsg && <span className="text-xs text-muted-foreground">{promoteMsg}</span>}
      </div>

      <div className="h-[640px] overflow-hidden rounded-md border">
        <Tldraw
          onMount={handleMount}
          snapshot={initialScene}
        />
      </div>
    </div>
  );
}

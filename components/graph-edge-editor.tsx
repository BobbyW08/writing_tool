'use client'

import { useEffect, useState } from 'react'
import { updateRelationshipAction, deleteRelationshipAction } from '@/lib/world/actions'
import { RELATIONSHIP_TYPES } from '@/lib/relationshipTypes'

interface RelDetail {
  id: number
  fromCode: string
  toCode: string
  type: string
  startYear: number | null
  endYear: number | null
  notes: string | null
}

// Step U5: edit an existing relationship edge selected in the node map or relationship view.
// Floats over the graph (the caller positions it absolutely) rather than trying to anchor to the
// edge's screen position, which would have to track pan/zoom. Reuses U2's actions untouched --
// `myCode` is always the stored fromCode since this panel never repoints an endpoint, only
// type/years/notes, so patch.otherCode is never sent.
export function GraphEdgeEditor({ code, onClose, onChanged }: { code: string; onClose: () => void; onChanged: () => void }) {
  const [rel, setRel] = useState<RelDetail | null>(null)
  const [type, setType] = useState('')
  const [startYear, setStartYear] = useState('')
  const [endYear, setEndYear] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/relationships/${code}`)
      .then(r => r.json())
      .then((data: RelDetail) => {
        if (cancelled) return
        setRel(data)
        setType(data.type)
        setStartYear(data.startYear != null ? String(data.startYear) : '')
        setEndYear(data.endYear != null ? String(data.endYear) : '')
        setNotes(data.notes ?? '')
      })
    return () => { cancelled = true }
  }, [code])

  async function handleSave() {
    if (!rel) return
    setStatus('saving')
    const result = await updateRelationshipAction(rel.id, rel.fromCode, {
      type,
      startYear: startYear.trim() ? Number(startYear) : null,
      endYear: endYear.trim() ? Number(endYear) : null,
      notes: notes.trim() || null,
    })
    if (result.ok) {
      onChanged()
      onClose()
    } else {
      setStatus('error')
    }
  }

  async function handleDelete() {
    if (!rel) return
    setStatus('saving')
    const result = await deleteRelationshipAction(rel.id)
    if (result.ok) {
      onChanged()
      onClose()
    } else {
      setStatus('error')
    }
  }

  return (
    <div className="absolute bottom-3 right-3 z-10 w-72 space-y-2 rounded-md border bg-background p-3 text-sm shadow-lg">
      <div className="flex items-center justify-between">
        <span className="font-semibold">Edit relationship</span>
        <button type="button" onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
      </div>

      {!rel ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : (
        <>
          <p className="font-mono text-xs text-muted-foreground">{rel.fromCode} → {rel.toCode}</p>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded border bg-background px-2 py-1 text-sm"
          >
            {RELATIONSHIP_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="number" value={startYear} onChange={(e) => setStartYear(e.target.value)}
              placeholder="Start year" className="w-1/2 rounded border bg-background px-2 py-1 text-sm"
            />
            <input
              type="number" value={endYear} onChange={(e) => setEndYear(e.target.value)}
              placeholder="End year" className="w-1/2 rounded border bg-background px-2 py-1 text-sm"
            />
          </div>
          <textarea
            value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes" rows={2}
            className="w-full rounded border bg-background px-2 py-1 text-sm"
          />
          {status === 'error' && <p className="text-xs text-destructive">Something went wrong.</p>}
          <div className="flex items-center justify-between pt-1">
            {confirmingDelete ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-destructive">Delete?</span>
                <button type="button" onClick={handleDelete} className="rounded bg-destructive px-2 py-1 text-destructive-foreground hover:opacity-80">Yes</button>
                <button type="button" onClick={() => setConfirmingDelete(false)} className="rounded border px-2 py-1 hover:bg-accent">Cancel</button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmingDelete(true)} className="text-xs text-destructive hover:underline">Delete</button>
            )}
            <button
              type="button" onClick={handleSave} disabled={status === 'saving'}
              className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground disabled:opacity-50"
            >
              {status === 'saving' ? 'Saving…' : 'Save'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

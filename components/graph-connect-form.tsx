'use client'

import { useState } from 'react'
import { createRelationshipAction } from '@/lib/world/actions'
import { RELATIONSHIP_TYPES } from '@/lib/relationshipTypes'

// Step U5: drag-from-node-to-node in the node map or relationship view ends here instead of
// silently creating a relationship with a guessed type -- the user picks one, matching the
// codebase's no-window.prompt convention for inline creation (see DeleteRecordButton,
// CollectionBoardView's "+").
export function GraphConnectForm({
  fromCode, toCode, onClose, onCreated,
}: { fromCode: string; toCode: string; onClose: () => void; onCreated: () => void }) {
  const [type, setType] = useState<string>(RELATIONSHIP_TYPES[0].value)
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')

  async function handleCreate() {
    setStatus('saving')
    const result = await createRelationshipAction(fromCode, toCode, type)
    if (result.ok) {
      onCreated()
      onClose()
    } else {
      setStatus('error')
    }
  }

  return (
    <div className="absolute bottom-3 right-3 z-10 w-72 space-y-2 rounded-md border bg-background p-3 text-sm shadow-lg">
      <div className="flex items-center justify-between">
        <span className="font-semibold">New relationship</span>
        <button type="button" onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
      </div>
      <p className="font-mono text-xs text-muted-foreground">{fromCode} → {toCode}</p>
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="w-full rounded border bg-background px-2 py-1 text-sm"
      >
        {RELATIONSHIP_TYPES.map(t => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
      {status === 'error' && <p className="text-xs text-destructive">Something went wrong.</p>}
      <div className="flex justify-end pt-1">
        <button
          type="button" onClick={handleCreate} disabled={status === 'saving'}
          className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground disabled:opacity-50"
        >
          {status === 'saving' ? 'Creating…' : 'Create'}
        </button>
      </div>
    </div>
  )
}

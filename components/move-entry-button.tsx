'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { moveEntryAction } from '@/lib/world/move'

const TYPES: { value: string; label: string }[] = [
  { value: 'characters', label: 'Character' },
  { value: 'locations', label: 'Location' },
  { value: 'items', label: 'Item' },
  { value: 'cultures', label: 'Culture' },
  { value: 'factions', label: 'Faction' },
  { value: 'races', label: 'Race' },
  { value: 'languages', label: 'Language' },
  { value: 'lore', label: 'Lore' },
  { value: 'events', label: 'Event' },
  { value: 'stories', label: 'Story' },
]

// Change what type an entry is. It gets a new code, its old code keeps working, and everything
// that pointed at it is carried across.
export function MoveEntryButton({ collection, id, name }: { collection: string; id: number; name: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState('')
  const [error, setError] = useState('')
  const [pending, start] = useTransition()

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="rounded border px-3 py-1.5 text-xs hover:bg-accent">
        Change type
      </button>
    )
  }

  function confirm() {
    setError('')
    start(async () => {
      const result = await moveEntryAction(collection, id, target)
      if (result.ok && result.newCode) router.push(`/${target}/${result.newCode}`)
      else setError(result.error ?? 'Move failed')
    })
  }

  return (
    <div className="rounded-md border p-3 text-sm">
      <p>Change the type of <strong>{name}</strong>. Everything linked to it moves with it.</p>
      <select
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        className="mt-2 h-8 rounded border bg-background px-2 text-xs"
        aria-label="New type"
      >
        <option value="">Choose a type</option>
        {TYPES.filter((t) => t.value !== collection).map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={confirm}
          disabled={!target || pending}
          className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground hover:opacity-80 disabled:opacity-50"
        >
          {pending ? 'Moving...' : 'Change type'}
        </button>
        <button type="button" onClick={() => { setOpen(false); setError('') }} className="rounded border px-3 py-1 text-xs hover:bg-accent">
          Cancel
        </button>
      </div>
    </div>
  )
}

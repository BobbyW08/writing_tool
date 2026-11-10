'use client'

import { EditableField } from './editable-field'
import { DeleteRecordButton } from './delete-record-button'
import { STATUS_OPTIONS } from '@/lib/world/fields'
import { WORLD_SLUGS } from '@/lib/codes'

interface RecordActionsProps {
  collection: string
  id: number
  code: string
  name: string
  status: string | null | undefined
  onDeleted?: () => void
}

// Entries and events are the only collections "Export as Markdown" covers (Phase 7) -- stories,
// writing, and the structural collections (boards, tables, maps...) don't export this way.
const EXPORTABLE_COLLECTIONS: string[] = [...WORLD_SLUGS, 'events']

// One shared header-row control: step U1 in traveler-wiki-build-plan.md. Every coded collection
// (entries, events, stories, boards, chronicles, maps, tables) carries a `status` column via
// sharedCols(), so the status select is always shown; only the delete button's cleanup behavior
// varies per collection, and that already lives inside DeleteRecordButton.
export function RecordActions({ collection, id, code, name, status, onDeleted }: RecordActionsProps) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      {EXPORTABLE_COLLECTIONS.includes(collection) && (
        <a
          href={`/api/export/${collection}/${code}`}
          download
          className="rounded border px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          Export as Markdown
        </a>
      )}
      <EditableField collection={collection} docId={id} fieldName="status" value={status} kind="select" options={STATUS_OPTIONS} />
      <DeleteRecordButton collection={collection} id={id} code={code} name={name} onDeleted={onDeleted} />
    </div>
  )
}

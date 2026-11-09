'use client'

import { EditableField } from './editable-field'
import { DeleteRecordButton } from './delete-record-button'
import { STATUS_OPTIONS } from '@/lib/world/fields'

interface RecordActionsProps {
  collection: string
  id: number
  code: string
  name: string
  status: string | null | undefined
  onDeleted?: () => void
}

// One shared header-row control: step U1 in traveler-wiki-build-plan.md. Every coded collection
// (entries, events, stories, boards, chronicles, maps, tables) carries a `status` column via
// sharedCols(), so the status select is always shown; only the delete button's cleanup behavior
// varies per collection, and that already lives inside DeleteRecordButton.
export function RecordActions({ collection, id, code, name, status, onDeleted }: RecordActionsProps) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <EditableField collection={collection} docId={id} fieldName="status" value={status} kind="select" options={STATUS_OPTIONS} />
      <DeleteRecordButton collection={collection} id={id} code={code} name={name} onDeleted={onDeleted} />
    </div>
  )
}

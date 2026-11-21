// The drag payload type shared by the left panel (source) and the writing editor (target).
// Kept in its own file so the left panel does not have to import the editor.
export const ENTRY_DRAG_TYPE = 'application/x-traveler-entry'

export type EntryDragPayload = { code: string; name: string; collection: string }

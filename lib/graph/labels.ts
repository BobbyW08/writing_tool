// Fixed display labels for field- and text-sourced link edges (lib/graph/types.ts's toEdge()).
// Relationship-sourced edges get their label/inverse from lib/relationshipTypes.ts instead, since
// those are user-chosen per X record, not fixed per field name.

export type FieldLabel = { label: string; inverse: string }

export const PARENT_LABEL: FieldLabel = { label: 'Part of', inverse: 'Has part' }
export const MENTION_LABEL: FieldLabel = { label: 'Mentions', inverse: 'Mentioned in' }

// Keyed by the field name recorded as the link row's `type` (lib/graph/extract.ts's registry).
export const FIELD_LABELS: Record<string, FieldLabel> = {
  involves: { label: 'Involves', inverse: 'Involved in' },
  dramatizes: { label: 'Dramatizes', inverse: 'Dramatized by' },
  location: { label: 'Took place at', inverse: 'Site of' },
  birthplace: { label: 'Born in', inverse: 'Birthplace of' },
  race: { label: 'Is a', inverse: 'Includes' },
  culture: { label: 'Belongs to culture', inverse: 'Includes' },
  currentOwner: { label: 'Owned by', inverse: 'Owns' },
  currentLocation: { label: 'Located at', inverse: 'Location of' },
  homeland: { label: 'Homeland', inverse: 'Homeland of' },
  language: { label: 'Speaks', inverse: 'Spoken by' },
  story: { label: 'Part of story', inverse: 'Has writing' },
  onMap: { label: 'Pin on', inverse: 'Has pin' },
  opensMap: { label: 'Opens map', inverse: 'Opened by pin' },
  links: { label: 'Shown on pin', inverse: 'Pin shows' },
}

export function fieldLabel(type: string): FieldLabel {
  return FIELD_LABELS[type] ?? { label: type, inverse: type }
}

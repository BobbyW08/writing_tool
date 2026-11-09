// The one node shape and one edge shape every visual feature uses (node maps, relationship
// views, family/causality/content trees, the story map, timeline lanes and convergence,
// chronicles, whiteboard cards, compilations, the AI context builder). No view invents its own.
// See traveler-wiki-build-plan.md "Link index" > "Node and edge shape".

import { nodeKindFor } from '@/lib/nodeKinds'
import { UNK_TAG_NAME, AI_SUGGESTED_TAG_NAME } from '@/db/tags'
import { RELATIONSHIP_TYPES, type RelationshipHierarchy } from '@/lib/relationshipTypes'
import { PARENT_LABEL, MENTION_LABEL, fieldLabel } from '@/lib/graph/labels'

export type Node = {
  code: string
  collection: string
  name: string
  summary: string | null
  status: string
  tags: string[]
  unk: boolean
  aiSuggested: boolean
  startYear?: number | null
  endYear?: number | null
  yearLabel?: string | null
  parentCode?: string | null
  imageUrl?: string | null
  color: string
  icon: string
}

export type EdgeSource = 'relationship' | 'field' | 'parent' | 'text' | 'pin'

export type Edge = {
  id: string
  from: string
  to: string
  source: EdgeSource
  type: string
  label: string
  inverseLabel: string
  directed: boolean
  hierarchy: RelationshipHierarchy
  ownerCode: string
  relationshipCode?: string
  startYear?: number | null
  endYear?: number | null
  broken?: boolean
}

export type Graph = {
  nodes: Node[]
  edges: Edge[]
  truncated: boolean
}

// Shape of a doc as handed back by lib/world/queries.ts's enrichWorldRow() (world entries,
// events, stories) — the only fields toNode() reads. Looser than the real return type so writing
// docs (no tags/parent/image enrichment) can be passed through too, with sane defaults.
export type GraphDoc = {
  code: string
  name: string
  summary?: string | null
  status?: string | null
  tags?: { id: number; code: string; name: string }[]
  startYear?: number | null
  endYear?: number | null
  yearLabel?: string | null
  parent?: { code: string } | null
  image?: { url: string | null; sizes?: { thumbnail?: { url: string | null } | null } } | null
}

export function toNode(collection: string, doc: GraphDoc): Node {
  const kind = nodeKindFor(collection)
  const tagNames = (doc.tags ?? []).map(t => t.name)
  const imageUrl = doc.image?.sizes?.thumbnail?.url ?? doc.image?.url ?? null
  return {
    code: doc.code,
    collection,
    name: doc.name,
    summary: doc.summary ?? null,
    status: doc.status ?? 'locked',
    tags: tagNames,
    unk: tagNames.includes(UNK_TAG_NAME),
    aiSuggested: tagNames.includes(AI_SUGGESTED_TAG_NAME),
    startYear: doc.startYear ?? undefined,
    endYear: doc.endYear ?? undefined,
    yearLabel: doc.yearLabel ?? undefined,
    parentCode: doc.parent?.code ?? undefined,
    imageUrl: imageUrl ?? undefined,
    color: kind.color,
    icon: kind.icon,
  }
}

// Shape of a row from the `links` table (db/schema.ts) — the only fields toEdge() reads.
export type LinkRow = {
  key: string
  fromCode: string
  toCode: string
  source: string
  type: string
  ownerCode: string
  directed: boolean
  startYear: number | null
  endYear: number | null
  broken: boolean
}

export function toEdge(row: LinkRow): Edge {
  let label = row.type
  let inverseLabel = row.type
  let hierarchy: RelationshipHierarchy = 'none'

  if (row.source === 'relationship') {
    const relType = RELATIONSHIP_TYPES.find(t => t.value === row.type)
    if (relType) {
      label = relType.label
      inverseLabel = relType.inverse
      hierarchy = relType.hierarchy
    }
  } else if (row.source === 'parent') {
    label = PARENT_LABEL.label
    inverseLabel = PARENT_LABEL.inverse
    hierarchy = 'from_is_child' // owner (from) is the child, the parent field's target (to) is the parent
  } else if (row.source === 'text') {
    label = MENTION_LABEL.label
    inverseLabel = MENTION_LABEL.inverse
  } else if (row.source === 'field') {
    const fl = fieldLabel(row.type)
    label = fl.label
    inverseLabel = fl.inverse
  }

  return {
    id: row.key,
    from: row.fromCode,
    to: row.toCode,
    source: row.source as EdgeSource,
    type: row.type,
    label,
    inverseLabel,
    directed: row.directed,
    hierarchy,
    ownerCode: row.ownerCode,
    relationshipCode: row.source === 'relationship' ? row.ownerCode : undefined,
    startYear: row.startYear ?? undefined,
    endYear: row.endYear ?? undefined,
    broken: row.broken || undefined,
  }
}

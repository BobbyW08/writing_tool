// Color and icon per collection, used by lib/graph/types.ts's toNode(). Fixed by collection, never
// read off a record's own fields, so every node-map/tree/relationship view renders consistently.
// Icon names are lucide-react component names (the icon rail and node maps render them that way).

export type NodeKind = {
  color: string
  icon: string
}

export const NODE_KINDS: Record<string, NodeKind> = {
  characters: { color: '#2563eb', icon: 'User' },
  locations: { color: '#16a34a', icon: 'MapPin' },
  items: { color: '#ca8a04', icon: 'Gem' },
  cultures: { color: '#9333ea', icon: 'Users' },
  factions: { color: '#dc2626', icon: 'Flag' },
  races: { color: '#0d9488', icon: 'Fingerprint' },
  languages: { color: '#c026d3', icon: 'Languages' },
  lore: { color: '#854d0e', icon: 'BookOpen' },
  events: { color: '#ea580c', icon: 'Zap' },
  stories: { color: '#4f46e5', icon: 'NotebookPen' },
  writing: { color: '#64748b', icon: 'FileText' },
  maps: { color: '#0891b2', icon: 'Map' },
  'map-pins': { color: '#0891b2', icon: 'MapPinned' },
  chronicles: { color: '#be123c', icon: 'History' },
}

export const DEFAULT_NODE_KIND: NodeKind = { color: '#71717a', icon: 'Circle' }

export function nodeKindFor(collection: string): NodeKind {
  return NODE_KINDS[collection] ?? DEFAULT_NODE_KIND
}

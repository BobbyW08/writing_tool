'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { updateFieldAction } from '@/lib/world/actions'

type Mode = 'type' | 'story' | 'culture' | 'era'

interface TreeNode {
  id: number
  code: string
  name: string
  collection: string
  parentId?: number | null
  parentCode?: string | null
  storyCode?: string | null
  cultureCode?: string | null
  era?: string | null
  image?: string | null
}

interface WorldTreeProps {
  nodes: TreeNode[]
}

const COLLECTION_LABELS: Record<string, string> = {
  characters: 'Characters',
  locations: 'Locations',
  items: 'Items',
  cultures: 'Cultures',
  factions: 'Factions',
  races: 'Races',
  languages: 'Languages',
  lore: 'Lore',
  events: 'Events',
  stories: 'Stories',
}

const COLLECTION_PREFIXES: Record<string, string> = {
  characters: 'C', locations: 'L', items: 'I', cultures: 'U',
  factions: 'F', races: 'R', languages: 'G', lore: 'K', events: 'E', stories: 'S',
}

function nodeHref(node: TreeNode) {
  if (node.collection === 'events') return `/events/${node.code}`
  if (node.collection === 'stories') return `/stories/${node.code}`
  return `/${node.collection}/${node.code}`
}

function matches(node: TreeNode, filter: string) {
  if (!filter) return true
  const f = filter.toLowerCase()
  return node.name.toLowerCase().includes(f) || node.code.toLowerCase().includes(f)
}

function buildTree(nodes: TreeNode[]): Map<number | null, TreeNode[]> {
  const map = new Map<number | null, TreeNode[]>()
  for (const n of nodes) {
    const parent = n.parentId ?? null
    if (!map.has(parent)) map.set(parent, [])
    map.get(parent)!.push(n)
  }
  return map
}

function TreeNodeRow({
  node,
  children,
  depth,
  dragOver,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  node: TreeNode
  children?: React.ReactNode
  depth: number
  dragOver: boolean
  onDragStart: (id: number) => void
  onDragOver: (e: React.DragEvent, id: number) => void
  onDrop: (e: React.DragEvent, targetId: number) => void
}) {
  return (
    <div>
      <div
        draggable
        onDragStart={() => onDragStart(node.id)}
        onDragOver={(e) => onDragOver(e, node.id)}
        onDrop={(e) => onDrop(e, node.id)}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        className={`flex items-center gap-1.5 rounded py-0.5 pr-2 text-sm hover:bg-accent cursor-pointer ${dragOver ? 'bg-accent/60 ring-1 ring-ring' : ''}`}
      >
        {node.image && (
          <img src={node.image} alt="" className="h-5 w-5 shrink-0 rounded object-cover opacity-80" />
        )}
        <span className="font-mono text-[10px] text-muted-foreground shrink-0">{node.code}</span>
        <Link href={nodeHref(node)} className="flex-1 truncate hover:underline" onClick={(e) => e.stopPropagation()}>
          {node.name}
        </Link>
      </div>
      {children}
    </div>
  )
}

function RenderSubtree({
  parentId,
  tree,
  depth,
  filter,
  dragOver,
  dragId,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  parentId: number | null
  tree: Map<number | null, TreeNode[]>
  depth: number
  filter: string
  dragOver: number | null
  dragId: number | null
  onDragStart: (id: number) => void
  onDragOver: (e: React.DragEvent, id: number) => void
  onDrop: (e: React.DragEvent, targetId: number) => void
}) {
  const children = tree.get(parentId) ?? []
  const visible = children.filter(n => !filter || matches(n, filter))
  if (visible.length === 0) return null
  return (
    <>
      {visible.map(n => (
        <TreeNodeRow
          key={n.id}
          node={n}
          depth={depth}
          dragOver={dragOver === n.id && dragId !== n.id}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          <RenderSubtree
            parentId={n.id}
            tree={tree}
            depth={depth + 1}
            filter={filter}
            dragOver={dragOver}
            dragId={dragId}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
          />
        </TreeNodeRow>
      ))}
    </>
  )
}

export function WorldTree({ nodes }: WorldTreeProps) {
  const [mode, setMode] = useState<Mode>('type')
  const [filter, setFilter] = useState('')
  const [dragId, setDragId] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)
  const [dragError, setDragError] = useState('')
  const router = useRouter()

  // Persist mode to localStorage
  useEffect(() => {
    try { setMode((localStorage.getItem('world-tree-mode') as Mode) ?? 'type') } catch {}
  }, [])
  function setModeAndSave(m: Mode) {
    setMode(m)
    try { localStorage.setItem('world-tree-mode', m) } catch {}
  }

  const worldNodes = nodes.filter(n => !['events', 'stories'].includes(n.collection))

  function handleDragStart(id: number) {
    setDragId(id)
    setDragError('')
  }

  function handleDragOver(e: React.DragEvent, id: number) {
    e.preventDefault()
    setDragOver(id)
  }

  async function handleDrop(e: React.DragEvent, targetId: number) {
    e.preventDefault()
    setDragOver(null)
    if (!dragId || dragId === targetId) { setDragId(null); return }

    const dragged = nodes.find(n => n.id === dragId)
    const target = nodes.find(n => n.id === targetId)
    if (!dragged || !target) { setDragId(null); return }

    // Must be same collection
    if (dragged.collection !== target.collection) {
      setDragError('Can only reparent within the same collection.')
      setDragId(null)
      return
    }

    // Cycle check: target must not be a descendant of dragged
    function isDescendant(childId: number, ancestorId: number): boolean {
      const child = nodes.find(n => n.id === childId)
      if (!child?.parentId) return false
      if (child.parentId === ancestorId) return true
      return isDescendant(child.parentId, ancestorId)
    }
    if (isDescendant(targetId, dragId)) {
      setDragError('Cannot drop a node onto its own descendant.')
      setDragId(null)
      return
    }

    const result = await updateFieldAction(dragged.collection, dragged.id, 'parent', targetId)
    if (result.ok) {
      router.refresh()
    } else {
      setDragError(result.error ?? 'Reparent failed')
    }
    setDragId(null)
  }

  // Group by collection for "by type" mode
  const byCollection = new Map<string, TreeNode[]>()
  for (const n of worldNodes) {
    if (!byCollection.has(n.collection)) byCollection.set(n.collection, [])
    byCollection.get(n.collection)!.push(n)
  }

  const MODES: { value: Mode; label: string }[] = [
    { value: 'type', label: 'By type' },
    { value: 'story', label: 'By story' },
    { value: 'culture', label: 'By culture' },
    { value: 'era', label: 'By era' },
  ]

  const hasCultures = worldNodes.some(n => n.collection === 'cultures')
  const hasStories = nodes.some(n => n.collection === 'stories')

  return (
    <div className="flex h-full flex-col gap-2">
      {/* Mode tabs */}
      <div className="flex gap-1 flex-wrap">
        {MODES.map(m => (
          <button
            key={m.value}
            type="button"
            onClick={() => setModeAndSave(m.value)}
            className={`rounded px-2 py-0.5 text-xs ${mode === m.value ? 'bg-accent font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Filter */}
      <input
        type="search"
        value={filter}
        onChange={e => setFilter(e.target.value)}
        placeholder="Filter..."
        className="rounded border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
      />

      {dragError && <p className="text-xs text-destructive">{dragError}</p>}

      {/* Tree content */}
      <div className="flex-1 overflow-y-auto text-sm">
        {mode === 'type' && (
          <div className="space-y-2">
            {Array.from(byCollection.entries()).map(([col, colNodes]) => {
              const tree = buildTree(colNodes.filter(n => !filter || matches(n, filter)))
              const roots = tree.get(null) ?? []
              if (filter && roots.length === 0 && !colNodes.some(n => matches(n, filter))) return null
              return (
                <div key={col}>
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {COLLECTION_LABELS[col]}
                    </span>
                    <Link
                      href={`/${col}/new`}
                      className="text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      + Add
                    </Link>
                  </div>
                  {filter ? (
                    colNodes.filter(n => matches(n, filter)).map(n => (
                      <TreeNodeRow key={n.id} node={n} depth={0} dragOver={false}
                        onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} />
                    ))
                  ) : (
                    <RenderSubtree
                      parentId={null}
                      tree={buildTree(colNodes)}
                      depth={0}
                      filter={filter}
                      dragOver={dragOver}
                      dragId={dragId}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {mode === 'story' && (
          !hasStories ? (
            <p className="px-2 text-xs text-muted-foreground italic">No stories yet.</p>
          ) : (
            <div className="space-y-1">
              {nodes.filter(n => n.collection === 'stories' && (!filter || matches(n, filter))).map(s => (
                <div key={s.id}>
                  <div className="flex items-center gap-1 px-1">
                    <span className="font-mono text-[10px] text-muted-foreground">{s.code}</span>
                    <Link href={`/stories/${s.code}`} className="text-sm hover:underline">{s.name}</Link>
                  </div>
                  {worldNodes
                    .filter(n => n.storyCode === s.code && (!filter || matches(n, filter)))
                    .map(n => (
                      <div key={n.id} className="pl-4">
                        <TreeNodeRow node={n} depth={0} dragOver={false}
                          onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} />
                      </div>
                    ))
                  }
                </div>
              ))}
            </div>
          )
        )}

        {mode === 'culture' && (
          !hasCultures ? (
            <p className="px-2 text-xs text-muted-foreground italic">No cultures yet.</p>
          ) : (
            <div className="space-y-1">
              {worldNodes.filter(n => n.collection === 'cultures' && (!filter || matches(n, filter))).map(culture => (
                <div key={culture.id}>
                  <div className="flex items-center gap-1 px-1">
                    <span className="font-mono text-[10px] text-muted-foreground">{culture.code}</span>
                    <Link href={`/cultures/${culture.code}`} className="text-sm font-semibold hover:underline">{culture.name}</Link>
                  </div>
                  {worldNodes
                    .filter(n => n.cultureCode === culture.code && n.collection !== 'cultures' && (!filter || matches(n, filter)))
                    .map(n => (
                      <div key={n.id} className="pl-4">
                        <TreeNodeRow node={n} depth={0} dragOver={false}
                          onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} />
                      </div>
                    ))
                  }
                </div>
              ))}
            </div>
          )
        )}

        {mode === 'era' && (
          <p className="px-2 text-xs text-muted-foreground italic">
            Available after eras are added (step W2).
          </p>
        )}
      </div>
    </div>
  )
}

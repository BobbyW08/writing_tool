'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { CollectionTableView, type TableRow } from './collection-table-view'
import { CollectionBoardView } from './collection-board-view'
import type { ListViewConfig } from '@/lib/world/listViews'

type ViewMode = 'list' | 'table' | 'board'

interface CollectionViewSwitchProps {
  collection: string
  listView: ReactNode
  rows: TableRow[]
  config: ListViewConfig
  allTags: { id: number; name: string }[]
}

function storageKey(collection: string) {
  return `traveler:list-view:${collection}`
}

export function CollectionViewSwitch({ collection, listView, rows, config, allTags }: CollectionViewSwitchProps) {
  const [mode, setMode] = useState<ViewMode>('list')

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey(collection))
      if (stored === 'list' || stored === 'table' || stored === 'board') setMode(stored)
    } catch {
      // ignore
    }
  }, [collection])

  function selectMode(next: ViewMode) {
    setMode(next)
    try {
      localStorage.setItem(storageKey(collection), next)
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-md border bg-muted/30 p-0.5 text-sm w-fit">
        {(['list', 'table', 'board'] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => selectMode(m)}
            className={`rounded px-3 py-1 capitalize ${mode === m ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {m}
          </button>
        ))}
      </div>

      {mode === 'list' && listView}
      {mode === 'table' && <CollectionTableView collection={collection} rows={rows} config={config} allTags={allTags} />}
      {mode === 'board' && <CollectionBoardView collection={collection} rows={rows} config={config} />}
    </div>
  )
}

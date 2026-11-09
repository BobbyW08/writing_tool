'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { EditableField } from './editable-field'
import { MultiSelect } from './ui/multi-select'
import { DeleteRecordButton } from './delete-record-button'
import { bulkSetFieldAction, bulkSetTagAction, bulkDeleteAction, updateTagsAction } from '@/lib/world/actions'
import type { ListViewConfig } from '@/lib/world/listViews'

export interface TableRow {
  id: number
  code?: string | null
  name: string
  tagIds?: number[] | null
  tags?: { id: number; name: string }[]
  [key: string]: unknown
}

interface CollectionTableViewProps {
  collection: string
  rows: TableRow[]
  config: ListViewConfig
  allTags: { id: number; name: string }[]
}

function cellHref(collection: string, code: string | null | undefined) {
  if (!code) return '#'
  if (collection === 'events') return `/events/${code}`
  if (collection === 'stories') return `/stories/${code}`
  return `/${collection}/${code}`
}

export function CollectionTableView({ collection, rows: initialRows, config, allTags }: CollectionTableViewProps) {
  const [rows, setRows] = useState(initialRows)
  const [filter, setFilter] = useState('')
  const [sortKey, setSortKey] = useState<string>('code')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [bulkTagId, setBulkTagId] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [skippedMsg, setSkippedMsg] = useState('')

  const tagOptions = useMemo(() => allTags.map(t => ({ value: String(t.id), label: t.name })), [allTags])

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    const list = q
      ? rows.filter(r => r.name.toLowerCase().includes(q) || (r.code ?? '').toLowerCase().includes(q))
      : rows
    return [...list].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      const an = av == null ? '' : av
      const bn = bv == null ? '' : bv
      const cmp = an < bn ? -1 : an > bn ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [rows, filter, sortKey, sortDir])

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  function toggleSelect(id: number) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelected(prev => (prev.size === filtered.length ? new Set() : new Set(filtered.map(r => r.id))))
  }

  async function handleBulkStatus(value: string) {
    const ids = Array.from(selected)
    await bulkSetFieldAction(collection, ids, config.statusField, value)
    setRows(prev => prev.map(r => (ids.includes(r.id) ? { ...r, [config.statusField]: value } : r)))
  }

  async function handleBulkTag(add: boolean) {
    if (!bulkTagId) return
    const tagId = Number(bulkTagId)
    const ids = Array.from(selected)
    await bulkSetTagAction(collection, ids, tagId, add)
    setRows(prev => prev.map(r => {
      if (!ids.includes(r.id)) return r
      const current = r.tagIds ?? []
      const nextIds = add ? Array.from(new Set([...current, tagId])) : current.filter(t => t !== tagId)
      const nextTags = add
        ? [...(r.tags ?? []), allTags.find(t => t.id === tagId)].filter((t): t is { id: number; name: string } => !!t)
        : (r.tags ?? []).filter(t => t.id !== tagId)
      return { ...r, tagIds: nextIds, tags: nextTags }
    }))
  }

  async function handleBulkDelete() {
    const ids = Array.from(selected)
    const result = await bulkDeleteAction(collection, ids)
    setRows(prev => prev.filter(r => !result.deleted.includes(r.id)))
    setSelected(new Set())
    setConfirmingDelete(false)
    setSkippedMsg(result.skipped.length > 0
      ? `${result.skipped.length} record${result.skipped.length === 1 ? '' : 's'} not deleted -- other records still reference them.`
      : '')
  }

  const columns = ['code', 'name', config.statusField, 'tags', ...config.keyFields.map(f => f.name)]

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by name or code"
          className="w-64 rounded border bg-background px-2 py-1 text-sm"
        />
        {selected.size > 0 && (
          <div className="flex flex-1 items-center gap-2 rounded-md border bg-accent/40 px-2 py-1 text-xs">
            <span>{selected.size} selected</span>
            <select
              onChange={(e) => { if (e.target.value) { handleBulkStatus(e.target.value); e.target.value = '' } }}
              className="rounded border bg-background px-1.5 py-1"
              defaultValue=""
            >
              <option value="" disabled>Set status...</option>
              {config.statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={bulkTagId} onChange={(e) => setBulkTagId(e.target.value)} className="rounded border bg-background px-1.5 py-1">
              <option value="">Choose a tag...</option>
              {allTags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <button type="button" onClick={() => handleBulkTag(true)} disabled={!bulkTagId} className="rounded border px-2 py-1 hover:bg-accent disabled:opacity-50">+ Tag</button>
            <button type="button" onClick={() => handleBulkTag(false)} disabled={!bulkTagId} className="rounded border px-2 py-1 hover:bg-accent disabled:opacity-50">- Tag</button>
            <div className="ml-auto flex items-center gap-1">
              {confirmingDelete ? (
                <>
                  <span className="text-destructive">Delete {selected.size}?</span>
                  <button type="button" onClick={handleBulkDelete} className="rounded bg-destructive px-2 py-1 text-destructive-foreground hover:opacity-80">Yes</button>
                  <button type="button" onClick={() => setConfirmingDelete(false)} className="rounded border px-2 py-1 hover:bg-accent">Cancel</button>
                </>
              ) : (
                <button type="button" onClick={() => setConfirmingDelete(true)} className="rounded border border-destructive/40 px-2 py-1 text-destructive hover:bg-destructive/10">Delete selected</button>
              )}
            </div>
          </div>
        )}
      </div>

      {skippedMsg && <p className="text-xs text-muted-foreground">{skippedMsg}</p>}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-left">
              <th className="w-8 p-2">
                <input type="checkbox" checked={selected.size > 0 && selected.size === filtered.length} onChange={toggleSelectAll} />
              </th>
              {columns.map(col => (
                <th key={col} className="cursor-pointer select-none p-2 text-xs font-semibold text-muted-foreground" onClick={() => toggleSort(col)}>
                  {col === config.statusField ? 'Status' : col === 'tags' ? 'Tags' : (config.keyFields.find(f => f.name === col)?.label ?? col[0].toUpperCase() + col.slice(1))}
                  {sortKey === col && (sortDir === 'asc' ? ' ↑' : ' ↓')}
                </th>
              ))}
              <th className="w-10 p-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(row => (
              <tr key={row.id} className="border-b last:border-0 hover:bg-accent/30">
                <td className="p-2">
                  <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleSelect(row.id)} />
                </td>
                <td className="whitespace-nowrap p-2 font-mono text-xs text-muted-foreground">
                  <Link href={cellHref(collection, row.code)} className="hover:underline">{row.code}</Link>
                </td>
                <td className="p-2">
                  <EditableField collection={collection} docId={row.id} fieldName="name" value={row.name} kind="text" />
                </td>
                <td className="p-2">
                  <EditableField collection={collection} docId={row.id} fieldName={config.statusField} value={row[config.statusField] as string} kind="select" options={config.statusOptions} />
                </td>
                <td className="min-w-[160px] p-2">
                  <MultiSelect
                    options={tagOptions}
                    selected={(row.tagIds ?? []).map(String)}
                    onChange={async (values) => {
                      const tagIds = values.map(Number)
                      await updateTagsAction(collection, row.id, tagIds)
                      setRows(prev => prev.map(r => r.id === row.id ? { ...r, tagIds, tags: allTags.filter(t => tagIds.includes(t.id)) } : r))
                    }}
                    placeholder="No tags"
                  />
                </td>
                {config.keyFields.map(f => (
                  <td key={f.name} className="p-2">
                    <EditableField
                      collection={collection}
                      docId={row.id}
                      fieldName={f.name}
                      value={row[f.name] as string | number | boolean | null}
                      kind={f.kind}
                      options={f.options}
                      onSaved={(newValue) => setRows(prev => prev.map(r => r.id === row.id ? { ...r, [f.name]: newValue } : r))}
                    />
                  </td>
                ))}
                <td className="p-2 text-right">
                  <DeleteRecordButton
                    collection={collection}
                    id={row.id}
                    code={row.code ?? String(row.id)}
                    name={row.name}
                    onDeleted={() => setRows(prev => prev.filter(r => r.id !== row.id))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

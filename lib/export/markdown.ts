import 'server-only'
import { getEntryByCode } from '@/lib/world/queries'
import { getLinksForCode } from '@/lib/graph/queries'
import { STATUS_OPTIONS } from '@/lib/world/fields'

// Phase 7: "Export as Markdown" for any entry or event -- header, Status line, labeled details,
// and connections (relationships, plus field-sourced edges like an event's `involves`) written
// out. Pulled from the link index rather than hand-walking each collection's own join tables, so
// this stays correct as new relationship types or fields are added.
function statusLabel(status: string): string {
  return STATUS_OPTIONS.find(o => o.value === status)?.label ?? status
}

export async function buildEntryMarkdown(collection: string, code: string): Promise<string | null> {
  const doc = await getEntryByCode(collection, code) as Record<string, unknown> | null
  if (!doc) return null

  const upperCode = String(doc.code ?? code).toUpperCase()
  const name = String(doc.name ?? upperCode)
  const status = String(doc.status ?? 'in_development')

  const lines: string[] = []
  lines.push(`# ${name}`)
  lines.push('')
  lines.push(`Status: ${statusLabel(status)}`)

  const summary = doc.summary as string | null | undefined
  if (summary) { lines.push(''); lines.push(summary) }

  const body = doc.body as string | null | undefined
  if (body) { lines.push(''); lines.push(body) }

  const details = (doc.details ?? []) as { label: string; value: string }[]
  if (details.length) {
    lines.push('')
    lines.push('## Details')
    for (const d of details) lines.push(`- ${d.label}: ${d.value}`)
  }

  const links = await getLinksForCode(upperCode)
  const connections = links.filter(l => l.edge.source === 'relationship' || l.edge.source === 'field')
  if (connections.length) {
    lines.push('')
    lines.push('## Connections')
    for (const l of connections) lines.push(`- ${l.label} ${l.other.code} ${l.other.name}`)
  }

  lines.push('')
  lines.push(`_${upperCode}_`)
  return lines.join('\n')
}

// "Export compilation" (Phase 7): joins each item's own Markdown export in order into one file.
export async function buildCompilationMarkdown(name: string, items: { code: string; collection: string }[]): Promise<string> {
  const parts: string[] = [`# ${name}`]
  for (const item of items) {
    const md = await buildEntryMarkdown(item.collection, item.code)
    if (md) parts.push(md)
  }
  return parts.join('\n\n---\n\n')
}

'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { saveSheetAnswerAction } from '@/lib/world/actions'
import { CODE_REGEX } from '@/lib/codes'
import type { SheetSection } from '@/lib/sheets/templates'

type CodeMap = Record<string, { name: string; collection: string } | null>
type Status = 'saving' | 'saved' | 'error'

function codesIn(value: string): string[] {
  const re = new RegExp(CODE_REGEX.source, 'g')
  return [...new Set([...value.matchAll(re)].map((m) => m[0]))]
}

// Prompts grouped into collapsible sections. Each answer saves when you leave the box, and any ID
// code typed in an answer (C4, I12) shows underneath as a link to that entry.
export function SheetEditor({
  collection,
  docId,
  sections,
  answers,
  codeMap,
  openFirst = false,
  credit,
}: {
  collection: string
  docId: number
  sections: SheetSection[]
  answers: Record<string, string>
  codeMap: CodeMap
  openFirst?: boolean
  credit?: string
}) {
  const router = useRouter()
  const [values, setValues] = useState<Record<string, string>>(answers)
  const [status, setStatus] = useState<Record<string, Status>>({})
  const lastSaved = useRef<Record<string, string>>({ ...answers })
  // Saves run one after another, because each one rewrites the entry's details column.
  const queue = useRef<Promise<unknown>>(Promise.resolve())

  function save(key: string, label: string) {
    const value = values[key] ?? ''
    if (value.trim() === (lastSaved.current[key] ?? '').trim()) return
    setStatus((s) => ({ ...s, [key]: 'saving' }))
    queue.current = queue.current.then(async () => {
      const result = await saveSheetAnswerAction(collection, docId, key, label, value)
      if (result.ok) {
        lastSaved.current[key] = value
        setStatus((s) => ({ ...s, [key]: 'saved' }))
        // Re-read the page so newly typed codes resolve to names and links.
        if (codesIn(value).length > 0) router.refresh()
      } else {
        setStatus((s) => ({ ...s, [key]: 'error' }))
      }
    })
  }

  return (
    <div className="space-y-2">
      {sections.map((section, i) => {
        const all = section.groups.flatMap((g) => g.fields)
        const answered = all.filter((f) => (values[f.key] ?? '').trim()).length
        return (
          <details key={section.id} open={openFirst && i === 0} className="rounded-md border">
            <summary className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm font-medium">
              <span>{section.title}</span>
              <span className="text-xs font-normal text-muted-foreground">{answered} of {all.length}</span>
            </summary>
            <div className="space-y-5 border-t px-3 py-3">
              {section.intro && <p className="text-xs text-muted-foreground">{section.intro}</p>}
              {section.groups.map((group, gi) => (
                <div key={gi} className="space-y-3">
                  {group.title && (
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.title}</h3>
                  )}
                  {group.fields.map((f) => {
                    const value = values[f.key] ?? ''
                    const linked = codesIn(value).filter((c) => codeMap[c])
                    return (
                      <div key={f.key} className="space-y-1">
                        <label htmlFor={f.key} className="block text-sm font-medium">{f.label}</label>
                        {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
                        <textarea
                          id={f.key}
                          value={value}
                          rows={f.rows ?? 2}
                          onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                          onBlur={() => save(f.key, f.label)}
                          className="w-full resize-y rounded-md border bg-background px-2 py-1.5 text-sm [field-sizing:content]"
                        />
                        {(linked.length > 0 || status[f.key] === 'saving' || status[f.key] === 'error') && (
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                            {linked.map((c) => (
                              <Link
                                key={c}
                                href={`/${codeMap[c]!.collection}/${c}`}
                                className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
                              >
                                {codeMap[c]!.name}
                              </Link>
                            ))}
                            {status[f.key] === 'saving' && <span className="text-muted-foreground">Saving...</span>}
                            {status[f.key] === 'error' && <span className="text-destructive">Could not save</span>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </details>
        )
      })}
      {credit && <p className="text-xs text-muted-foreground">{credit}</p>}
    </div>
  )
}

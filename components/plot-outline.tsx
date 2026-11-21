'use client'

import { useState } from 'react'
import { saveSheetAnswerAction } from '@/lib/world/actions'
import { SheetEditor } from '@/components/sheet-editor'
import { PLOT_TEMPLATES, PLOT_TEMPLATE_KEY, plotSections, plotTemplateById } from '@/lib/sheets/templates'

type CodeMap = Record<string, { name: string; collection: string } | null>

// Every story gets a plot outline. Pick a structure, then write a few sentences for each stage.
export function PlotOutline({
  docId,
  templateId,
  answers,
  codeMap,
}: {
  docId: number
  templateId: string | null
  answers: Record<string, string>
  codeMap: CodeMap
}) {
  const [chosen, setChosen] = useState<string | null>(templateId)
  const template = plotTemplateById(chosen)

  function choose(id: string) {
    setChosen(id)
    saveSheetAnswerAction('stories', docId, PLOT_TEMPLATE_KEY, 'Plot outline structure', id)
  }

  if (!template) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Pick a structure for this story. You can switch later and nothing you wrote is lost.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {PLOT_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => choose(t.id)}
              className="rounded-md border p-3 text-left hover:bg-accent"
            >
              <span className="block text-sm font-medium">{t.title}</span>
              <span className="block text-xs text-muted-foreground">{t.summary}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <select
          value={template.id}
          onChange={(e) => choose(e.target.value)}
          className="rounded-md border bg-background px-2 py-1 text-sm"
          aria-label="Plot outline structure"
        >
          {PLOT_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
        <span className="text-xs text-muted-foreground">{template.summary}</span>
      </div>
      <SheetEditor
        key={template.id}
        collection="stories"
        docId={docId}
        sections={plotSections(template)}
        answers={answers}
        codeMap={codeMap}
        openFirst
        credit={template.credit}
      />
    </div>
  )
}

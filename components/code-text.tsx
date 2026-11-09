import Link from 'next/link'
import { CODE_PREFIX_CHARS } from '@/lib/codes'

const CODE_RE = new RegExp(`(?<![A-Za-z0-9])([${CODE_PREFIX_CHARS}])(\\d{1,6})(?![A-Za-z0-9])`, 'g')

type CodeMap = Record<string, { name: string; collection: string } | null>

const COLLECTION_HREF: Record<string, (code: string) => string> = {
  eras: (code) => `/timeline?era=${code}`, // eras have no read page; they live on the timeline
}
function hrefFor(collection: string, code: string): string {
  return COLLECTION_HREF[collection]?.(code) ?? `/${collection}/${code}`
}

// Renders plain text with ID codes (C4, L1, E27) replaced by named links.
// Pass a pre-resolved codeMap from buildCodeMap() in the parent server component.
// Unknown codes render as plain muted text.
export function CodeText({ text, codeMap, className }: { text: string; codeMap: CodeMap; className?: string }) {
  const segments: React.ReactNode[] = []
  let lastIndex = 0
  let key = 0
  CODE_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = CODE_RE.exec(text))) {
    if (m.index > lastIndex) segments.push(text.slice(lastIndex, m.index))
    const code = m[0]
    const resolved = codeMap[code]
    if (resolved) {
      segments.push(
        <Link
          key={key++}
          href={hrefFor(resolved.collection, code)}
          className="font-medium underline decoration-muted-foreground/50 underline-offset-2 hover:decoration-foreground"
        >
          {resolved.name}
        </Link>
      )
    } else {
      segments.push(
        <span key={key++} className="text-muted-foreground" title={code}>
          {code}
        </span>
      )
    }
    lastIndex = m.index + m[0].length
  }
  if (lastIndex < text.length) segments.push(text.slice(lastIndex))
  return (
    <span className={className} style={{ whiteSpace: 'pre-wrap' }}>
      {segments}
    </span>
  )
}

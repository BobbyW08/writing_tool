import Link from 'next/link'
import { CODE_PREFIX_CHARS } from '@/lib/codes'
import { hrefForNode } from '@/lib/graph/href'

const BARE = `(?<![A-Za-z0-9])[${CODE_PREFIX_CHARS}]\\d{1,6}(?![A-Za-z0-9])`
const LABELED = `\\[([^\\]\\n]*)\\]\\(([${CODE_PREFIX_CHARS}]\\d{1,6})\\)`
// Group 1 and 2 are set for [words as written](C4); otherwise the match is a bare code (C4).
const CODE_RE = new RegExp(`${LABELED}|${BARE}`, 'g')

type CodeMap = Record<string, { name: string; collection: string } | null>

const LINK_CLASS = 'font-medium underline decoration-muted-foreground/50 underline-offset-2 hover:decoration-foreground'

// Renders plain text with ID codes replaced by links. A bare code (C4) shows the entry's name; a
// labeled one ([Bard](C4)) shows the words as written. Pass a pre-resolved codeMap from
// buildCodeMap() in the parent server component. A code with no record renders as plain text.
export function CodeText({ text, codeMap, className }: { text: string; codeMap: CodeMap; className?: string }) {
  const segments: React.ReactNode[] = []
  let lastIndex = 0
  let key = 0
  CODE_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = CODE_RE.exec(text))) {
    if (m.index > lastIndex) segments.push(text.slice(lastIndex, m.index))
    const labeled = m[2] !== undefined
    const code = labeled ? m[2] : m[0]
    const resolved = codeMap[code]
    if (resolved) {
      segments.push(
        <Link key={key++} href={hrefForNode(resolved.collection, code)} className={LINK_CLASS}>
          {labeled ? m[1] : resolved.name}
        </Link>
      )
    } else if (labeled) {
      segments.push(m[1])
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

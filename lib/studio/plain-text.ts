import { CODE_PREFIX_CHARS } from '@/lib/codes'

const LABELED_CODE = new RegExp(`\\[([^\\]\\n]*)\\]\\([${CODE_PREFIX_CHARS}]\\d{1,6}\\)`, 'g')

// The prose with its Markdown marks removed, for the continuity check and word counts. A mention is
// stored as [words as written](C4); only the words are prose, so the code in the brackets never
// reaches the check or the verbatim-quote verification.
export function writingPlainText(markdown: string): string {
  return markdown
    .replace(LABELED_CODE, '$1')
    .replace(/[#*_~`>\[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

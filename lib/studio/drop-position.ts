// Pure helpers for dropping a linked entry into the writing surface. No DOM, no Lexical, so these
// are exercised directly by scripts/test-drop-position.ts.

// Same definition of "word" as the unlinked-names scan (lib/studio/name-index.ts).
export const WORD_CHAR = /[\p{L}\p{N}'’-]/u

// A run of word characters is never split: a drop that lands mid-word snaps to whichever end of
// that word is closer. Already on a boundary (not flanked by word characters on both sides) is
// left alone.
export function snapToWordBoundary(text: string, offset: number): number {
  const before = text[offset - 1]
  const after = text[offset]
  if (!before || !after || !WORD_CHAR.test(before) || !WORD_CHAR.test(after)) return offset
  let start = offset
  while (start > 0 && WORD_CHAR.test(text[start - 1])) start--
  let end = offset
  while (end < text.length && WORD_CHAR.test(text[end])) end++
  return offset - start <= end - offset ? start : end
}

// Dropping on top of an existing linked name: which side of it the pointer is nearer to, so the
// new link lands just before or after rather than splitting the old one.
export function nearerSide(dropX: number, rectLeft: number, rectWidth: number): 'before' | 'after' {
  return dropX < rectLeft + rectWidth / 2 ? 'before' : 'after'
}

// Whether a space needs to be inserted next to the new link: not for the start/end of a line
// (ch is undefined) and not where one already exists.
export function needsSpace(ch: string | undefined): boolean {
  return ch !== undefined && ch !== '' && !/\s/.test(ch)
}

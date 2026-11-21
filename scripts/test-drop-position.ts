// Rules for dropping a linked entry into the writing surface. Run with: npx tsx scripts/test-drop-position.ts
import { snapToWordBoundary, nearerSide, needsSpace } from '../lib/studio/drop-position'

let failed = 0
function check(name: string, ok: boolean, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + detail}`)
  if (!ok) failed++
}

// snapToWordBoundary: a drop in the middle of a word never splits it.
check('a drop closer to the start of the word snaps to its start', snapToWordBoundary('hello', 2) === 0)
check('a drop closer to the end of the word snaps to its end', snapToWordBoundary('hello', 4) === 5)
check('a drop already at a word boundary is left alone', snapToWordBoundary('hello', 0) === 0)
check('a drop between two words is left alone', snapToWordBoundary('one two', 3) === 3)
check('an apostrophe counts as part of the word', snapToWordBoundary("can't go", 3) === 5)
check('a drop at the very end of the text is left alone', snapToWordBoundary('hello', 5) === 5)

// nearerSide: which half of an existing linked name the pointer is over.
check('a drop on the left half of a linked name lands before it', nearerSide(10, 0, 40) === 'before')
check('a drop on the right half of a linked name lands after it', nearerSide(30, 0, 40) === 'after')
check('a drop exactly at the midpoint lands after it', nearerSide(20, 0, 40) === 'after')

// needsSpace: whether a space must be added next to the new link.
check('the start or end of a line needs no leading or trailing space', !needsSpace(undefined))
check('an existing space needs no second space', !needsSpace(' '))
check('a letter right next to the drop needs a space', needsSpace('a'))
check('punctuation right next to the drop needs a space', needsSpace('.'))

console.log(failed === 0 ? '\nAll checks passed.' : `\n${failed} check(s) failed.`)
process.exit(failed === 0 ? 0 : 1)

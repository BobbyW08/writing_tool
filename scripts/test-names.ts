// Rules for linking by name. Run with: npx tsx scripts/test-names.ts
import { buildIndex, suggestForTyping, suggestForAt, findMatches } from '../lib/studio/name-index'

const entries = [
  { code: 'C4', name: 'Bard (Original)', collection: 'characters', aliases: [] as string[] },
  { code: 'C6', name: 'The First Empress', collection: 'characters', aliases: ['Old Empress'] },
  { code: 'C17', name: 'The Sleeper', collection: 'characters', aliases: [] },
  { code: 'C35', name: 'Boy A', collection: 'characters', aliases: [] },
  { code: 'C36', name: 'Boy B', collection: 'characters', aliases: [] },
  { code: 'L1', name: 'Westmark', collection: 'locations', aliases: [] },
  { code: 'L2', name: 'Westmark Pass', collection: 'locations', aliases: [] },
]
const index = buildIndex(entries)

let failed = 0
function check(name: string, ok: boolean, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + detail}`)
  if (!ok) failed++
}
const codes = (s: { suggestions: { entry: { code: string } }[] } | null) => s?.suggestions.map((x) => x.entry.code).join(',') ?? 'none'

// Typing
check('"Bar" suggests Bard and shows the name as written', codes(suggestForTyping(index, 'He met a man named Bar')) === 'C4' && suggestForTyping(index, 'He met a man named Bar')?.suggestions[0].insertText === 'Bard')
check('"Bard" typed in full still offers the link', codes(suggestForTyping(index, 'upon a man, Bard')) === 'C4')
check('the replaced part starts at the typed word', suggestForTyping(index, 'upon a man, Bar')?.start === 12)
check('three words typed: whole phrase is replaced', suggestForTyping(index, 'she saw The First Emp')?.start === 8 && codes(suggestForTyping(index, 'she saw The First Emp')) === 'C6')
check('a later word of a longer name finds it ("Emp")', codes(suggestForTyping(index, 'she saw Emp')) === 'C6')
check('alias is found and written as the alias', suggestForTyping(index, 'the Old Emp')?.suggestions[0].insertText === 'Old Empress')
check('the word "the" alone suggests nothing', suggestForTyping(index, 'He said the') === null)
check('nothing while the caret is after a space', suggestForTyping(index, 'upon a man, Bard ') === null)
check('two letters suggest nothing', suggestForTyping(index, 'a man named Ba') === null)
check('short lowercase word does not pop up', suggestForTyping(index, 'went to the bar') === null)
check('two names starting alike both appear', codes(suggestForTyping(index, 'he reached Westm')).split(',').sort().join(',') === 'L1,L2')

// @
check('"@" with nothing after lists names', suggestForAt(index, '').length > 0)
check('"@" narrows by what follows', codes({ suggestions: suggestForAt(index, 'emp') }) === 'C6')

// Unlinked names
const text = 'Bard found Westmark Pass quiet. Boy A said nothing. The Sleeper stirred. bard is a poet.'
const found = findMatches(index, text).map((m) => `${m.entry.code}:${m.text}`)
check('finds Bard by its short name', found.includes('C4:Bard'), found.join(' '))
check('picks the longer name, not the shorter one inside it', found.includes('L2:Westmark Pass') && !found.includes('L1:Westmark'), found.join(' '))
check('lowercase "bard" is not linked', found.filter((f) => f === 'C4:Bard').length === 1, found.join(' '))
check('names with a space are found', found.includes('C35:Boy A') && found.includes('C17:The Sleeper'), found.join(' '))
check('"Boy" alone does not match Boy A or Boy B', !findMatches(index, 'The Boy ran.').length)

console.log(failed === 0 ? '\nAll checks passed.' : `\n${failed} check(s) failed.`)
process.exit(failed === 0 ? 0 : 1)

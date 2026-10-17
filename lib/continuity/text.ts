// Pure text helpers for the continuity check. Everything that decides what is allowed
// into canon goes through findQuote: a detail only counts if its exact words can be found
// in the author's own text.

export interface Range {
  start: number;
  end: number;
}

// Markdown emphasis marks never count toward matching, so a quote still lines up with
// canon text that was stored with **bold** or `code` around it.
const SKIPPED = new Set(["*", "`"]);

function plainChar(ch: string): string {
  if (ch === "‘" || ch === "’") return "'";
  if (ch === "“" || ch === "”") return '"';
  if (ch === "–" || ch === "—") return "-";
  const lower = ch.toLowerCase();
  return lower.length === 1 ? lower : ch;
}

// Collapses whitespace, flattens typographic quotes and dashes, ignores case, and keeps a
// map from each normalized character back to its index in the original text so callers
// always get the author's original wording back.
function normalizeWithMap(text: string): { norm: string; map: number[] } {
  const chars: string[] = [];
  const map: number[] = [];
  let spaceAt = -1;
  for (let i = 0; i < text.length; i++) {
    const raw = text[i];
    if (SKIPPED.has(raw)) continue;
    if (/\s/.test(raw)) {
      if (chars.length > 0 && spaceAt === -1) spaceAt = i;
      continue;
    }
    if (spaceAt !== -1) {
      chars.push(" ");
      map.push(spaceAt);
      spaceAt = -1;
    }
    chars.push(plainChar(raw));
    map.push(i);
  }
  return { norm: chars.join(""), map };
}

export function normalizeForCompare(text: string): string {
  return normalizeWithMap(text).norm;
}

// True when every run of emphasis marks in the text has a matching partner of the same
// length, opened before it is closed ("*a*", "**a**", "**a *b* c**"). A lone closing "**" fails.
function balanced(text: string): boolean {
  for (const mark of SKIPPED) {
    const stack: number[] = [];
    const runs = text.match(new RegExp(`\\${mark}+`, "g")) ?? [];
    for (const run of runs) {
      if (stack.length > 0 && stack[stack.length - 1] === run.length) stack.pop();
      else stack.push(run.length);
    }
    if (stack.length > 0) return false;
  }
  return true;
}

// Matching ignores emphasis marks, so a span can start or end just inside one (for example
// "Bold* move" out of "*Bold* move"). Widen it over the marks next to its edges when that
// leaves the marks balanced, so the exact wording is returned and removing or replacing the
// span never leaves a stray mark behind.
function settle(text: string, start: number, end: number): Range {
  let s = start;
  while (s > 0 && SKIPPED.has(text[s - 1])) s--;
  let e = end;
  while (e < text.length && SKIPPED.has(text[e])) e++;
  const variants: [number, number][] = [
    [s, e],
    [s, end],
    [start, e],
    [start, end],
  ];
  for (const [a, b] of variants) {
    if (balanced(text.slice(a, b))) return { start: a, end: b };
  }
  return { start, end };
}

export function findQuote(haystack: string, needle: string): Range | null {
  const target = normalizeForCompare(needle);
  if (target.length < 3) return null;
  const h = normalizeWithMap(haystack);
  const idx = h.norm.indexOf(target);
  if (idx === -1) return null;
  return settle(haystack, h.map[idx], h.map[idx + target.length - 1] + 1);
}

// The exact original wording for a quote, or null if the quote is not really in the text.
export function verbatim(haystack: string, needle: string): string | null {
  const range = findQuote(haystack, needle);
  return range ? haystack.slice(range.start, range.end) : null;
}

export function containsText(haystack: string, needle: string): boolean {
  return findQuote(haystack, needle) !== null;
}

export function replaceRange(text: string, range: Range, replacement: string): string {
  return text.slice(0, range.start) + replacement + text.slice(range.end);
}

export interface Passage {
  text: string;
  start: number; // highlight range, relative to `text`
  end: number;
  cutBefore: boolean;
  cutAfter: boolean;
}

// The paragraph that holds a range (so the author sees the surrounding words), trimmed to
// a window when the paragraph is very long.
export function passageAround(text: string, range: Range, maxSide = 700): Passage {
  const before = text.lastIndexOf("\n\n", range.start);
  const afterIdx = text.indexOf("\n\n", range.end);
  let from = before === -1 ? 0 : before + 2;
  let to = afterIdx === -1 ? text.length : afterIdx;
  let cutBefore = false;
  let cutAfter = false;
  if (range.start - from > maxSide) {
    from = range.start - maxSide;
    cutBefore = true;
  }
  if (to - range.end > maxSide) {
    to = range.end + maxSide;
    cutAfter = true;
  }
  return { text: text.slice(from, to), start: range.start - from, end: range.end - from, cutBefore, cutAfter };
}

export function titleCaseLabel(label: string): string {
  return label
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 40)
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

// Reuses an existing field key when the label matches one ignoring case, so a new detail
// about "appearance" lands under the "Appearance" field that is already there.
export function resolveLabel(existingKeys: string[], label: string): string {
  const wanted = label.trim().toLowerCase();
  const hit = existingKeys.find((k) => k.trim().toLowerCase() === wanted);
  return hit ?? titleCaseLabel(label);
}

export function appendToField(current: string | undefined, addition: string): string {
  return current && current.trim() ? `${current.trim()}\n\n${addition}` : addition;
}

export function buildNewRecordGapPrompt(snippetTitle: string, expected: string[], coveredLabels: string[]): string {
  const covered = new Set(coveredLabels.map((l) => l.toLowerCase()));
  const missing = expected.filter((l) => !covered.has(l.toLowerCase()));
  const tail = missing.length > 0 ? ` Not yet described: ${missing.join(", ")}.` : "";
  return `Created automatically from "${snippetTitle}". Everything recorded here is quoted from that snippet.${tail}`;
}

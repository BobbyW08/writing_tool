// Shared low-level markdown helpers for Phase 2 ingestion. The source docs were
// exported from Google Docs with CommonMark backslash-escaping applied to
// punctuation (e.g. "\[\[Locations\#Renmark|Renmark\]\]" instead of
// "[[Locations#Renmark|Renmark]]") — unescape before any further parsing.
export function unescapeMarkdown(text: string): string {
  return text.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\]^_`{|}~])/g, "$1");
}

export interface HeaderBlock {
  level: 2 | 3;
  headerText: string;
  bodyLines: string[];
}

// Splits a markdown file (already unescaped) into blocks by "## "/"### " headers.
// Each block's bodyLines run until the next "##"/"###" header (or EOF).
export function splitByHeaders(text: string): HeaderBlock[] {
  const lines = text.split(/\r?\n/);
  const blocks: HeaderBlock[] = [];
  let current: HeaderBlock | null = null;

  for (const line of lines) {
    const match = line.match(/^(#{2,3})\s+(.+?)\s*$/);
    if (match) {
      if (current) blocks.push(current);
      current = { level: match[1].length as 2 | 3, headerText: match[2], bodyLines: [] };
    } else if (current) {
      current.bodyLines.push(line);
    }
  }
  if (current) blocks.push(current);
  return blocks;
}

const STATUS_RE = /^\*{0,2}Status:\*{0,2}\s*(.+?)\s*$/i;

export interface StatusInfo {
  raw: string; // e.g. "✓ Locked", "~ In development"
  note: string | null; // text after a "|" divider, e.g. "Protagonist"
}

// Looks for a Status: line within the first couple of non-blank lines of a block —
// this is what distinguishes an actual entity block from a pure grouping header
// (e.g. "## CONFIRMED SUPPORTING CHARACTERS" has no Status: line and produces no entity).
export function findStatusLine(bodyLines: string[]): { status: StatusInfo; consumedIndex: number } | null {
  let nonBlankSeen = 0;
  for (let i = 0; i < bodyLines.length; i++) {
    const line = bodyLines[i].trim();
    if (line === "") continue;
    nonBlankSeen++;
    const match = line.match(STATUS_RE);
    if (match) {
      const [rawStatus, ...noteParts] = match[1].split("|");
      const note = noteParts.join("|").trim();
      return { status: { raw: rawStatus.trim(), note: note || null }, consumedIndex: i };
    }
    if (nonBlankSeen >= 2) return null; // Status: has to be essentially the first line.
  }
  return null;
}

export function mapStatusToEnum(rawStatus: string): "locked" | "in_development" | "needs_name" | "placeholder" {
  const lower = rawStatus.toLowerCase();
  if (rawStatus.startsWith("✓")) return "locked";
  if (lower.includes("needs a name") || lower.includes("needs specific")) return "needs_name";
  if (rawStatus.startsWith("?")) return "placeholder";
  return "in_development"; // covers "~ In development", "~ Floating", "~ Established" variants, etc.
}

// Splits a markdown table row on "|", but ignores "|" characters inside [[wiki-links]]
// (the alias divider, e.g. "[[Locations#Renmark|Renmark]]") so link cells don't get
// torn in half. Returns the inner cells only (outer leading/trailing "|" dropped).
export function splitTableRow(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let depth = 0;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === "[" && line[i + 1] === "[") {
      depth++;
      current += "[[";
      i++;
      continue;
    }
    if (ch === "]" && line[i + 1] === "]") {
      depth--;
      current += "]]";
      i++;
      continue;
    }
    if (ch === "|" && depth === 0) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  // A well-formed row is "| a | b | c |" — split gives ["", "a", "b", "c", ""].
  if (cells[0] === "") cells.shift();
  if (cells[cells.length - 1] === "") cells.pop();
  return cells;
}

const FIELD_LABEL_RE = /^\*{0,2}([A-Za-z][A-Za-z0-9 /'()\-]{1,60}):\*{0,2}\s*(.*)$/;

// Loose "labeled paragraph" field extraction: paragraphs are separated by blank
// lines; a paragraph starting with "Label:" (optionally bold) opens a new field,
// and unlabeled paragraphs are appended to whichever field is currently open (or
// to "summary" if none is open yet, e.g. the lead descriptive paragraph after Status:).
export function parseLabeledFields(bodyLines: string[]): Record<string, string> {
  const fields: Record<string, string> = {};
  let currentKey: string | null = null;
  let currentParagraph: string[] = [];

  const flushParagraph = () => {
    if (currentParagraph.length === 0) return;
    const text = currentParagraph.join(" ").trim();
    currentParagraph = [];
    if (!text) return;
    const key = currentKey ?? "summary";
    fields[key] = fields[key] ? `${fields[key]}\n\n${text}` : text;
  };

  for (const rawLine of bodyLines) {
    const line = rawLine.trim();
    if (line === "") {
      flushParagraph();
      continue;
    }
    const match = line.match(FIELD_LABEL_RE);
    if (match) {
      flushParagraph();
      currentKey = match[1].trim();
      currentParagraph = match[2] ? [match[2]] : [];
    } else {
      currentParagraph.push(line);
    }
  }
  flushParagraph();

  return fields;
}

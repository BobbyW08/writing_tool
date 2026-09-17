import { splitTableRow, unescapeMarkdown } from "./markdown";
import { extractWikiLinks, type WikiLink } from "./wikilinks";
import { slugify } from "./slug";

export interface ParsedTimelineEvent {
  title: string;
  slug: string;
  yearLabel: string | null;
  sortOrder: number | null;
  locationLink: WikiLink | null;
  linkedEntities: { link: WikiLink; role: string | null }[];
  sourceDocId: string;
}

const STOPWORDS = new Set([
  "the", "a", "an", "of", "to", "and", "at", "in", "on", "is", "was", "he", "his",
  "her", "she", "it", "its", "they", "them", "that", "this", "with", "for", "from",
  "by", "as", "but", "or", "be", "are", "were", "has", "have", "had",
]);

function significantWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/\[\[[^\]]*\]\]/g, "")
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3 && !STOPWORDS.has(w)),
  );
}

function stripToPlainText(text: string): string {
  return text
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\*\*/g, "")
    .trim();
}

// Timeline.md's ERA tables are a compact index of the same 2,000-year story
// already told in full in Events.md — most rows either explicitly link to an
// Events.md entry ([[Events#X]]) or restate one closely enough (same Age, shared
// key words) that ingesting them too would create a near-duplicate event. Only
// rows with no existing counterpart represent genuinely new content.
function isDuplicateOfExisting(
  rowText: string,
  age: number | null,
  existingEvents: { title: string; sortOrder: number | null }[],
): boolean {
  if (age === null) return false;
  const rowWords = significantWords(rowText);
  return existingEvents.some((e) => {
    if (e.sortOrder !== age) return false;
    const titleWords = significantWords(e.title);
    for (const w of titleWords) if (rowWords.has(w)) return true;
    return false;
  });
}

export function parseTimelineFile(
  rawText: string,
  sourceDocId: string,
  existingEvents: { title: string; sortOrder: number | null }[],
  existingEventSlugs: Set<string>,
): { events: ParsedTimelineEvent[]; skippedAsDuplicate: number; danglingEventLinks: string[] } {
  const text = unescapeMarkdown(rawText);
  const lines = text.split(/\r?\n/);

  const startIndex = lines.findIndex((l) => /^##\s+ERA ONE/i.test(l.trim()));
  const endIndex = lines.findIndex((l) => /^##\s+UNFILLED GAPS/i.test(l.trim()));
  const sectionLines = startIndex === -1 ? [] : lines.slice(startIndex, endIndex === -1 ? undefined : endIndex);

  const events: ParsedTimelineEvent[] = [];
  const seenSlugs = new Set<string>();
  const danglingEventLinks: string[] = [];
  let skippedAsDuplicate = 0;

  for (const raw of sectionLines) {
    const line = raw.trim();
    if (!line.startsWith("|")) continue;
    const cells = splitTableRow(line);
    if (cells.length < 3) continue;
    const [ageRaw, eventText, status] = cells;
    if (!ageRaw || ageRaw === "Age" || /^:?-+:?$/.test(ageRaw)) continue; // header/separator row
    if (status?.toUpperCase() === "GAP") continue; // a gap is an absence, not an event

    const links = extractWikiLinks(eventText);
    const eventLink = links.find((l) => l.targetType === "Events");
    if (eventLink) {
      const candidates = [eventLink.targetName, `The ${eventLink.targetName}`].map(slugify);
      if (candidates.some((c) => existingEventSlugs.has(c))) {
        continue; // genuinely already covered by an Events.md entry
      }
      danglingEventLinks.push(`Timeline.md row (Age ${ageRaw}) links to [[Events#${eventLink.targetName}]], which doesn't exist in Events.md`);
      // fall through — ingest this row's own content rather than silently dropping it
    }

    const numMatch = ageRaw.match(/\d+/);
    const age = numMatch ? Number(numMatch[0]) : null;
    const title = stripToPlainText(eventText);
    if (!title) continue;

    if (isDuplicateOfExisting(title, age, existingEvents)) {
      skippedAsDuplicate++;
      continue;
    }

    const locationLink = links.find((l) => l.targetType === "Locations") ?? null;
    const linkedEntities = links
      .filter((l) => l.targetType !== "Events")
      .filter((l) => !(locationLink && l.targetType === locationLink.targetType && l.targetName === locationLink.targetName))
      .map((link) => ({ link, role: link.targetType === "Locations" ? "location" : null }));

    let slug = slugify(title);
    if (seenSlugs.has(slug)) {
      let n = 2;
      while (seenSlugs.has(`${slug}-${n}`)) n++;
      slug = `${slug}-${n}`;
    }
    seenSlugs.add(slug);

    events.push({
      title,
      slug,
      yearLabel: `Age ${ageRaw}`,
      sortOrder: age,
      locationLink,
      linkedEntities,
      sourceDocId,
    });
  }

  return { events, skippedAsDuplicate, danglingEventLinks };
}

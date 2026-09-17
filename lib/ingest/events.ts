import { parseLabeledFields, splitByHeaders, splitTableRow, unescapeMarkdown } from "./markdown";
import { extractWikiLinks, type WikiLink } from "./wikilinks";
import { slugify } from "./slug";

export interface ParsedEvent {
  title: string;
  slug: string;
  yearLabel: string | null;
  sortOrder: number | null;
  locationLink: WikiLink | null;
  linkedEntities: { link: WikiLink; role: string | null }[]; // -> event_links
  whatHappened: string | null;
  whyItHappened: string | null;
  whatItCaused: string | null;
  whatWasLearned: string | null;
  draftText: string | null; // everything that doesn't map to the 4 fixed fields above
  sourceDocId: string;
}

const AGE_LINE_RE = /^Age\s+([^|]+)/i;

function keyToFixedColumn(key: string): "whatHappened" | "whyItHappened" | "whatItCaused" | "whatWasLearned" | null {
  const k = key.toLowerCase().trim();
  if (k === "what happened") return "whatHappened";
  if (k === "why it happened") return "whyItHappened";
  if (k === "ripples forward" || k === "what it caused") return "whatItCaused";
  if (k.startsWith("what sero learned")) return "whatWasLearned";
  return null;
}

function buildEventFromFields(
  title: string,
  headerLine: string | null,
  fields: Record<string, string>,
  bodyText: string,
  sourceDocId: string,
  seenSlugs: Set<string>,
): ParsedEvent {
  let yearLabel: string | null = null;
  let sortOrder: number | null = null;
  if (headerLine) {
    const ageMatch = headerLine.match(AGE_LINE_RE);
    if (ageMatch) {
      yearLabel = `Age ${ageMatch[1].trim()}`;
      const numMatch = ageMatch[1].match(/\d+/);
      if (numMatch) sortOrder = Number(numMatch[0]);
    }
  }

  const fixed: Record<string, string> = {};
  const extras: string[] = [];
  for (const [key, value] of Object.entries(fields)) {
    const column = keyToFixedColumn(key);
    if (column) {
      fixed[column] = value;
    } else if (key !== "summary" || value.trim()) {
      extras.push(key === "summary" ? value : `${key}: ${value}`);
    }
  }

  const bodyLinks = extractWikiLinks(bodyText);
  const headerLinks = headerLine ? extractWikiLinks(headerLine) : [];
  const allLinks = [...headerLinks, ...bodyLinks];
  const locationLink = allLinks.find((l) => l.targetType === "Locations") ?? null;

  const seen = new Set<string>();
  const linkedEntities: { link: WikiLink; role: string | null }[] = [];
  for (const link of allLinks) {
    const key = `${link.targetType}#${link.targetName}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (locationLink && link.targetType === locationLink.targetType && link.targetName === locationLink.targetName) {
      continue; // already represented via location_id, don't duplicate as a link
    }
    linkedEntities.push({ link, role: link.targetType === "Locations" ? "location" : null });
  }

  let slug = slugify(title);
  if (seenSlugs.has(slug)) {
    let n = 2;
    while (seenSlugs.has(`${slug}-${n}`)) n++;
    slug = `${slug}-${n}`;
  }
  seenSlugs.add(slug);

  return {
    title,
    slug,
    yearLabel,
    sortOrder,
    locationLink,
    linkedEntities,
    whatHappened: fixed.whatHappened ?? null,
    whyItHappened: fixed.whyItHappened ?? null,
    whatItCaused: fixed.whatItCaused ?? null,
    whatWasLearned: fixed.whatWasLearned ?? null,
    draftText: extras.length ? extras.join("\n\n") : null,
    sourceDocId,
  };
}

// The "EVENTS TO BE DEVELOPED" section is a markdown table
// (| Event | Age | Type | Notes |), not ###-headed blocks — parsed separately.
function parseDevelopmentTable(bodyLines: string[], sourceDocId: string, seenSlugs: Set<string>): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  for (const raw of bodyLines) {
    const line = raw.trim();
    if (!line.startsWith("|")) continue;
    const cells = splitTableRow(line);
    if (cells.length < 2) continue;
    const [eventName, age, , notes] = cells;
    if (!eventName || eventName === "Event" || /^:?-+:?$/.test(eventName)) continue; // header/separator row

    let slug = slugify(eventName);
    if (seenSlugs.has(slug)) {
      let n = 2;
      while (seenSlugs.has(`${slug}-${n}`)) n++;
      slug = `${slug}-${n}`;
    }
    seenSlugs.add(slug);

    const numMatch = age?.match(/\d+/);
    events.push({
      title: eventName,
      slug,
      yearLabel: age ? `Age ${age}` : null,
      sortOrder: numMatch ? Number(numMatch[0]) : null,
      locationLink: null,
      linkedEntities: [],
      whatHappened: null,
      whyItHappened: null,
      whatItCaused: null,
      whatWasLearned: null,
      draftText: notes || null,
      sourceDocId,
    });
  }
  return events;
}

export function parseEventsFile(rawText: string, sourceDocId: string): { events: ParsedEvent[] } {
  const text = unescapeMarkdown(rawText);
  const blocks = splitByHeaders(text);
  const events: ParsedEvent[] = [];
  const seenSlugs = new Set<string>();

  for (const block of blocks) {
    if (block.level === 2 && block.headerText.trim().toUpperCase() === "EVENTS TO BE DEVELOPED") {
      events.push(...parseDevelopmentTable(block.bodyLines, sourceDocId, seenSlugs));
      continue;
    }
    if (block.level !== 3) continue; // ## headers besides the table above are pure grouping headers

    const firstNonBlankIndex = block.bodyLines.findIndex((l) => l.trim() !== "");
    if (firstNonBlankIndex === -1) continue;
    const headerLine = block.bodyLines[firstNonBlankIndex];
    if (!AGE_LINE_RE.test(headerLine)) continue; // doesn't match the event template — skip rather than guess

    const restLines = block.bodyLines.filter((_, i) => i !== firstNonBlankIndex);
    const fields = parseLabeledFields(restLines);
    const bodyText = restLines.join("\n");

    events.push(buildEventFromFields(block.headerText.trim(), headerLine, fields, bodyText, sourceDocId, seenSlugs));
  }

  return { events };
}

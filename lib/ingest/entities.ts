import { findStatusLine, mapStatusToEnum, parseLabeledFields, splitByHeaders, unescapeMarkdown } from "./markdown";
import { extractWikiLinks, type WikiLink } from "./wikilinks";
import { slugify } from "./slug";

export interface ParsedEntity {
  type: string;
  name: string;
  slug: string;
  status: "locked" | "in_development" | "needs_name" | "placeholder";
  fields: Record<string, string>;
  sourceDocId: string;
  wikiLinks: WikiLink[]; // resolved into `relationships` rows by the orchestrator
}

export interface EntityParseWarning {
  sourceDocId: string;
  headerText: string;
  reason: string;
}

export function parseEntityFile(
  rawText: string,
  entityType: string,
  sourceDocId: string,
): { entities: ParsedEntity[]; warnings: EntityParseWarning[] } {
  const text = unescapeMarkdown(rawText);
  const blocks = splitByHeaders(text);
  const entities: ParsedEntity[] = [];
  const warnings: EntityParseWarning[] = [];
  const seenSlugs = new Set<string>();

  for (const block of blocks) {
    const found = findStatusLine(block.bodyLines);
    if (!found) continue; // grouping header (e.g. "## WILD CARDS") — not an entity itself

    const name = block.headerText.replace(/\*\*/g, "").trim();
    const bodyWithoutStatus = block.bodyLines.filter((_, i) => i !== found.consumedIndex);
    const fields = parseLabeledFields(bodyWithoutStatus);
    if (found.status.note) fields.role = found.status.note;

    let slug = slugify(name);
    if (seenSlugs.has(slug)) {
      let n = 2;
      while (seenSlugs.has(`${slug}-${n}`)) n++;
      warnings.push({ sourceDocId, headerText: name, reason: `duplicate slug "${slug}", using "${slug}-${n}"` });
      slug = `${slug}-${n}`;
    }
    seenSlugs.add(slug);

    const wikiLinks = extractWikiLinks(bodyWithoutStatus.join("\n"));

    entities.push({
      type: entityType,
      name,
      slug,
      status: mapStatusToEnum(found.status.raw),
      fields,
      sourceDocId,
      wikiLinks,
    });
  }

  return { entities, warnings };
}

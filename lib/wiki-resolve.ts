import { entityTypeByDbType } from "@/lib/data/entity-types";
import { slugify } from "@/lib/ingest/slug";

// Maps the raw "Type" text inside [[Type#Name|Label]] (as written in the source docs
// and preserved verbatim in stored fields/draft_text) to this app's entities.type value.
export const WIKI_TYPE_TO_DB_TYPE: Record<string, string> = {
  Characters: "character",
  Locations: "location",
  Items: "item",
  Cultures: "culture",
  Races: "race",
  Languages: "language",
  Artifacts: "artifact",
};

export interface WikiResolveMaps {
  entitiesBySlug: Map<string, { type: string; slug: string }>; // key: `${dbType}:${slug}`
  eventsBySlug: Map<string, { slug: string }>; // key: slug
}

export function buildWikiResolveMaps(
  entities: { type: string; slug: string }[],
  events: { slug: string | null }[],
): WikiResolveMaps {
  const entitiesBySlug = new Map<string, { type: string; slug: string }>();
  for (const e of entities) entitiesBySlug.set(`${e.type}:${e.slug}`, e);
  const eventsBySlug = new Map<string, { slug: string }>();
  for (const e of events) if (e.slug) eventsBySlug.set(e.slug, { slug: e.slug });
  return { entitiesBySlug, eventsBySlug };
}

// Mirrors how scripts/ingest.ts resolves the same [[Type#Name]] syntax to a row —
// slugify(targetName) against the same stored `slug` column, not a re-derived name match.
export function resolveWikiLink(maps: WikiResolveMaps, targetType: string, targetName: string): { href: string } | null {
  const slug = slugify(targetName);
  if (targetType === "Events") {
    const ev = maps.eventsBySlug.get(slug);
    return ev ? { href: `/events/${ev.slug}` } : null;
  }
  const dbType = WIKI_TYPE_TO_DB_TYPE[targetType];
  if (!dbType) return null;
  const entity = maps.entitiesBySlug.get(`${dbType}:${slug}`);
  if (!entity) return null;
  const typeConfig = entityTypeByDbType(entity.type);
  return typeConfig ? { href: `/${typeConfig.urlSlug}/${entity.slug}` } : null;
}

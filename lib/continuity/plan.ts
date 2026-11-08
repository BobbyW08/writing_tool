import { slugify } from "@/db/codes";
import { containsText, findQuote, normalizeForCompare, resolveLabel, verbatim } from "./text";
import type { EntityDbType } from "./constants";
import type { CompareResult, DetectResult, EntityForCheck, SnippetForCheck } from "./types";

// Turns the model's raw answers into a plan of exactly what may be written to canon.
// This is where the "never add a detail Bobby did not write" rule is enforced: every
// quote has to be found, word for word, in the snippet, and every canon excerpt has to be
// found in the entity's current fields. Anything the model made up is discarded here.

export interface PlannedNewEntity {
  name: string;
  type: EntityDbType;
  details: { label: string; quote: string }[];
}

export interface PlannedFlag {
  entityId: string;
  kind: "conflict" | "possible_change";
  fieldLabel: string;
  existingExcerpt: string;
  newQuote: string;
  explanation: string;
}

export interface Plan {
  newEntities: PlannedNewEntity[];
  confirmations: { entityId: string; fieldLabel: string; quote: string }[];
  newDetails: { entityId: string; label: string; quote: string }[];
  flags: PlannedFlag[];
  discarded: number;
}

const MAX_QUOTE = 600;

export function filterDetect(
  detect: DetectResult,
  entities: EntityForCheck[],
  body: string,
): { mentioned: EntityForCheck[]; candidates: { name: string; type: EntityDbType }[] } {
  const bySlug = new Map(entities.map((e) => [e.slug, e]));
  const mentioned: EntityForCheck[] = [];
  const seen = new Set<string>();
  for (const m of detect.mentioned) {
    const e = bySlug.get(m.slug.trim());
    if (e && !seen.has(e.slug)) {
      seen.add(e.slug);
      mentioned.push(e);
    }
  }

  const knownSlugs = new Set(entities.map((e) => e.slug));
  const candidates: { name: string; type: EntityDbType }[] = [];
  const candidateSlugs = new Set<string>();
  for (const c of detect.newEntities) {
    const name = c.name.trim();
    const slug = slugify(name);
    if (!name || !slug) continue;
    if (!findQuote(body, name)) continue; // the name has to be in the writing
    if (knownSlugs.has(slug) || candidateSlugs.has(slug)) continue; // already recorded, or already listed
    candidateSlugs.add(slug);
    candidates.push({ name, type: c.type });
  }
  return { mentioned, candidates };
}

// Finds the canon field and exact wording a finding points at. The label the model gave is
// tried first, then every field, so a wrong label does not lose a real finding.
function locateCanon(fields: Record<string, string>, canonLabel: string, excerpt: string): { label: string; excerpt: string } | null {
  if (!excerpt.trim()) return null;
  const keys = Object.keys(fields);
  const preferred = keys.find((k) => k.trim().toLowerCase() === canonLabel.trim().toLowerCase());
  const ordered = preferred ? [preferred, ...keys.filter((k) => k !== preferred)] : keys;
  for (const key of ordered) {
    const exact = verbatim(fields[key] ?? "", excerpt);
    if (exact) return { label: key, excerpt: exact };
  }
  return null;
}

export function buildPlan(input: {
  snippet: SnippetForCheck;
  mentioned: EntityForCheck[];
  candidates: { name: string; type: EntityDbType }[];
  compare: CompareResult;
  // `${entityId}::${canon field label, lower case}` -> timeline position of the most recent
  // snippet that set that field. Lets a later scene count as a possible change, not a conflict.
  priorAges: Map<string, number>;
}): Plan {
  const { snippet, compare, priorAges } = input;
  const bySlug = new Map(input.mentioned.map((e) => [e.slug, e]));
  const candidateBySlug = new Map(input.candidates.map((c) => [slugify(c.name), c]));
  const newByName = new Map<string, PlannedNewEntity>();

  const plan: Plan = { newEntities: [], confirmations: [], newDetails: [], flags: [], discarded: 0 };
  const seen = new Set<string>();
  const firstTime = (...parts: string[]) => {
    const key = parts.map((p) => normalizeForCompare(p)).join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  };

  for (const f of compare.findings) {
    const quote = verbatim(snippet.body, f.quote);
    if (!quote || quote.length > MAX_QUOTE || !f.label.trim()) {
      plan.discarded++;
      continue;
    }

    const entity = bySlug.get(f.entity.trim());
    if (!entity) {
      // Only new details can be about an entry that does not exist yet.
      const candidate = candidateBySlug.get(slugify(f.entity));
      if (!candidate || f.kind !== "new_detail") {
        plan.discarded++;
        continue;
      }
      let planned = newByName.get(slugify(candidate.name));
      if (!planned) {
        planned = { name: candidate.name, type: candidate.type, details: [] };
        newByName.set(slugify(candidate.name), planned);
      }
      const label = resolveLabel(
        planned.details.map((d) => d.label),
        f.label,
      );
      if (firstTime(candidate.name, label, quote)) planned.details.push({ label, quote });
      continue;
    }

    const keys = Object.keys(entity.fields);

    if (f.kind === "new_detail") {
      const covered = keys.find((k) => containsText(entity.fields[k] ?? "", quote));
      if (covered) {
        if (firstTime(entity.id, "match", covered, quote)) plan.confirmations.push({ entityId: entity.id, fieldLabel: covered, quote });
        continue;
      }
      const label = resolveLabel(keys, f.label);
      if (firstTime(entity.id, "new", label, quote)) plan.newDetails.push({ entityId: entity.id, label, quote });
      continue;
    }

    const canon = locateCanon(entity.fields, f.canonLabel, f.canonExcerpt);
    if (!canon) {
      plan.discarded++;
      continue;
    }

    if (f.kind === "match" || normalizeForCompare(canon.excerpt) === normalizeForCompare(quote)) {
      if (firstTime(entity.id, "match", canon.label, quote)) plan.confirmations.push({ entityId: entity.id, fieldLabel: canon.label, quote });
      continue;
    }

    const age = snippet.sortOrder;
    const prior = priorAges.get(`${entity.id}::${canon.label.trim().toLowerCase()}`);
    const developed = age !== null && ((prior !== undefined && prior < age) || f.maybeDevelopment);
    if (firstTime(entity.id, "flag", canon.label, quote)) {
      plan.flags.push({
        entityId: entity.id,
        kind: developed ? "possible_change" : "conflict",
        fieldLabel: canon.label,
        existingExcerpt: canon.excerpt,
        newQuote: quote,
        explanation: f.explanation.trim(),
      });
    }
  }

  plan.newEntities = [...newByName.values()].filter((e) => e.details.length > 0);
  return plan;
}

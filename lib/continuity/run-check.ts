import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNotNull, lt, ne, or, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { db } from "@/lib/db";
import { continuityFlags, entities, fieldHistory, snippetConfirmations, snippets } from "@/lib/db/schema";
import { entityExistsWithSlug } from "@/lib/data/entities";
import { slugify } from "@/lib/ingest/slug";
import { aiAnalyzer, type Analyzer } from "./analyze";
import { EXPECTED_LABELS } from "./constants";
import { buildPlan, filterDetect, type Plan } from "./plan";
import type { EntityForCheck, SnippetForCheck } from "./types";
import { appendToField, buildNewRecordGapPrompt, normalizeForCompare } from "./text";

const STALE_CHECK_MS = 10 * 60 * 1000;

type Batch = [BatchItem<"pg">, ...BatchItem<"pg">[]];

// Marks a snippet as being checked. Returns false when a check is already running, so two
// saves in a row cannot run the same check twice. A check stuck for ten minutes counts as dead.
export async function claimCheck(snippetId: string): Promise<boolean> {
  const staleBefore = new Date(Date.now() - STALE_CHECK_MS);
  const rows = await db
    .update(snippets)
    .set({ checkStatus: "checking", checkStartedAt: new Date(), checkError: null })
    .where(and(eq(snippets.id, snippetId), or(ne(snippets.checkStatus, "checking"), lt(snippets.checkStartedAt, staleBefore))))
    .returning({ id: snippets.id });
  return rows.length > 0;
}

export async function runContinuityCheck(snippetId: string, analyzer: Analyzer = aiAnalyzer): Promise<void> {
  try {
    const [snippet] = await db.select().from(snippets).where(eq(snippets.id, snippetId)).limit(1);
    if (!snippet) return;

    const allEntities: EntityForCheck[] = await db
      .select({ id: entities.id, slug: entities.slug, name: entities.name, type: entities.type, fields: entities.fields })
      .from(entities);

    const snippetInput: SnippetForCheck = {
      title: snippet.title,
      label: snippet.label,
      body: snippet.body,
      sortOrder: snippet.sortOrder === null ? null : Number(snippet.sortOrder),
    };

    const detect = await analyzer.detect({ snippet: snippetInput, index: allEntities });
    const { mentioned, candidates } = filterDetect(detect, allEntities, snippet.body);
    const compare =
      mentioned.length > 0 || candidates.length > 0
        ? await analyzer.compare({ snippet: snippetInput, mentioned, candidates })
        : { findings: [] };

    const priorAges = await loadPriorAges(
      mentioned.map((e) => e.id),
      snippet.id,
    );
    const plan = buildPlan({ snippet: snippetInput, mentioned, candidates, compare, priorAges });

    await applyPlan(snippet.id, snippet.title, plan);

    const notes =
      plan.discarded > 0
        ? `${plan.discarded} finding${plan.discarded === 1 ? " was" : "s were"} discarded because the exact wording could not be found in your text or in canon.`
        : null;
    await db
      .update(snippets)
      .set({ checkStatus: "checked", checkedAt: new Date(), checkNotes: notes, checkError: null })
      .where(eq(snippets.id, snippet.id));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(snippets)
      .set({ checkStatus: "failed", checkError: message.slice(0, 1000) })
      .where(eq(snippets.id, snippetId));
  }
}

async function loadPriorAges(entityIds: string[], currentSnippetId: string): Promise<Map<string, number>> {
  const ages = new Map<string, number>();
  if (entityIds.length === 0) return ages;
  const rows = await db
    .select({
      entityId: fieldHistory.entityId,
      label: fieldHistory.fieldLabel,
      age: sql<string>`max(${snippets.sortOrder})`,
    })
    .from(fieldHistory)
    .innerJoin(snippets, eq(snippets.id, fieldHistory.snippetId))
    .where(and(inArray(fieldHistory.entityId, entityIds), ne(fieldHistory.snippetId, currentSnippetId), isNotNull(snippets.sortOrder)))
    .groupBy(fieldHistory.entityId, fieldHistory.fieldLabel);
  for (const r of rows) ages.set(`${r.entityId}::${r.label.trim().toLowerCase()}`, Number(r.age));
  return ages;
}

async function freeSlug(name: string): Promise<string> {
  const base = slugify(name) || "entity";
  let candidate = base;
  let n = 2;
  while (await entityExistsWithSlug(candidate)) candidate = `${base}-${n++}`;
  return candidate;
}

async function applyPlan(snippetId: string, snippetTitle: string, plan: Plan): Promise<void> {
  // A fresh check replaces what the last check of this snippet left undecided. Decisions
  // already made, and the notices for changes that were already applied, stay.
  await db.delete(continuityFlags).where(and(eq(continuityFlags.snippetId, snippetId), eq(continuityFlags.status, "open"), inArray(continuityFlags.kind, ["conflict", "possible_change"])));
  await db.delete(snippetConfirmations).where(eq(snippetConfirmations.snippetId, snippetId));

  // 1. Records for things the writing names that were never logged. Only quoted wording goes in.
  for (const ne_ of plan.newEntities) {
    const id = randomUUID();
    const fields: Record<string, string> = {};
    for (const d of ne_.details) fields[d.label] = appendToField(fields[d.label], d.quote);
    const labels = Object.keys(fields);
    const batch: BatchItem<"pg">[] = [
      db.insert(entities).values({
        id,
        type: ne_.type,
        name: ne_.name,
        slug: await freeSlug(ne_.name),
        status: "in_development",
        fields,
        gapPrompt: buildNewRecordGapPrompt(snippetTitle, EXPECTED_LABELS[ne_.type], labels),
        sourceDocId: `snippet:${snippetId}`,
      }),
      ...labels.map((label) => db.insert(fieldHistory).values({ entityId: id, fieldLabel: label, action: "created", oldValue: null, newValue: fields[label], snippetId })),
      db.insert(continuityFlags).values({
        snippetId,
        entityId: id,
        kind: "new_record",
        fieldLabel: labels.join(", "),
        newQuote: ne_.details[0].quote,
      }),
    ];
    await db.batch(batch as Batch);
  }

  // 2. New details on entries that already exist.
  const byEntity = new Map<string, Plan["newDetails"]>();
  for (const d of plan.newDetails) byEntity.set(d.entityId, [...(byEntity.get(d.entityId) ?? []), d]);
  for (const [entityId, details] of byEntity) {
    const [row] = await db.select({ fields: entities.fields }).from(entities).where(eq(entities.id, entityId)).limit(1);
    if (!row) continue;
    const fields = { ...row.fields };
    const batch: BatchItem<"pg">[] = [];
    for (const d of details) {
      const before = fields[d.label];
      fields[d.label] = appendToField(before, d.quote);
      batch.push(db.insert(fieldHistory).values({ entityId, fieldLabel: d.label, action: "added", oldValue: before ?? null, newValue: fields[d.label], snippetId }));
      batch.push(db.insert(continuityFlags).values({ snippetId, entityId, kind: "new_detail", fieldLabel: d.label, newQuote: d.quote }));
    }
    batch.unshift(db.update(entities).set({ fields }).where(eq(entities.id, entityId)));
    await db.batch(batch as Batch);
  }

  // 3. Details that already match canon are logged and nothing more.
  if (plan.confirmations.length > 0) {
    await db.insert(snippetConfirmations).values(plan.confirmations.map((c) => ({ snippetId, entityId: c.entityId, fieldLabel: c.fieldLabel, quote: c.quote })));
  }

  // 4. Conflicts and possible changes wait for a decision. Skip any that this snippet
  // already raised (and that may already have been decided).
  if (plan.flags.length > 0) {
    const existing = await db
      .select({ entityId: continuityFlags.entityId, label: continuityFlags.fieldLabel, quote: continuityFlags.newQuote })
      .from(continuityFlags)
      .where(and(eq(continuityFlags.snippetId, snippetId), inArray(continuityFlags.kind, ["conflict", "possible_change"])));
    const known = new Set(existing.map((e) => `${e.entityId}|${e.label}|${normalizeForCompare(e.quote)}`));
    const fresh = plan.flags.filter((f) => !known.has(`${f.entityId}|${f.fieldLabel}|${normalizeForCompare(f.newQuote)}`));
    if (fresh.length > 0) {
      await db.insert(continuityFlags).values(
        fresh.map((f) => ({
          snippetId,
          entityId: f.entityId,
          kind: f.kind,
          fieldLabel: f.fieldLabel,
          existingExcerpt: f.existingExcerpt,
          newQuote: f.newQuote,
          explanation: f.explanation || null,
        })),
      );
    }
  }
}

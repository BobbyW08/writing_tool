import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { continuityFlags, entities, fieldHistory, snippets } from "@/lib/db/schema";
import { DECISION_KINDS, UPDATE_KINDS } from "@/lib/continuity/constants";

export async function countOpenDecisions(): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(continuityFlags)
    .where(and(eq(continuityFlags.status, "open"), inArray(continuityFlags.kind, DECISION_KINDS)));
  return row?.n ?? 0;
}

export interface FlagRow {
  id: string;
  kind: string;
  status: string;
  choice: string | null;
  reason: string | null;
  context: string | null;
  fieldLabel: string;
  existingExcerpt: string | null;
  newQuote: string;
  explanation: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  snippetId: string;
  snippetTitle: string;
  snippetLabel: string | null;
  entityId: string;
  entityName: string;
  entitySlug: string;
  entityType: string;
}

const flagColumns = {
  id: continuityFlags.id,
  kind: continuityFlags.kind,
  status: continuityFlags.status,
  choice: continuityFlags.choice,
  reason: continuityFlags.reason,
  context: continuityFlags.context,
  fieldLabel: continuityFlags.fieldLabel,
  existingExcerpt: continuityFlags.existingExcerpt,
  newQuote: continuityFlags.newQuote,
  explanation: continuityFlags.explanation,
  createdAt: continuityFlags.createdAt,
  resolvedAt: continuityFlags.resolvedAt,
  snippetId: snippets.id,
  snippetTitle: snippets.title,
  snippetLabel: snippets.label,
  entityId: entities.id,
  entityName: entities.name,
  entitySlug: entities.slug,
  entityType: entities.type,
};

function baseFlagQuery() {
  return db
    .select(flagColumns)
    .from(continuityFlags)
    .innerJoin(snippets, eq(snippets.id, continuityFlags.snippetId))
    .innerJoin(entities, eq(entities.id, continuityFlags.entityId));
}

export async function listOpenDecisions(): Promise<FlagRow[]> {
  return baseFlagQuery()
    .where(and(eq(continuityFlags.status, "open"), inArray(continuityFlags.kind, DECISION_KINDS)))
    .orderBy(continuityFlags.createdAt);
}

export async function listOpenUpdates(): Promise<FlagRow[]> {
  return baseFlagQuery()
    .where(and(eq(continuityFlags.status, "open"), inArray(continuityFlags.kind, UPDATE_KINDS)))
    .orderBy(desc(continuityFlags.createdAt));
}

export async function listDecisionLog(limit = 200): Promise<FlagRow[]> {
  return baseFlagQuery()
    .where(and(eq(continuityFlags.status, "resolved"), inArray(continuityFlags.kind, DECISION_KINDS)))
    .orderBy(desc(continuityFlags.resolvedAt))
    .limit(limit);
}

export async function getFlag(id: string): Promise<FlagRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await baseFlagQuery().where(eq(continuityFlags.id, id)).limit(1);
  return row ?? null;
}

export async function listOpenFlagsForEntity(entityId: string): Promise<FlagRow[]> {
  return baseFlagQuery()
    .where(and(eq(continuityFlags.entityId, entityId), eq(continuityFlags.status, "open")))
    .orderBy(continuityFlags.createdAt);
}

export interface HistoryRow {
  id: string;
  fieldLabel: string;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: Date;
  snippetId: string | null;
  snippetTitle: string | null;
}

export async function listEntityHistory(entityId: string): Promise<HistoryRow[]> {
  return db
    .select({
      id: fieldHistory.id,
      fieldLabel: fieldHistory.fieldLabel,
      action: fieldHistory.action,
      oldValue: fieldHistory.oldValue,
      newValue: fieldHistory.newValue,
      createdAt: fieldHistory.createdAt,
      snippetId: fieldHistory.snippetId,
      snippetTitle: snippets.title,
    })
    .from(fieldHistory)
    .leftJoin(snippets, eq(snippets.id, fieldHistory.snippetId))
    .where(eq(fieldHistory.entityId, entityId))
    .orderBy(desc(fieldHistory.createdAt));
}

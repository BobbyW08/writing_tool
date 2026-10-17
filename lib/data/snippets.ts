import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { continuityFlags, entities, snippetConfirmations, snippets } from "@/lib/db/schema";

export interface SnippetSummary {
  id: string;
  title: string;
  label: string | null;
  sortOrder: string | null;
  checkStatus: string;
  createdAt: Date;
  openDecisions: number;
}

export async function listSnippets(): Promise<SnippetSummary[]> {
  const open = db
    .select({
      snippetId: continuityFlags.snippetId,
      n: sql<number>`count(*)::int`.as("n"),
    })
    .from(continuityFlags)
    .where(sql`${continuityFlags.status} = 'open' and ${continuityFlags.kind} in ('conflict', 'possible_change')`)
    .groupBy(continuityFlags.snippetId)
    .as("open_decisions");

  const rows = await db
    .select({
      id: snippets.id,
      title: snippets.title,
      label: snippets.label,
      sortOrder: snippets.sortOrder,
      checkStatus: snippets.checkStatus,
      createdAt: snippets.createdAt,
      openDecisions: sql<number>`coalesce(${open.n}, 0)::int`,
    })
    .from(snippets)
    .leftJoin(open, eq(open.snippetId, snippets.id))
    .orderBy(desc(snippets.createdAt));
  return rows;
}

export async function getSnippet(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await db.select().from(snippets).where(eq(snippets.id, id)).limit(1);
  return row ?? null;
}

export interface SnippetFlag {
  id: string;
  kind: string;
  status: string;
  choice: string | null;
  fieldLabel: string;
  existingExcerpt: string | null;
  newQuote: string;
  explanation: string | null;
  entityId: string;
  entityName: string;
  entitySlug: string;
  entityType: string;
}

export async function getSnippetFlags(snippetId: string): Promise<SnippetFlag[]> {
  return db
    .select({
      id: continuityFlags.id,
      kind: continuityFlags.kind,
      status: continuityFlags.status,
      choice: continuityFlags.choice,
      fieldLabel: continuityFlags.fieldLabel,
      existingExcerpt: continuityFlags.existingExcerpt,
      newQuote: continuityFlags.newQuote,
      explanation: continuityFlags.explanation,
      entityId: entities.id,
      entityName: entities.name,
      entitySlug: entities.slug,
      entityType: entities.type,
    })
    .from(continuityFlags)
    .innerJoin(entities, eq(entities.id, continuityFlags.entityId))
    .where(eq(continuityFlags.snippetId, snippetId))
    .orderBy(continuityFlags.createdAt);
}

export interface SnippetConfirmation {
  id: string;
  fieldLabel: string;
  quote: string;
  entityName: string;
  entitySlug: string;
  entityType: string;
}

export async function getSnippetConfirmations(snippetId: string): Promise<SnippetConfirmation[]> {
  return db
    .select({
      id: snippetConfirmations.id,
      fieldLabel: snippetConfirmations.fieldLabel,
      quote: snippetConfirmations.quote,
      entityName: entities.name,
      entitySlug: entities.slug,
      entityType: entities.type,
    })
    .from(snippetConfirmations)
    .innerJoin(entities, eq(entities.id, snippetConfirmations.entityId))
    .where(eq(snippetConfirmations.snippetId, snippetId))
    .orderBy(entities.name);
}

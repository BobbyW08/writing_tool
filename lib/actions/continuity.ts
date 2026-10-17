"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import type { BatchItem } from "drizzle-orm/batch";
import { db } from "@/lib/db";
import { continuityFlags, entities, fieldHistory, snippets } from "@/lib/db/schema";
import { DECISION_KINDS, UPDATE_KINDS } from "@/lib/continuity/constants";
import { appendToField, findQuote, replaceRange } from "@/lib/continuity/text";

const resolveSchema = z.object({
  choice: z.enum(["keep_canon", "update_canon", "both_true", "changed_over_time", "decide_later"]),
  reason: z.string().max(500).optional(),
  context: z.string().max(200).optional(),
  newFieldText: z.string().max(20000).optional(),
});

export type ResolveInput = z.input<typeof resolveSchema>;
export type ActionResult = { ok: true } | { ok: false; error: string };

type Batch = [BatchItem<"pg">, ...BatchItem<"pg">[]];

function refresh() {
  revalidatePath("/", "layout");
}

// Records Bobby's decision on a conflict and makes it official in the entity record.
// The flag is claimed first, so a double click cannot apply the same decision twice.
export async function resolveFlagAction(flagId: string, input: ResolveInput): Promise<ActionResult> {
  const parsed = resolveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That decision could not be read." };
  const { choice } = parsed.data;
  const reason = parsed.data.reason?.trim() || null;
  const context = parsed.data.context?.trim() || null;
  const newFieldText = parsed.data.newFieldText?.trim() || null;

  if ((choice === "both_true" || choice === "changed_over_time") && !context) {
    return { ok: false, error: "Say what makes both true, so the record can explain it." };
  }
  if (choice === "update_canon" && !newFieldText) {
    return { ok: false, error: "The updated field cannot be empty." };
  }

  const claimed = await db
    .update(continuityFlags)
    .set({ status: "resolved", choice, reason, context, resolvedAt: new Date() })
    .where(and(eq(continuityFlags.id, flagId), eq(continuityFlags.status, "open"), inArray(continuityFlags.kind, DECISION_KINDS)))
    .returning();
  const flag = claimed[0];
  if (!flag) return { ok: false, error: "This item was already resolved." };

  try {
    const [entity] = await db.select().from(entities).where(eq(entities.id, flag.entityId)).limit(1);
    if (!entity) throw new Error("The entry this refers to no longer exists.");
    const fields = { ...entity.fields };

    if (choice === "update_canon") {
      const before = fields[flag.fieldLabel] ?? null;
      fields[flag.fieldLabel] = newFieldText!;
      await db.batch([
        db.update(entities).set({ fields }).where(eq(entities.id, entity.id)),
        db.insert(fieldHistory).values({ entityId: entity.id, fieldLabel: flag.fieldLabel, action: "updated", oldValue: before, newValue: newFieldText, snippetId: flag.snippetId, flagId: flag.id }),
      ] as Batch);
    } else if (choice === "both_true" || choice === "changed_over_time") {
      const key = `${flag.fieldLabel} (${context})`.slice(0, 120);
      const before = fields[key] ?? null;
      fields[key] = appendToField(before ?? undefined, flag.newQuote);
      await db.batch([
        db.update(entities).set({ fields }).where(eq(entities.id, entity.id)),
        db.insert(fieldHistory).values({ entityId: entity.id, fieldLabel: key, action: choice, oldValue: before, newValue: fields[key], snippetId: flag.snippetId, flagId: flag.id }),
      ] as Batch);
    } else if (choice === "decide_later") {
      const [snippet] = await db.select({ title: snippets.title }).from(snippets).where(eq(snippets.id, flag.snippetId)).limit(1);
      const note = `Unresolved continuity from "${snippet?.title ?? "a snippet"}" (${flag.fieldLabel}): canon says "${flag.existingExcerpt ?? ""}" but the snippet says "${flag.newQuote}".`;
      await db
        .update(entities)
        .set({ gapPrompt: entity.gapPrompt ? `${entity.gapPrompt}\n${note}` : note, status: entity.status === "locked" ? "in_development" : entity.status })
        .where(eq(entities.id, entity.id));
    }
    // keep_canon changes nothing in canon. The decision log and the snippet page keep the
    // quote so the snippet can be revised.
  } catch (err) {
    await db.update(continuityFlags).set({ status: "open", choice: null, reason: null, context: null, resolvedAt: null }).where(eq(continuityFlags.id, flagId));
    return { ok: false, error: err instanceof Error ? err.message : "Could not apply that decision." };
  }

  refresh();
  return { ok: true };
}

export async function acknowledgeFlagAction(flagId: string) {
  await db
    .update(continuityFlags)
    .set({ status: "resolved", choice: "acknowledged", resolvedAt: new Date() })
    .where(and(eq(continuityFlags.id, flagId), eq(continuityFlags.status, "open"), inArray(continuityFlags.kind, UPDATE_KINDS)));
  refresh();
}

export async function acknowledgeAllUpdatesAction() {
  await db
    .update(continuityFlags)
    .set({ status: "resolved", choice: "acknowledged", resolvedAt: new Date() })
    .where(and(eq(continuityFlags.status, "open"), inArray(continuityFlags.kind, UPDATE_KINDS)));
  refresh();
}

// Takes an automatically added detail back out of the entity, using the exact quote that
// was added. If the field was edited since, it is left alone and Bobby edits it directly.
export async function undoNewDetailAction(flagId: string): Promise<ActionResult> {
  const [flag] = await db.select().from(continuityFlags).where(and(eq(continuityFlags.id, flagId), eq(continuityFlags.status, "open"), eq(continuityFlags.kind, "new_detail"))).limit(1);
  if (!flag) return { ok: false, error: "This item was already handled." };
  const [entity] = await db.select().from(entities).where(eq(entities.id, flag.entityId)).limit(1);
  if (!entity) return { ok: false, error: "The entry no longer exists." };

  const current = entity.fields[flag.fieldLabel];
  const range = current ? findQuote(current, flag.newQuote) : null;
  if (!current || !range) return { ok: false, error: "That field has been edited since, so it was left alone. Edit it on the entry page." };

  const next = replaceRange(current, range, "").replace(/\n{3,}/g, "\n\n").trim();
  const fields = { ...entity.fields };
  if (next) fields[flag.fieldLabel] = next;
  else delete fields[flag.fieldLabel];

  await db.batch([
    db.update(entities).set({ fields }).where(eq(entities.id, entity.id)),
    db.insert(fieldHistory).values({ entityId: entity.id, fieldLabel: flag.fieldLabel, action: "undone", oldValue: current, newValue: next || null, snippetId: flag.snippetId, flagId: flag.id }),
    db.update(continuityFlags).set({ status: "resolved", choice: "undone", resolvedAt: new Date() }).where(eq(continuityFlags.id, flag.id)),
  ] as Batch);
  refresh();
  return { ok: true };
}

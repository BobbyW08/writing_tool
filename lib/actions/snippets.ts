"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { snippets } from "@/lib/db/schema";
import { claimCheck, runContinuityCheck } from "@/lib/continuity/run-check";

const MAX_BODY = 120_000;

function readForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim() || null;
  const body = String(formData.get("body") ?? "").trim();
  const rawOrder = String(formData.get("sortOrder") ?? "").trim();
  if (!title) throw new Error("A title is required");
  if (!body) throw new Error("The snippet is empty");
  if (body.length > MAX_BODY) throw new Error(`The snippet is too long to check in one piece (limit ${MAX_BODY.toLocaleString()} characters). Split it into parts.`);
  let sortOrder: string | null = null;
  if (rawOrder !== "") {
    const n = Number(rawOrder);
    if (!Number.isFinite(n)) throw new Error("Timeline position must be a number");
    sortOrder = String(n);
  }
  return { title, label, body, sortOrder };
}

// The check runs after the response is sent, so saving never waits on the model.
// The snippet page polls and tells Bobby when it finishes.
async function startCheck(snippetId: string) {
  if (await claimCheck(snippetId)) {
    after(() => runContinuityCheck(snippetId));
  }
}

export async function createSnippetAction(formData: FormData) {
  const values = readForm(formData);
  const [row] = await db.insert(snippets).values(values).returning({ id: snippets.id });
  await startCheck(row.id);
  revalidatePath("/", "layout");
  redirect(`/snippets/${row.id}`);
}

export async function updateSnippetAction(id: string, formData: FormData) {
  const values = readForm(formData);
  const [current] = await db.select({ body: snippets.body, sortOrder: snippets.sortOrder }).from(snippets).where(eq(snippets.id, id)).limit(1);
  if (!current) throw new Error("Snippet not found");
  const changed = current.body !== values.body || (current.sortOrder === null ? null : Number(current.sortOrder)) !== (values.sortOrder === null ? null : Number(values.sortOrder));
  await db.update(snippets).set({ ...values, updatedAt: new Date() }).where(eq(snippets.id, id));
  if (changed) await startCheck(id);
  revalidatePath("/", "layout");
  redirect(`/snippets/${id}`);
}

export async function recheckSnippetAction(id: string) {
  await startCheck(id);
  revalidatePath("/", "layout");
}

// Canon changes this snippet already caused (new records, new details, decisions) are not
// rolled back. Entity pages keep their history.
export async function deleteSnippetAction(id: string) {
  await db.delete(snippets).where(eq(snippets.id, id));
  revalidatePath("/", "layout");
  redirect("/snippets");
}

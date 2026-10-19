import Link from "next/link";
import { notFound } from "next/navigation";
import { getSnippet, getSnippetConfirmations, getSnippetFlags } from "@/lib/data/snippets";
import { recheckSnippetAction, updateSnippetAction, deleteSnippetAction } from "@/lib/actions/snippets";
import { acknowledgeFlagAction } from "@/lib/actions/continuity";
import { DECISION_KINDS, KIND_LABELS, CHOICE_LABELS } from "@/lib/continuity/constants";
import { entityHref, shortDate } from "@/lib/continuity/links";
import { SnippetCheckStatus } from "@/components/snippet-check-status";
import { UndoDetailButton } from "@/components/undo-detail-button";
import { ViewEditToggle } from "@/components/view-edit-toggle";
import { DeleteButton } from "@/components/delete-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

// Editing the text re-runs the check after the response, so give it room to finish.
export const maxDuration = 300;

export default async function SnippetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const snippet = await getSnippet(id);
  if (!snippet) notFound();

  const [flags, confirmations] = await Promise.all([getSnippetFlags(snippet.id), getSnippetConfirmations(snippet.id)]);

  const decisions = flags.filter((f) => DECISION_KINDS.includes(f.kind as never) && f.status === "open");
  const updates = flags.filter((f) => !DECISION_KINDS.includes(f.kind as never) && f.status === "open");
  const toRevise = flags.filter((f) => f.status === "resolved" && f.choice === "keep_canon");
  const summary = {
    decisions: decisions.length,
    newRecords: flags.filter((f) => f.kind === "new_record").length,
    newDetails: flags.filter((f) => f.kind === "new_detail").length,
    confirmed: confirmations.length,
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <Link href="/snippets" className="text-sm text-muted-foreground hover:underline">
          ← Snippets
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{snippet.title}</h1>
        <p className="text-sm text-muted-foreground">
          {[snippet.label, snippet.sortOrder !== null ? `Timeline position ${Number(snippet.sortOrder)}` : null, shortDate(snippet.createdAt)].filter(Boolean).join(" · ")}
        </p>
      </div>

      <SnippetCheckStatus status={snippet.checkStatus} summary={summary} error={snippet.checkError} notes={snippet.checkNotes} recheckAction={recheckSnippetAction.bind(null, snippet.id)} />

      {decisions.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Waiting for your decision</h2>
          <ul className="space-y-2">
            {decisions.map((f) => (
              <li key={f.id}>
                <Link href={`/continuity/${f.id}`} className="block rounded-md border border-red-500/50 px-4 py-3 text-sm hover:bg-accent">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-red-500 text-red-700 dark:text-red-400">
                      {KIND_LABELS[f.kind]}
                    </Badge>
                    <span className="font-medium">
                      {f.entityName}, {f.fieldLabel}
                    </span>
                  </div>
                  {f.explanation && <p className="mt-1 text-muted-foreground">{f.explanation}</p>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {toRevise.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Lines to revise (you kept canon)</h2>
          <ul className="space-y-2">
            {toRevise.map((f) => (
              <li key={f.id} className="rounded-md border px-4 py-3 text-sm">
                <div className="font-medium">
                  <Link href={entityHref(f.entityType, f.entitySlug)} className="hover:underline">
                    {f.entityName}
                  </Link>
                  , {f.fieldLabel}
                </div>
                <p className="mt-1">&ldquo;{f.newQuote}&rdquo;</p>
                {f.existingExcerpt && <p className="mt-1 text-muted-foreground">Canon says: &ldquo;{f.existingExcerpt}&rdquo;</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {updates.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Added to canon from this snippet</h2>
          <ul className="space-y-2">
            {updates.map((f) => (
              <li key={f.id} className="flex items-start justify-between gap-3 rounded-md border px-4 py-3 text-sm">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400">
                      {KIND_LABELS[f.kind]}
                    </Badge>
                    <Link href={entityHref(f.entityType, f.entitySlug)} className="font-medium hover:underline">
                      {f.entityName}
                    </Link>
                    <span className="text-muted-foreground">{f.fieldLabel}</span>
                  </div>
                  <p className="mt-1 break-words">&ldquo;{f.newQuote}&rdquo;</p>
                </div>
                <div className="flex shrink-0 items-center">
                  {f.kind === "new_detail" && <UndoDetailButton flagId={f.id} />}
                  <form action={acknowledgeFlagAction.bind(null, f.id)}>
                    <Button type="submit" size="sm" variant="ghost">
                      Got it
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {flags.some((f) => f.status === "resolved" && f.choice && f.choice !== "keep_canon" && f.choice !== "acknowledged" && DECISION_KINDS.includes(f.kind as never)) && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Decided</h2>
          <ul className="space-y-1 text-sm">
            {flags
              .filter((f) => f.status === "resolved" && f.choice && f.choice !== "keep_canon" && f.choice !== "acknowledged" && DECISION_KINDS.includes(f.kind as never))
              .map((f) => (
                <li key={f.id} className="text-muted-foreground">
                  {f.entityName}, {f.fieldLabel}: {CHOICE_LABELS[f.choice ?? ""] ?? f.choice}
                </li>
              ))}
          </ul>
        </section>
      )}

      {confirmations.length > 0 && (
        <details className="rounded-md border px-4 py-3 text-sm">
          <summary className="cursor-pointer font-medium">Confirmed against canon ({confirmations.length})</summary>
          <ul className="mt-3 space-y-3">
            {confirmations.map((c) => (
              <li key={c.id}>
                <div>
                  <Link href={entityHref(c.entityType, c.entitySlug)} className="font-medium hover:underline">
                    {c.entityName}
                  </Link>{" "}
                  <span className="text-muted-foreground">{c.fieldLabel}</span>
                </div>
                <p className="text-muted-foreground">&ldquo;{c.quote}&rdquo;</p>
              </li>
            ))}
          </ul>
        </details>
      )}

      <ViewEditToggle
        view={<div className="whitespace-pre-wrap font-serif text-base leading-relaxed">{snippet.body}</div>}
        edit={
          <form action={updateSnippetAction.bind(null, snippet.id)} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" defaultValue={snippet.title} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="label">Chapter or part</Label>
                <Input id="label" name="label" defaultValue={snippet.label ?? ""} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sortOrder">Timeline position (optional)</Label>
              <Input id="sortOrder" name="sortOrder" type="number" step="any" defaultValue={snippet.sortOrder !== null ? Number(snippet.sortOrder) : ""} className="max-w-40" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Writing</Label>
              <Textarea id="body" name="body" defaultValue={snippet.body} required rows={20} className="font-serif text-base leading-relaxed" />
              <p className="text-xs text-muted-foreground">Saving a change to the text or the timeline position checks it against canon again.</p>
            </div>
            <Button type="submit">Save</Button>
          </form>
        }
      />

      <div className="border-t pt-6">
        <DeleteButton action={deleteSnippetAction.bind(null, snippet.id)} itemLabel={snippet.title} />
        <p className="mt-2 text-xs text-muted-foreground">Deleting a snippet does not undo changes it already made to canon. Those stay in each entry&apos;s history.</p>
      </div>
    </div>
  );
}

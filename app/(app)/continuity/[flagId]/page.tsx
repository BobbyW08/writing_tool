import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { entities, snippets } from "@/lib/db/schema";
import { getFlag } from "@/lib/data/continuity";
import { acknowledgeFlagAction } from "@/lib/actions/continuity";
import { CHOICE_LABELS, DECISION_KINDS, KIND_LABELS } from "@/lib/continuity/constants";
import { entityHref, shortDate } from "@/lib/continuity/links";
import { findQuote, passageAround, replaceRange } from "@/lib/continuity/text";
import { ContinuityReviewForm } from "@/components/continuity-review-form";
import { HighlightedText } from "@/components/highlighted-text";
import { UndoDetailButton } from "@/components/undo-detail-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function ReviewPage({ params }: { params: Promise<{ flagId: string }> }) {
  const { flagId } = await params;
  const flag = await getFlag(flagId);
  if (!flag) notFound();

  const [[entity], [snippet]] = await Promise.all([
    db.select({ fields: entities.fields }).from(entities).where(eq(entities.id, flag.entityId)).limit(1),
    db.select({ body: snippets.body, sortOrder: snippets.sortOrder }).from(snippets).where(eq(snippets.id, flag.snippetId)).limit(1),
  ]);
  if (!entity || !snippet) notFound();

  const isDecision = DECISION_KINDS.includes(flag.kind as never);
  const fieldText = entity.fields[flag.fieldLabel] ?? "";
  const canonRange = flag.existingExcerpt && fieldText ? findQuote(fieldText, flag.existingExcerpt) : null;
  const snippetRange = findQuote(snippet.body, flag.newQuote);
  const snippetPassage = snippetRange ? passageAround(snippet.body, snippetRange) : null;

  // Starting point for "Update canon": canon with the disputed words swapped for the snippet's words.
  const prefilled = canonRange ? replaceRange(fieldText, canonRange, flag.newQuote) : fieldText;
  const defaultContext = snippet.sortOrder !== null ? `from Age ${Number(snippet.sortOrder)}` : "";

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <Link href="/continuity" className="text-sm text-muted-foreground hover:underline">
          ← Continuity
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">
            {flag.entityName}: {flag.kind === "new_record" ? "new record" : flag.fieldLabel}
          </h1>
          <Badge variant="outline" className={isDecision ? "border-red-500 text-red-700 dark:text-red-400" : "border-amber-500 text-amber-700 dark:text-amber-400"}>
            {KIND_LABELS[flag.kind]}
          </Badge>
        </div>
        {flag.explanation && <p className="mt-2 text-sm text-muted-foreground">{flag.explanation}</p>}
        {flag.kind === "possible_change" && <p className="mt-2 text-sm text-muted-foreground">This scene sits later on the timeline than the canon it differs from, so it may be intentional development.</p>}
      </div>

      <div className={`grid gap-4 ${isDecision ? "md:grid-cols-2" : ""}`}>
        {isDecision && (
          <section className="space-y-2 rounded-md border p-4">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Canon says ·{" "}
              <Link href={entityHref(flag.entityType, flag.entitySlug)} className="hover:underline">
                {flag.entityName}
              </Link>
              , {flag.fieldLabel}
            </h2>
            {canonRange ? (
              <HighlightedText text={fieldText} start={canonRange.start} end={canonRange.end} />
            ) : (
              <p className="text-sm text-muted-foreground">The canon wording for this has been edited since the check. Current text: {fieldText || "(blank)"}</p>
            )}
          </section>
        )}
        <section className="space-y-2 rounded-md border p-4">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Your snippet says ·{" "}
            <Link href={`/snippets/${flag.snippetId}`} className="hover:underline">
              {flag.snippetTitle}
            </Link>
          </h2>
          {snippetPassage ? (
            <HighlightedText text={snippetPassage.text} start={snippetPassage.start} end={snippetPassage.end} cutBefore={snippetPassage.cutBefore} cutAfter={snippetPassage.cutAfter} />
          ) : (
            <p className="whitespace-pre-wrap text-sm">&ldquo;{flag.newQuote}&rdquo;</p>
          )}
        </section>
      </div>

      {flag.status === "open" && isDecision && (
        <ContinuityReviewForm flagId={flag.id} kind={flag.kind} prefilledFieldText={prefilled} defaultContext={defaultContext} fieldLabel={flag.fieldLabel} />
      )}

      {flag.status === "open" && !isDecision && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            This was added to <Link href={entityHref(flag.entityType, flag.entitySlug)} className="underline">{flag.entityName}</Link> automatically, using only your own words.
          </p>
          <div className="flex items-center gap-2">
            <form action={acknowledgeFlagAction.bind(null, flag.id)}>
              <Button type="submit" size="sm">
                Got it
              </Button>
            </form>
            {flag.kind === "new_detail" && <UndoDetailButton flagId={flag.id} />}
          </div>
        </div>
      )}

      {flag.status === "resolved" && (
        <section className="space-y-1 rounded-md border p-4 text-sm">
          <div className="font-medium">
            {CHOICE_LABELS[flag.choice ?? ""] ?? flag.choice} · {shortDate(flag.resolvedAt)}
          </div>
          {flag.context && <p className="text-muted-foreground">Context: {flag.context}</p>}
          {flag.reason && <p className="text-muted-foreground">Reason: {flag.reason}</p>}
        </section>
      )}
    </div>
  );
}

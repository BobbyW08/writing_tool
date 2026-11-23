import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { appDb } from "@/db/index";
import * as schema from "@/db/schema";
import { getFlag } from "@/lib/continuity/queries";
import { acknowledgeFlagAction } from "@/lib/continuity/actions";
import { CHOICE_LABELS, DECISION_KINDS, KIND_LABELS } from "@/lib/continuity/constants";
import { entityHref, shortDate } from "@/lib/continuity/links";
import { findQuote, passageAround, prefillUpdateCanon } from "@/lib/continuity/text";
import { ContinuityReviewForm } from "@/components/continuity-review-form";
import { HighlightedText } from "@/components/highlighted-text";
import { UndoDetailButton } from "@/components/undo-detail-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type AnyWorldTable = typeof schema.characters;
const WORLD_TABLE_MAP: Record<string, AnyWorldTable> = {
  characters: schema.characters as unknown as AnyWorldTable,
  locations: schema.locations as unknown as AnyWorldTable,
  items: schema.items as unknown as AnyWorldTable,
  cultures: schema.cultures as unknown as AnyWorldTable,
  factions: schema.factions as unknown as AnyWorldTable,
  races: schema.races as unknown as AnyWorldTable,
  languages: schema.languages as unknown as AnyWorldTable,
  lore: schema.lore as unknown as AnyWorldTable,
};

type DetailRow = { label: string; value: string; inInfobox: boolean; id?: string };

export default async function ReviewPage({ params }: { params: Promise<{ flagCode: string }> }) {
  const { flagCode } = await params;
  const flag = await getFlag(flagCode);
  if (!flag) notFound();

  const table = WORLD_TABLE_MAP[flag.entryCollection];
  const [[entry], [writing]] = await Promise.all([
    table
      ? appDb.select({ details: table.details }).from(table as never).where(eq(table.id, flag.entryId)).limit(1)
      : Promise.resolve([null]),
    appDb.select({ text: schema.writing.plainText, startYear: schema.writing.startYear }).from(schema.writing).where(eq(schema.writing.id, flag.writingId)).limit(1),
  ]);
  if (!entry || !writing) notFound();

  const details = ((entry as { details: DetailRow[] }).details) ?? [];
  const fieldRow = details.find((d) => d.label.trim().toLowerCase() === flag.fieldLabel.trim().toLowerCase());
  const fieldText = fieldRow?.value ?? "";

  const isDecision = DECISION_KINDS.includes(flag.kind as never);
  const canonRange = flag.existingExcerpt && fieldText ? findQuote(fieldText, flag.existingExcerpt) : null;
  const writingBody = writing.text ?? "";
  const writingRange = findQuote(writingBody, flag.newQuote);
  const writingPassage = writingRange ? passageAround(writingBody, writingRange) : null;

  // Starting point for "Update canon": canon with the disputed words swapped for the writing's words.
  const prefilled = prefillUpdateCanon(fieldText, flag.existingExcerpt, flag.newQuote);
  const defaultContext = writing.startYear !== null ? `from year ${writing.startYear}` : "";

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <Link href="/continuity" className="text-sm text-muted-foreground hover:underline">
          ← Continuity
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">
            {flag.entryName}: {flag.kind === "new_record" ? "new record" : flag.fieldLabel}
          </h1>
          <Badge variant="outline" className={isDecision ? "border-red-500 text-red-700 dark:text-red-400" : "border-amber-500 text-amber-700 dark:text-amber-400"}>
            {KIND_LABELS[flag.kind]}
          </Badge>
          {isDecision && flag.priority === "high" && (
            <Badge className="bg-red-600 text-white hover:bg-red-600 dark:bg-red-700">Against Locked canon</Badge>
          )}
        </div>
        {flag.explanation && <p className="mt-2 text-sm text-muted-foreground">{flag.explanation}</p>}
        {flag.kind === "possible_change" && <p className="mt-2 text-sm text-muted-foreground">This piece sits later on the timeline than the canon it differs from, so it may be intentional development.</p>}
      </div>

      <div className={`grid gap-4 ${isDecision ? "md:grid-cols-2" : ""}`}>
        {isDecision && (
          <section className="space-y-2 rounded-md border p-4">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Canon says ·{" "}
              <Link href={entityHref(flag.entryCollection, flag.entrySlug)} className="hover:underline">
                {flag.entryName}
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
            Your writing says ·{" "}
            <Link href={`/write/${flag.writingCode}`} className="hover:underline">
              {flag.writingName}
            </Link>
          </h2>
          {writingPassage ? (
            <HighlightedText text={writingPassage.text} start={writingPassage.start} end={writingPassage.end} cutBefore={writingPassage.cutBefore} cutAfter={writingPassage.cutAfter} />
          ) : (
            <p className="whitespace-pre-wrap text-sm">&ldquo;{flag.newQuote}&rdquo;</p>
          )}
        </section>
      </div>

      {flag.status === "open" && isDecision && (
        <ContinuityReviewForm flagCode={flag.code} kind={flag.kind} prefilledFieldText={prefilled} defaultContext={defaultContext} fieldLabel={flag.fieldLabel} />
      )}

      {flag.status === "open" && !isDecision && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            This was added to <Link href={entityHref(flag.entryCollection, flag.entrySlug)} className="underline">{flag.entryName}</Link> automatically, using only your own words.
          </p>
          <div className="flex items-center gap-2">
            <form action={acknowledgeFlagAction.bind(null, flag.code)}>
              <Button type="submit" size="sm">
                Got it
              </Button>
            </form>
            {flag.kind === "new_detail" && <UndoDetailButton flagCode={flag.code} />}
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

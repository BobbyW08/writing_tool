import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { movedTo } from "@/lib/codes-history";
import { getStoryByCode, getRelationshipsByCode, buildCodeMap, isUnk } from "@/lib/world/queries";
import { getWritingListByStory, getWritingByCode, getStoryList } from "@/lib/studio/queries";
import { getCheckSummary } from "@/lib/continuity/queries";
import { createWriting } from "@/lib/studio/actions";
import { floatingRangeText } from "@/lib/stories";
import { CodeText } from "@/components/code-text";
import { EditableField } from "@/components/editable-field";
import { RelationshipEditor } from "@/components/relationship-editor";
import { RecordActions } from "@/components/record-actions";
import { WhatLinksHere } from "@/components/what-links-here";
import { StoryKeepWriting } from "@/components/story-keep-writing";
import { PlotOutline } from "@/components/plot-outline";
import { PLOT_TEMPLATE_KEY } from "@/lib/sheets/templates";
import { sheetAnswers } from "@/lib/sheets/answers";

type StoryDoc = {
  id: number;
  code: string;
  name: string;
  summary?: string | null;
  stage?: string | null;
  format?: string | null;
  era?: string | null;
  startYear?: number | null;
  endYear?: number | null;
  yearLabel?: string | null;
  floating?: boolean | null;
  beats?: { beat: string; id?: string | null }[] | null;
  gapPrompt?: string | null;
  details?: { label: string; value?: string | null; id?: string | null }[] | null;
  tagIds?: number[] | null;
  reviewNote?: string | null;
};

const ERA_OPTIONS = [
  { label: 'Era One: The Ordinary Life', value: 'era_one' },
  { label: 'Era Two: The Awakening', value: 'era_two' },
  { label: 'Era Three: Traveling Alone', value: 'era_three' },
  { label: 'Era Four: The Archive Years', value: 'era_four' },
  { label: 'Era Five: The Long Collapse', value: 'era_five' },
  { label: 'Era Six: New Orders', value: 'era_six' },
  { label: 'Era Seven: The Search', value: 'era_seven' },
];

const STAGE_OPTIONS = [
  { label: 'Idea', value: 'idea' },
  { label: 'Outlined', value: 'outlined' },
  { label: 'Drafting', value: 'drafting' },
  { label: 'Written', value: 'written' },
  { label: 'Shelved', value: 'shelved' },
];

const FORMAT_OPTIONS = [
  { label: 'Novel', value: 'novel' },
  { label: 'Novella', value: 'novella' },
  { label: 'Short story', value: 'short_story' },
  { label: 'Vignette', value: 'vignette' },
  { label: 'Other', value: 'other' },
];

export default async function StoryReadPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const story = await getStoryByCode(code);
  if (!story) {
    const moved = await movedTo(code);
    if (moved) redirect(moved);
    notFound();
  }

  const doc = story as unknown as StoryDoc;
  const storyCode = doc.code ?? '';
  const rels = storyCode ? await getRelationshipsByCode(storyCode) : { from: [], to: [] };
  const answers = sheetAnswers(doc.details);
  const codeMap = await buildCodeMap([doc.summary, doc.gapPrompt, ...(doc.beats?.map(b => b.beat) ?? []), ...Object.values(answers)]);
  const unkTagged = isUnk(doc.tagIds ?? null);

  // Step U3: "keep writing" section. Opens the story's most recently edited writing record,
  // or starts a new draft snippet for it if none exists yet (get-or-create, idempotent once
  // the first record exists).
  let writingList = await getWritingListByStory(doc.id);
  if (writingList.length === 0) {
    const created = await createWriting(`${doc.name} — untitled`, doc.id);
    if (created.code) writingList = await getWritingListByStory(doc.id);
  }
  const activeCode = writingList[0]?.code ?? null;
  const [activeRecord, allStories] = await Promise.all([
    activeCode ? getWritingByCode(activeCode) : Promise.resolve(null),
    getStoryList(),
  ]);
  const activeSummary = activeRecord ? await getCheckSummary(activeRecord.id) : { decisions: 0, newRecords: 0, newDetails: 0, confirmed: 0, claims: 0 };
  const activeCodeMap = activeRecord ? await buildCodeMap([activeRecord.text]) : {};

  type RelRow = { id: number; code: string; fromCollection: string; fromCode: string; toCollection: string; toCode: string; type?: string | null; startYear?: number | null; endYear?: number | null; notes?: string | null };
  type RelEditorEntry = { id: number; code: string; collection: string; name: string; type: string; direction: 'from' | 'to'; startYear: number | null; endYear: number | null; notes: string | null };
  const relEntries: RelEditorEntry[] = [];
  for (const r of rels.from as RelRow[]) {
    relEntries.push({ id: r.id, code: r.toCode, collection: r.toCollection, name: r.toCode, type: r.type ?? '', direction: 'from', startYear: r.startYear ?? null, endYear: r.endYear ?? null, notes: r.notes ?? null });
  }
  for (const r of rels.to as RelRow[]) {
    relEntries.push({ id: r.id, code: r.fromCode, collection: r.fromCollection, name: r.fromCode, type: r.type ?? '', direction: 'to', startYear: r.startYear ?? null, endYear: r.endYear ?? null, notes: r.notes ?? null });
  }

  return (
    <div className="max-w-3xl space-y-8">
      {/* Header */}
      <div>
        <Link href="/stories" className="text-sm text-muted-foreground hover:underline">Stories</Link>
        <div className="mt-1 flex flex-wrap items-start gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">
                <EditableField collection="stories" docId={doc.id} fieldName="name" value={doc.name} kind="text" className="text-2xl font-semibold" />
              </h1>
              {unkTagged && (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold uppercase text-amber-800 dark:bg-amber-900/40 dark:text-amber-400">
                  UNK
                </span>
              )}
            </div>
            {storyCode && <p className="font-mono text-xs text-muted-foreground">{storyCode}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link href={`/stories/${storyCode}/beats`} className="text-sm text-muted-foreground hover:underline">
              Story Builder
            </Link>
            <EditableField collection="stories" docId={doc.id} fieldName="stage" value={doc.stage} kind="select" options={STAGE_OPTIONS} />
            <RecordActions collection="stories" id={doc.id} code={storyCode} name={doc.name} status={(doc as Record<string, unknown>).status as string} />
          </div>
        </div>
        <div className="mt-2">
          <EditableField collection="stories" docId={doc.id} fieldName="summary" value={doc.summary} kind="textarea" placeholder="Click to add summary" className="text-sm" />
        </div>
      </div>

      {/* UNK review note */}
      {unkTagged && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm dark:border-amber-700 dark:bg-amber-950/30">
          <span className="font-semibold">Check this: </span>
          <EditableField collection="stories" docId={doc.id} fieldName="reviewNote" value={doc.reviewNote} kind="textarea" placeholder="Add review note" />
        </div>
      )}

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">Era</p>
          <EditableField collection="stories" docId={doc.id} fieldName="era" value={doc.era} kind="select" options={ERA_OPTIONS} placeholder="Click to set" />
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground">Format</p>
          <EditableField collection="stories" docId={doc.id} fieldName="format" value={doc.format} kind="select" options={FORMAT_OPTIONS} placeholder="Click to set" />
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground">Starts (year)</p>
          <EditableField collection="stories" docId={doc.id} fieldName="startYear" value={doc.startYear} kind="number" placeholder="Click to set" />
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground">Ends (year)</p>
          <EditableField collection="stories" docId={doc.id} fieldName="endYear" value={doc.endYear} kind="number" placeholder="Click to set" />
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground">Year label</p>
          <EditableField collection="stories" docId={doc.id} fieldName="yearLabel" value={doc.yearLabel} kind="text" placeholder="Click to set" />
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-muted-foreground">Floating</p>
          <EditableField collection="stories" docId={doc.id} fieldName="floating" value={doc.floating} kind="checkbox" />
        </div>
        {doc.floating && (
          <p className="col-span-2 text-xs text-muted-foreground">
            No fixed place on the timeline yet.
            {floatingRangeText(doc.startYear, doc.endYear) && ` ${floatingRangeText(doc.startYear, doc.endYear)}.`}
          </p>
        )}
      </div>

      {/* Gap prompt */}
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Still to decide</p>
        <EditableField collection="stories" docId={doc.id} fieldName="gapPrompt" value={doc.gapPrompt} kind="textarea" placeholder="What still needs deciding?" className="text-sm" />
      </div>

      {/* Beats */}
      {doc.beats && doc.beats.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Beats</h2>
          <ol className="space-y-2">
            {doc.beats.map((b, i) => (
              <li key={b.id ?? i} className="flex gap-3 text-sm">
                <span className="shrink-0 font-mono text-xs text-muted-foreground">{i + 1}.</span>
                <CodeText text={b.beat} codeMap={codeMap} />
              </li>
            ))}
          </ol>
          <p className="mt-2 text-xs text-muted-foreground">Edit beats in admin.</p>
        </section>
      )}

      {/* Keep writing */}
      {activeRecord && (
        <StoryKeepWriting
          storyId={doc.id}
          storyName={doc.name}
          allStories={allStories}
          initialRecord={activeRecord}
          initialSummary={activeSummary}
          initialCodeMap={activeCodeMap}
          initialList={writingList}
        />
      )}

      {/* Plot outline: every story has one */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Plot outline</h2>
        <PlotOutline docId={doc.id} templateId={answers[PLOT_TEMPLATE_KEY] ?? null} answers={answers} codeMap={codeMap} />
      </section>

      {/* Relationships */}
      <RelationshipEditor myCode={storyCode} initial={relEntries} />

      {/* What links here */}
      <WhatLinksHere code={storyCode} />
    </div>
  );
}

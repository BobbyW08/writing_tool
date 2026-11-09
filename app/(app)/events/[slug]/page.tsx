import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventByCode, getEventBySlug, getRelationshipsByCode, buildCodeMap, isUnk, getLocationRef } from "@/lib/world/queries";
import { CodeText } from "@/components/code-text";
import { EditableField } from "@/components/editable-field";
import { RelationshipEditor } from "@/components/relationship-editor";
import { DeleteRecordButton } from "@/components/delete-record-button";
import { WhatLinksHere } from "@/components/what-links-here";
import { RelationshipView } from "@/components/relationship-view";
import { nodeKindFor } from "@/lib/nodeKinds";

const CODE_RE = /^E\d{1,6}$/i;

type EventDoc = {
  id: number;
  code: string;
  name: string;
  slug?: string | null;
  startYear?: number | null;
  endYear?: number | null;
  yearLabel?: string | null;
  locationId?: number | null;
  tagIds?: number[] | null;
  reviewNote?: string | null;
  gapPrompt?: string | null;
  parentId?: number | null;
  parent?: { id: number; code: string; name: string } | null;
  whatHappened?: string | null;
  whyItHappened?: string | null;
  whatItCaused?: string | null;
  whatWasLearned?: string | null;
  body?: string | null;
  status?: string | null;
  eventType?: string | null;
  importance?: string | null;
  lane?: number | null;
  updatedAt: Date | string;
};

type RelRow = {
  id: number;
  code: string;
  fromCollection: string;
  fromCode: string;
  toCollection: string;
  toCode: string;
  type?: string | null;
};

const STATUS_OPTIONS = [
  { label: "Locked (canon)", value: "locked" },
  { label: "In development", value: "in_development" },
  { label: "Needs a name", value: "needs_name" },
  { label: "Placeholder (still to decide)", value: "placeholder" },
];

const EVENT_TYPE_OPTIONS = [
  { label: "Celestial", value: "celestial" },
  { label: "Political", value: "political" },
  { label: "Battle", value: "battle" },
  { label: "Discovery", value: "discovery" },
  { label: "Death", value: "death" },
  { label: "Birth", value: "birth" },
  { label: "Journey", value: "journey" },
  { label: "Other", value: "other" },
];

const IMPORTANCE_OPTIONS = [
  { label: "Minor", value: "minor" },
  { label: "Normal", value: "normal" },
  { label: "Important", value: "important" },
];

export default async function EventReadPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const event = CODE_RE.test(slug.toUpperCase())
    ? await getEventByCode(slug)
    : await getEventBySlug(slug);
  if (!event) notFound();

  const doc = event as unknown as EventDoc;
  const code = doc.code ?? "";

  const rels = code ? await getRelationshipsByCode(code) : { from: [], to: [] };

  const allTexts = [doc.whatHappened, doc.whyItHappened, doc.whatItCaused, doc.whatWasLearned];
  const codeMap = await buildCodeMap(allTexts);
  const locationRef = await getLocationRef(doc.locationId);

  const unkTagged = isUnk(doc.tagIds ?? null);
  const parent = doc.parent ?? null;

  function yearText() {
    if (doc.yearLabel) return doc.yearLabel;
    if (doc.startYear != null && doc.endYear != null) return `Year ${doc.startYear} to ${doc.endYear}`;
    if (doc.startYear != null) return `Year ${doc.startYear}`;
    return null;
  }

  type RelEditorEntry = { id: number; code: string; collection: string; name: string; type: string; direction: "from" | "to" };
  const relEntries: RelEditorEntry[] = [];
  for (const r of rels.from as RelRow[]) {
    relEntries.push({ id: r.id, code: r.toCode, collection: r.toCollection, name: r.toCode, type: r.type ?? "", direction: "from" });
  }
  for (const r of rels.to as RelRow[]) {
    relEntries.push({ id: r.id, code: r.fromCode, collection: r.fromCollection, name: r.fromCode, type: r.type ?? "", direction: "to" });
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/events" className="hover:underline">Events</Link>
          {parent && (
            <>
              <span>/</span>
              <Link href={`/events/${parent.code}`} className="hover:underline">{parent.name}</Link>
            </>
          )}
        </div>
        <div className="mt-1 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">
                <EditableField collection="events" docId={doc.id} fieldName="name" value={doc.name} kind="text" className="text-2xl font-semibold" />
              </h1>
              {unkTagged && (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold uppercase text-amber-800 dark:bg-amber-900/40 dark:text-amber-400">
                  UNK
                </span>
              )}
            </div>
            {yearText() && <p className="text-sm text-muted-foreground">{yearText()}</p>}
            {code && <p className="font-mono text-xs text-muted-foreground">{code}</p>}
          </div>
        </div>
      </div>

      {unkTagged && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm dark:border-amber-700 dark:bg-amber-950/30">
          <span className="font-semibold">Check this: </span>
          <EditableField collection="events" docId={doc.id} fieldName="reviewNote" value={doc.reviewNote} kind="textarea" placeholder="Add review note" />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">Year</p>
          <EditableField collection="events" docId={doc.id} fieldName="startYear" value={doc.startYear} kind="number" placeholder="Click to set" />
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground">End year</p>
          <EditableField collection="events" docId={doc.id} fieldName="endYear" value={doc.endYear} kind="number" placeholder="Click to set" />
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground">Year label</p>
          <EditableField collection="events" docId={doc.id} fieldName="yearLabel" value={doc.yearLabel} kind="text" placeholder="Click to set" />
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground">Location</p>
          {locationRef ? (
            <Link href={`/locations/${locationRef.code}`} className="font-medium underline decoration-muted-foreground/50 underline-offset-2 hover:decoration-foreground">
              {locationRef.name}
            </Link>
          ) : (
            <span className="text-muted-foreground italic">None</span>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground">Event type</p>
          <EditableField collection="events" docId={doc.id} fieldName="eventType" value={doc.eventType} kind="select" options={EVENT_TYPE_OPTIONS} placeholder="Click to set" />
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground">Importance</p>
          <EditableField collection="events" docId={doc.id} fieldName="importance" value={doc.importance} kind="select" options={IMPORTANCE_OPTIONS} />
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground">Timeline lane</p>
          <EditableField collection="events" docId={doc.id} fieldName="lane" value={doc.lane} kind="number" placeholder="0" />
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-xs font-semibold text-muted-foreground">Status</span>
        <EditableField collection="events" docId={doc.id} fieldName="status" value={doc.status} kind="select" options={STATUS_OPTIONS} />
      </div>

      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Still to decide</p>
        <EditableField collection="events" docId={doc.id} fieldName="gapPrompt" value={doc.gapPrompt} kind="textarea" placeholder="What still needs deciding?" className="text-sm" />
      </div>

      {[
        { label: "What happened", field: "whatHappened", value: doc.whatHappened },
        { label: "Why it happened", field: "whyItHappened", value: doc.whyItHappened },
        { label: "What it caused", field: "whatItCaused", value: doc.whatItCaused },
        { label: "What was learned", field: "whatWasLearned", value: doc.whatWasLearned },
      ].map(({ label, field, value }) => (
        <div key={field}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          <div className="mt-1 text-sm">
            <EditableField
              collection="events"
              docId={doc.id}
              fieldName={field}
              value={value}
              kind="textarea"
              placeholder="Click to add"
              className="w-full"
              renderValue={value ? <CodeText text={value} codeMap={codeMap} /> : undefined}
            />
          </div>
        </div>
      ))}

      {doc.body && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Scene notes</p>
          <pre className="mt-1 whitespace-pre-wrap rounded-md border p-3 text-sm font-sans leading-relaxed">
            {doc.body}
          </pre>
        </div>
      )}

      <RelationshipEditor myCode={code} initial={relEntries} />

      <RelationshipView code={code} name={doc.name} color={nodeKindFor("events").color} icon={nodeKindFor("events").icon} />

      <WhatLinksHere code={code} />

      <div className="border-t pt-4">
        <DeleteRecordButton collection="events" id={doc.id} code={code} name={doc.name} />
      </div>
    </div>
  );
}

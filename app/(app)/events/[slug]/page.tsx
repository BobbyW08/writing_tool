import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventByCode, getEventBySlug, getRelationshipsByCode, buildCodeMap, isUnk } from "@/lib/world/queries";
import { RichText } from "@payloadcms/richtext-lexical/react";
import { CodeText } from "@/components/code-text";
import { EditableField } from "@/components/editable-field";
import { RelationshipEditor } from "@/components/relationship-editor";
import { DeleteRecordButton } from "@/components/delete-record-button";
import { RELATIONSHIP_TYPES } from "@/lib/relationshipTypes";

const CODE_RE = /^E\d{1,6}$/i;

type Tag = { id: number; code?: string | null };
type Ref = { relationTo: string; value: { id: number; code?: string | null; name?: string; title?: string } | number };
type InvolvesItem = { relationTo: string; value: { id: number; code?: string | null; name?: string } | number };

type EventDoc = {
  id: number;
  code?: string | null;
  name: string;
  slug?: string | null;
  startYear?: number | null;
  endYear?: number | null;
  yearLabel?: string | null;
  location?: { id: number; code?: string | null; name: string } | number | null;
  involves?: InvolvesItem[] | null;
  whatHappened?: string | null;
  whyItHappened?: string | null;
  whatItCaused?: string | null;
  whatWasLearned?: string | null;
  draftText?: Record<string, unknown> | null;
  tags?: (number | Tag)[] | null;
  reviewNote?: string | null;
  gapPrompt?: string | null;
  parent?: { id: number; code?: string | null; name: string } | number | null;
};

const STATUS_OPTIONS = [
  { label: 'Locked (canon)', value: 'locked' },
  { label: 'In development', value: 'in_development' },
  { label: 'Needs a name', value: 'needs_name' },
  { label: 'Placeholder (still to decide)', value: 'placeholder' },
];

export default async function EventReadPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const event = CODE_RE.test(slug.toUpperCase())
    ? await getEventByCode(slug)
    : await getEventBySlug(slug);
  if (!event) notFound();

  const doc = event as EventDoc;
  const code = doc.code ?? '';

  const rels = code ? await getRelationshipsByCode(code) : { from: [], to: [] };

  const allTexts = [doc.whatHappened, doc.whyItHappened, doc.whatItCaused, doc.whatWasLearned];
  const codeMap = await buildCodeMap(allTexts);

  const unkTagged = isUnk(doc.tags);

  const location = typeof doc.location === 'object' && doc.location
    ? doc.location as { id: number; code?: string | null; name: string }
    : null;
  const parent = typeof doc.parent === 'object' && doc.parent
    ? doc.parent as { id: number; code?: string | null; name: string }
    : null;

  function yearText() {
    if (doc.yearLabel) return doc.yearLabel;
    if (doc.startYear != null && doc.endYear != null) return `Year ${doc.startYear} to ${doc.endYear}`;
    if (doc.startYear != null) return `Year ${doc.startYear}`;
    return null;
  }

  const involves = (doc.involves ?? []).filter(Boolean);

  // Build relationship entries
  type RelEditorEntry = { id: number; code: string; collection: string; name: string; type: string; direction: 'from' | 'to' };
  const relEntries: RelEditorEntry[] = [];
  for (const r of rels.from) {
    const rr = r as unknown as Record<string, unknown>;
    const toRef = rr.to as Ref | null;
    const toVal = typeof toRef?.value === 'object' ? toRef?.value : null;
    relEntries.push({
      id: r.id,
      code: (r as { toCode?: string }).toCode ?? '',
      collection: toRef?.relationTo ?? '',
      name: toVal?.name ?? toVal?.title ?? toVal?.code ?? '',
      type: (r as { type?: string }).type ?? '',
      direction: 'from',
    });
  }
  for (const r of rels.to) {
    const rr = r as unknown as Record<string, unknown>;
    const fromRef = rr.from as Ref | null;
    const fromVal = typeof fromRef?.value === 'object' ? fromRef?.value : null;
    relEntries.push({
      id: r.id,
      code: (r as { fromCode?: string }).fromCode ?? '',
      collection: fromRef?.relationTo ?? '',
      name: fromVal?.name ?? fromVal?.title ?? fromVal?.code ?? '',
      type: (r as { type?: string }).type ?? '',
      direction: 'to',
    });
  }

  return (
    <div className="max-w-3xl space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/events" className="hover:underline">Events</Link>
          {parent && (
            <>
              <span>/</span>
              <Link href={`/events/${parent.code ?? parent.id}`} className="hover:underline">{parent.name}</Link>
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
          <Link href={`/admin/collections/events/${doc.id}`} className="shrink-0 text-xs text-muted-foreground hover:underline">
            Admin
          </Link>
        </div>
      </div>

      {/* UNK review note */}
      {unkTagged && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm dark:border-amber-700 dark:bg-amber-950/30">
          <span className="font-semibold">Check this: </span>
          <EditableField collection="events" docId={doc.id} fieldName="reviewNote" value={doc.reviewNote} kind="textarea" placeholder="Add review note" />
        </div>
      )}

      {/* Metadata fields */}
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
          {location ? (
            <Link href={`/locations/${location.code ?? location.id}`} className="hover:underline">{location.name}</Link>
          ) : (
            <span className="text-muted-foreground italic">None (edit in admin)</span>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-xs font-semibold text-muted-foreground">Status</span>
        <EditableField collection="events" docId={doc.id} fieldName="status" value={(doc as Record<string, unknown>).status as string} kind="select" options={STATUS_OPTIONS} />
      </div>

      {/* Gap prompt */}
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Still to decide</p>
        <EditableField collection="events" docId={doc.id} fieldName="gapPrompt" value={doc.gapPrompt} kind="textarea" placeholder="What still needs deciding?" className="text-sm" />
      </div>

      {/* Narrative fields */}
      {[
        { label: "What happened", field: "whatHappened", value: doc.whatHappened },
        { label: "Why it happened", field: "whyItHappened", value: doc.whyItHappened },
        { label: "What it caused", field: "whatItCaused", value: doc.whatItCaused },
        { label: "What was learned", field: "whatWasLearned", value: doc.whatWasLearned },
      ].map(({ label, field, value }) => (
        <div key={field}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          <div className="mt-1 text-sm">
            {value ? <CodeText text={value} codeMap={codeMap} /> : null}
            <EditableField collection="events" docId={doc.id} fieldName={field} value={value} kind="textarea" placeholder="Click to add" className="w-full" />
          </div>
        </div>
      ))}

      {/* Scene notes (rich text) */}
      {doc.draftText && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Scene notes</p>
          <div className="prose prose-sm dark:prose-invert mt-1 max-w-none">
            <RichText data={doc.draftText as never} />
          </div>
          <p className="text-xs text-muted-foreground">Rich text — edit in admin.</p>
        </div>
      )}

      {/* Involves */}
      {involves.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Involves</h2>
          <ul className="flex flex-wrap gap-2">
            {involves.map((item, i) => {
              const val = typeof item.value === 'object' ? item.value : null;
              if (!val) return null;
              const itemCode = (val as { code?: string | null }).code;
              return (
                <li key={i}>
                  <Link
                    href={`/${item.relationTo}/${itemCode ?? val.id}`}
                    className="rounded-md border px-2.5 py-1 text-sm hover:bg-accent"
                  >
                    {(val as { name?: string; title?: string }).name ?? itemCode}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Relationships */}
      <RelationshipEditor myCode={code} initial={relEntries} />

      {/* What links here */}
      <section className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        What links here — available after G1 (link index)
      </section>

      {/* Delete */}
      <div className="border-t pt-4">
        <DeleteRecordButton collection="events" id={doc.id} code={code} name={doc.name} />
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { getEntryByCode, getEntryBySlug, getSubItems, getRelationshipsByCode, getEventsInvolving, buildCodeMap, isUnk } from "@/lib/world/queries";
import { StatusBadge } from "@/components/status-badge";
import { CodeText } from "@/components/code-text";
import { RELATIONSHIP_TYPES } from "@/lib/relationshipTypes";
import { EditableField } from "@/components/editable-field";
import { DetailsEditor } from "@/components/details-editor";
import { RelationshipEditor } from "@/components/relationship-editor";
import { DeleteRecordButton } from "@/components/delete-record-button";
import { COLLECTION_FIELDS } from "@/lib/world/fields";
import { Infobox } from "@/components/infobox";
import { INFOBOX_FIELDS } from "@/lib/infobox";

const WORLD_COLLECTIONS: Record<string, string> = {
  characters: "Characters",
  locations: "Locations",
  items: "Items",
  cultures: "Cultures",
  factions: "Factions",
  races: "Races",
  languages: "Languages",
  lore: "Lore",
};

const CODE_RE = /^[CLEIFURGK]\d{1,6}$/i;

type ResolvedTag = { id: number; code: string; name: string };
type EntryDoc = {
  id: number;
  code: string;
  name: string;
  slug?: string | null;
  aliases?: unknown[] | null;
  summary?: string | null;
  status?: string | null;
  gapPrompt?: string | null;
  details?: { label: string; value?: string | null; inInfobox?: boolean | null; id?: string | null }[] | null;
  body?: string | null;
  tagIds?: number[] | null;
  tags?: ResolvedTag[] | null;
  reviewNote?: string | null;
  parentId?: number | null;
  parent?: { id: number; code: string; name: string } | null;
  imageId?: number | null;
  image?: { id: number; url?: string | null; alt?: string | null; filename?: string | null } | null;
  updatedAt: Date | string;
};

type RelRow = {
  id: number;
  code: string;
  fromCollection: string;
  fromId: number;
  fromCode: string;
  toCollection: string;
  toId: number;
  toCode: string;
  type?: string | null;
  title?: string | null;
};

const STATUS_OPTIONS = [
  { label: "Locked (canon)", value: "locked" },
  { label: "In development", value: "in_development" },
  { label: "Needs a name", value: "needs_name" },
  { label: "Placeholder (still to decide)", value: "placeholder" },
];

export default async function EntityReadPage({ params }: { params: Promise<{ entityType: string; slug: string }> }) {
  const { entityType, slug } = await params;
  const label = WORLD_COLLECTIONS[entityType];
  if (!label) notFound();

  const entry = CODE_RE.test(slug.toUpperCase())
    ? await getEntryByCode(entityType, slug)
    : await getEntryBySlug(entityType, slug);
  if (!entry) notFound();

  const doc = entry as unknown as EntryDoc;
  const code = doc.code ?? "";

  const [subItems, rels, linkedEvents] = await Promise.all([
    getSubItems(entityType, doc.id),
    code ? getRelationshipsByCode(code) : Promise.resolve({ from: [], to: [] }),
    getEventsInvolving(entityType, doc.id),
  ]);

  const allTexts = [doc.summary, doc.gapPrompt, ...(doc.details?.map(d => d.value) ?? [])];
  const codeMap = await buildCodeMap(allTexts);
  const unkTagged = isUnk(doc.tagIds ?? null);
  const parentEntry = doc.parent ?? null;

  const collFields = (COLLECTION_FIELDS[entityType] ?? []).filter(
    f => !["name", "summary", "status", "gapPrompt", "parent"].includes(f.name)
  );

  type RelEditorEntry = { id: number; code: string; collection: string; name: string; type: string; direction: "from" | "to" };
  const relEntries: RelEditorEntry[] = [];
  for (const r of rels.from as RelRow[]) {
    relEntries.push({
      id: r.id,
      code: r.toCode,
      collection: r.toCollection,
      name: r.toCode,
      type: r.type ?? "",
      direction: "from",
    });
  }
  for (const r of rels.to as RelRow[]) {
    relEntries.push({
      id: r.id,
      code: r.fromCode,
      collection: r.fromCollection,
      name: r.fromCode,
      type: r.type ?? "",
      direction: "to",
    });
  }

  const rawImage = doc.image
  const imageInfo = rawImage ? {
    id: rawImage.id,
    url: rawImage.url ?? undefined,
    alt: rawImage.alt ?? undefined,
    filename: rawImage.filename ?? undefined,
  } : null
  const infoboxFieldDefs = INFOBOX_FIELDS[entityType] ?? [];
  const fixedFields = infoboxFieldDefs.map(def => ({
    def,
    value: (doc as Record<string, unknown>)[def.field],
  }));
  const infoboxDetails = (doc.details ?? [])
    .filter(d => d.inInfobox)
    .map(d => ({ label: d.label, value: d.value ?? "" }));

  return (
    <div className="max-w-3xl space-y-8">
      <Infobox
        collection={entityType}
        docId={doc.id}
        image={imageInfo}
        fixedFields={fixedFields}
        infoboxDetails={infoboxDetails}
      />

      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href={`/${entityType}`} className="hover:underline">{label}</Link>
          {parentEntry && (
            <>
              <span>/</span>
              <Link href={`/${entityType}/${parentEntry.code}`} className="hover:underline">
                {parentEntry.name}
              </Link>
            </>
          )}
        </div>

        <div className="mt-1 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">
                <EditableField collection={entityType} docId={doc.id} fieldName="name" value={doc.name} kind="text" className="text-2xl font-semibold" />
              </h1>
              {unkTagged && (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold uppercase text-amber-800 dark:bg-amber-900/40 dark:text-amber-400">
                  UNK
                </span>
              )}
            </div>
            {code && <p className="font-mono text-xs text-muted-foreground">{code}</p>}
            {Array.isArray(doc.aliases) && doc.aliases.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Also known as: {(doc.aliases as { alias: string }[]).map(a => a.alias).join(", ")}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <EditableField collection={entityType} docId={doc.id} fieldName="status" value={doc.status} kind="select" options={STATUS_OPTIONS} />
          </div>
        </div>

        <div className="mt-2">
          <EditableField collection={entityType} docId={doc.id} fieldName="summary" value={doc.summary} kind="textarea" placeholder="Click to add summary" className="text-sm" />
        </div>
      </div>

      {unkTagged && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm dark:border-amber-700 dark:bg-amber-950/30">
          <span className="font-semibold">Check this: </span>
          <EditableField collection={entityType} docId={doc.id} fieldName="reviewNote" value={doc.reviewNote} kind="textarea" placeholder="Add review note" />
        </div>
      )}

      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Still to decide</p>
        <EditableField collection={entityType} docId={doc.id} fieldName="gapPrompt" value={doc.gapPrompt} kind="textarea" placeholder="What still needs deciding?" className="text-sm" />
      </div>

      {collFields.length > 0 && (
        <div className="space-y-3">
          {collFields.map(f => (
            <div key={f.name} className="flex items-baseline gap-2">
              <span className="w-32 shrink-0 text-xs font-semibold text-muted-foreground">{f.label}</span>
              {f.kind !== "relationship" ? (
                <EditableField
                  collection={entityType}
                  docId={doc.id}
                  fieldName={f.name}
                  value={(doc as Record<string, unknown>)[f.name] as string | number | boolean | null | undefined}
                  kind={f.kind}
                  options={f.options}
                  placeholder="Click to add"
                  className="flex-1 text-sm"
                />
              ) : (
                <span className="flex-1 text-sm text-muted-foreground">
                  (edit in admin for relationships)
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <DetailsEditor
        collection={entityType}
        docId={doc.id}
        initial={(doc.details ?? []).map(d => ({
          id: d.id ?? undefined,
          label: d.label,
          value: d.value ?? "",
          inInfobox: d.inInfobox ?? false,
        }))}
      />

      {doc.body && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Notes</h2>
          <pre className="whitespace-pre-wrap rounded-md border p-3 text-sm font-sans leading-relaxed">
            {doc.body}
          </pre>
        </div>
      )}

      {subItems.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Sub-items</h2>
          <ul className="divide-y rounded-md border">
            {(subItems as EntryDoc[]).map(s => (
              <li key={s.id}>
                <Link href={`/${entityType}/${s.code ?? s.id}`} className="flex items-center gap-2 p-2.5 hover:bg-accent">
                  <span className="font-mono text-xs text-muted-foreground">{s.code}</span>
                  <span className="text-sm">{s.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <RelationshipEditor myCode={code} initial={relEntries} />

      {(linkedEvents as EventRow[]).length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Events</h2>
          <ul className="divide-y rounded-md border">
            {(linkedEvents as EventRow[]).map(ev => (
              <li key={ev.id}>
                <Link href={`/events/${ev.code ?? ev.id}`} className="flex items-center gap-2 p-2.5 hover:bg-accent">
                  {ev.yearLabel && <span className="font-mono text-xs text-muted-foreground">{ev.yearLabel}</span>}
                  <span className="text-sm">{ev.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        What links here — available after G1 (link index)
      </section>

      <div className="border-t pt-4">
        <DeleteRecordButton collection={entityType} id={doc.id} code={code} name={doc.name} />
      </div>
    </div>
  );
}

type EventRow = { id: number; code: string; name: string; yearLabel?: string | null };

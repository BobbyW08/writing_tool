import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { movedTo } from "@/lib/codes-history";
import { getEntryByCode, getEntryBySlug, getSubItems, getRelationshipsByCode, getEventsInvolving, buildCodeMap, isUnk, getMapsForLocation, getMapByCode } from "@/lib/world/queries";
import { MapCanvas, type MapData } from "@/components/map-canvas";
import { StatusBadge } from "@/components/status-badge";
import { CodeText } from "@/components/code-text";
import { RELATIONSHIP_TYPES } from "@/lib/relationshipTypes";
import { EditableField } from "@/components/editable-field";
import { DetailsEditor } from "@/components/details-editor";
import { SheetEditor } from "@/components/sheet-editor";
import { SHEET_TEMPLATES } from "@/lib/sheets/templates";
import { nonSheetRows, sheetAnswers } from "@/lib/sheets/answers";
import { RelationshipEditor } from "@/components/relationship-editor";
import { RecordActions } from "@/components/record-actions";
import { COLLECTION_FIELDS } from "@/lib/world/fields";
import { Infobox } from "@/components/infobox";
import { INFOBOX_FIELDS } from "@/lib/infobox";
import { WhatLinksHere } from "@/components/what-links-here";
import { RelationshipView } from "@/components/relationship-view";
import { nodeKindFor } from "@/lib/nodeKinds";
import { AiAssistBar } from "@/components/ai-assist-bar";

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
  startYear?: number | null;
  endYear?: number | null;
  notes?: string | null;
};

export default async function EntityReadPage({ params }: { params: Promise<{ entityType: string; slug: string }> }) {
  const { entityType, slug } = await params;
  const label = WORLD_COLLECTIONS[entityType];
  if (!label) notFound();

  const entry = CODE_RE.test(slug.toUpperCase())
    ? await getEntryByCode(entityType, slug)
    : await getEntryBySlug(entityType, slug);
  if (!entry) {
    const moved = CODE_RE.test(slug.toUpperCase()) ? await movedTo(slug) : null;
    if (moved) redirect(moved);
    notFound();
  }

  const doc = entry as unknown as EntryDoc;
  const code = doc.code ?? "";

  const [subItems, rels, linkedEvents, locationMaps] = await Promise.all([
    getSubItems(entityType, doc.id),
    code ? getRelationshipsByCode(code) : Promise.resolve({ from: [], to: [] }),
    getEventsInvolving(entityType, doc.id),
    entityType === "locations" ? getMapsForLocation(doc.id) : Promise.resolve([]),
  ]);
  const firstLocationMap = locationMaps[0] ? await getMapByCode(locationMaps[0].code) : null;

  const answers = sheetAnswers(doc.details);
  const sheet = SHEET_TEMPLATES[entityType] ?? null;
  const allTexts = [doc.summary, doc.gapPrompt, ...(doc.details?.map(d => d.value) ?? [])];
  const codeMap = await buildCodeMap(allTexts);
  const unkTagged = isUnk(doc.tagIds ?? null);
  const parentEntry = doc.parent ?? null;

  const collFields = (COLLECTION_FIELDS[entityType] ?? []).filter(
    f => !["name", "summary", "status", "gapPrompt", "parent"].includes(f.name)
  );

  type RelEditorEntry = { id: number; code: string; collection: string; name: string; type: string; direction: "from" | "to"; startYear: number | null; endYear: number | null; notes: string | null };
  const relEntries: RelEditorEntry[] = [];
  for (const r of rels.from as RelRow[]) {
    relEntries.push({
      id: r.id,
      code: r.toCode,
      collection: r.toCollection,
      name: r.toCode,
      type: r.type ?? "",
      direction: "from",
      startYear: r.startYear ?? null,
      endYear: r.endYear ?? null,
      notes: r.notes ?? null,
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
      startYear: r.startYear ?? null,
      endYear: r.endYear ?? null,
      notes: r.notes ?? null,
    });
  }

  const PLACE_HISTORY_TYPES = ["born_in", "lives_in", "visited", "rules"];
  const placeEntries = entityType === "characters"
    ? relEntries
        .filter(r => r.direction === "from" && r.collection === "locations" && PLACE_HISTORY_TYPES.includes(r.type))
        .sort((a, b) => (a.startYear ?? -Infinity) - (b.startYear ?? -Infinity))
    : [];
  const placeCodeMap = placeEntries.length > 0 ? await buildCodeMap(placeEntries.map(p => p.code)) : {};

  function placeYearRangeText(startYear: number | null, endYear: number | null): string | null {
    if (startYear == null && endYear == null) return null;
    if (startYear != null && endYear != null) return `Year ${startYear} to ${endYear}`;
    if (startYear != null) return `Year ${startYear} on`;
    return `Until year ${endYear}`;
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

        <div className="mt-1 flex flex-wrap items-start gap-3">
          <div className="flex-1">
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
          <RecordActions collection={entityType} id={doc.id} code={code} name={doc.name} status={doc.status} />
        </div>

        <div className="mt-2">
          <EditableField collection={entityType} docId={doc.id} fieldName="summary" value={doc.summary} kind="textarea" placeholder="Click to add summary" className="text-sm" />
        </div>
      </div>

      <AiAssistBar
        collection={entityType}
        code={code}
        docId={doc.id}
        currentDetails={(doc.details ?? []).map(d => ({ label: d.label, value: d.value ?? "" }))}
      />

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
                <span className="flex-1 text-sm text-muted-foreground italic">
                  set via Relationships below
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {sheet && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">{sheet.title}</h2>
          <SheetEditor
            collection={entityType}
            docId={doc.id}
            sections={sheet.sections}
            answers={answers}
            codeMap={codeMap}
            openFirst={entityType === "characters"}
            credit={sheet.credit}
          />
        </section>
      )}

      <DetailsEditor
        collection={entityType}
        docId={doc.id}
        initial={nonSheetRows(doc.details).map(d => ({
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

      {entityType === "characters" && placeEntries.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Places</h2>
          <ul className="divide-y rounded-md border">
            {placeEntries.map(p => (
              <li key={p.id} className="flex items-center gap-2 p-2.5 text-sm">
                <Link href={`/locations/${p.code}`} className="flex-1 hover:underline">
                  <span className="font-mono text-xs text-muted-foreground">{p.code}</span>{" "}
                  {placeCodeMap[p.code]?.name ?? p.code}
                </Link>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {RELATIONSHIP_TYPES.find(t => t.value === p.type)?.label ?? p.type}
                </span>
                {placeYearRangeText(p.startYear, p.endYear) && (
                  <span className="shrink-0 text-xs text-muted-foreground">{placeYearRangeText(p.startYear, p.endYear)}</span>
                )}
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

      {locationMaps.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Maps</h2>
          <ul className="flex flex-wrap gap-2">
            {locationMaps.map(m => (
              <li key={m.id}>
                <Link href={`/maps/${m.code}`} className="rounded border px-2 py-1 text-sm hover:bg-accent">
                  {m.name}
                </Link>
              </li>
            ))}
          </ul>
          {firstLocationMap && <MapCanvas map={firstLocationMap as unknown as MapData} editable={false} />}
        </section>
      )}

      <RelationshipView code={code} name={doc.name} color={nodeKindFor(entityType).color} icon={nodeKindFor(entityType).icon} />

      <WhatLinksHere code={code} />
    </div>
  );
}

type EventRow = { id: number; code: string; name: string; yearLabel?: string | null };

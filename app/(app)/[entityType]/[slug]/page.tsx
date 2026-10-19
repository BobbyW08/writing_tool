import Link from "next/link";
import { notFound } from "next/navigation";
import { entityTypeByUrlSlug, entityTypeByDbType } from "@/lib/data/entity-types";
import {
  getEntityBySlug,
  getRelatedEntities,
  getLinkedEvents,
  listAllEntitiesForPicker,
  getChildEntities,
  getParentEntity,
} from "@/lib/data/entities";
import { listEvents } from "@/lib/data/events";
import {
  updateEntityAction,
  deleteEntityAction,
  addRelationshipAction,
  removeRelationshipAction,
  addSubItemAction,
  removeSubItemAction,
  convertEntityToEventAction,
} from "@/lib/actions/entities";
import { addEventLinkAction, removeEventLinkAction } from "@/lib/actions/events";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { StatusSelect } from "@/components/status-select";
import { TypeSelect } from "@/components/type-select";
import { StatusBadge } from "@/components/status-badge";
import { EntityFieldsEditor } from "@/components/entity-fields-editor";
import { EntityReadView } from "@/components/entity-read-view";
import { ViewEditToggle } from "@/components/view-edit-toggle";
import { DeleteButton } from "@/components/delete-button";
import { ConvertToEventButton } from "@/components/convert-to-event-button";
import { AddLinkForm } from "@/components/add-link-form";
import { EntityContinuity } from "@/components/entity-continuity";
import { buildWikiResolveMaps } from "@/lib/wiki-resolve";
import { X } from "lucide-react";

export default async function EntityDetailPage({ params }: { params: Promise<{ entityType: string; slug: string }> }) {
  const { entityType, slug } = await params;
  const typeConfig = entityTypeByUrlSlug(entityType);
  if (!typeConfig) notFound();

  const entity = await getEntityBySlug(slug);
  if (!entity || entity.type !== typeConfig.dbType) notFound();

  const [related, linkedEvents, allEntities, allEvents, children, parent] = await Promise.all([
    getRelatedEntities(entity.id),
    getLinkedEvents(entity.id),
    listAllEntitiesForPicker(),
    listEvents(),
    getChildEntities(entity.id),
    getParentEntity(entity.parentEntityId),
  ]);

  const relatedIds = new Set(related.map((r) => r.relatedEntityId));
  const relationshipOptions = allEntities
    .filter((e) => e.id !== entity.id && !relatedIds.has(e.id))
    .map((e) => ({ id: e.id, name: e.name, group: entityTypeByDbType(e.type)?.pluralLabel ?? e.type }));

  const linkedEventIds = new Set(linkedEvents.map((e) => e.eventId));
  const eventOptions = allEvents.filter((e) => !linkedEventIds.has(e.id)).map((e) => ({ id: e.id, name: e.title, group: "Events" }));

  const childIds = new Set(children.map((c) => c.id));
  const subItemOptions = allEntities
    .filter((e) => e.id !== entity.id && !childIds.has(e.id) && e.id !== entity.parentEntityId)
    .map((e) => ({ id: e.id, name: e.name, group: entityTypeByDbType(e.type)?.pluralLabel ?? e.type }));

  const wikiMaps = buildWikiResolveMaps(allEntities, allEvents);

  async function addRelationship(formData: FormData) {
    "use server";
    const targetId = String(formData.get("targetEntityId") ?? "");
    const label = String(formData.get("label") ?? "").trim() || null;
    if (targetId) await addRelationshipAction(entity!.id, targetId, label);
  }

  async function addEventLink(formData: FormData) {
    "use server";
    const eventId = String(formData.get("eventId") ?? "");
    if (eventId) await addEventLinkAction(eventId, entity!.id, null);
  }

  async function addSubItem(formData: FormData) {
    "use server";
    const childId = String(formData.get("childEntityId") ?? "");
    if (childId) await addSubItemAction(entity!.id, childId);
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href={`/${typeConfig.urlSlug}`} className="text-sm text-muted-foreground hover:underline">
            ← {typeConfig.pluralLabel}
          </Link>
          {parent && (
            <div className="text-sm text-muted-foreground">
              Part of{" "}
              <Link href={`/${entityTypeByDbType(parent.type)?.urlSlug ?? typeConfig.urlSlug}/${parent.slug}`} className="hover:underline">
                {parent.name}
              </Link>
            </div>
          )}
          <h1 className="mt-1 text-2xl font-semibold">{entity.name}</h1>
        </div>
        <StatusBadge status={entity.status} />
      </div>

      <ViewEditToggle
        view={<EntityReadView fields={entity.fields} gapPrompt={entity.gapPrompt} sourceDocId={entity.sourceDocId} maps={wikiMaps} />}
        edit={
          <form action={updateEntityAction.bind(null, entity.id, typeConfig.urlSlug)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={entity.name} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <TypeSelect name="type" defaultValue={entity.type} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <StatusSelect name="status" defaultValue={entity.status} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gapPrompt">Gap prompt</Label>
              <Textarea id="gapPrompt" name="gapPrompt" defaultValue={entity.gapPrompt ?? ""} rows={2} />
            </div>

            <div className="space-y-2">
              <Label>Fields</Label>
              <EntityFieldsEditor initialFields={entity.fields} />
            </div>

            <Button type="submit">Save</Button>
          </form>
        }
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Sub-items</h2>
        {children.length > 0 && (
          <ul className="space-y-1">
            {children.map((c) => {
              const cType = entityTypeByDbType(c.type);
              return (
                <li key={c.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-sm">
                  <Link href={cType ? `/${cType.urlSlug}/${c.slug}` : "#"} className="hover:underline">
                    {c.name}
                  </Link>
                  <form action={removeSubItemAction.bind(null, c.id)}>
                    <Button type="submit" variant="ghost" size="icon" aria-label="Remove sub-item">
                      <X className="size-4" />
                    </Button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
        {subItemOptions.length > 0 && (
          <AddLinkForm action={addSubItem} options={subItemOptions} targetFieldName="childEntityId" submitLabel="Add sub-item" />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Related entities</h2>
        {related.length > 0 && (
          <ul className="space-y-1">
            {related.map((r) => {
              const rType = entityTypeByDbType(r.type);
              return (
                <li key={r.relatedEntityId} className="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-sm">
                  <Link href={rType ? `/${rType.urlSlug}/${r.slug}` : "#"} className="hover:underline">
                    {r.name} {r.label && <span className="text-muted-foreground">— {r.label}</span>}
                  </Link>
                  <form action={removeRelationshipAction.bind(null, entity.id, r.relatedEntityId)}>
                    <Button type="submit" variant="ghost" size="icon" aria-label="Remove relationship">
                      <X className="size-4" />
                    </Button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
        {relationshipOptions.length > 0 && (
          <AddLinkForm
            action={addRelationship}
            options={relationshipOptions}
            targetFieldName="targetEntityId"
            labelFieldName="label"
            labelPlaceholder="context (optional)"
            submitLabel="Add relationship"
          />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Events</h2>
        {linkedEvents.length > 0 && (
          <ul className="space-y-1">
            {linkedEvents.map((e) => (
              <li key={e.eventId} className="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-sm">
                <Link href={`/events/${e.slug}`} className="hover:underline">
                  {e.yearLabel ? <span className="text-muted-foreground">{e.yearLabel} — </span> : null}
                  {e.title}
                </Link>
                <form action={removeEventLinkAction.bind(null, e.eventId, entity.id)}>
                  <Button type="submit" variant="ghost" size="icon" aria-label="Remove event link">
                    <X className="size-4" />
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
        {eventOptions.length > 0 && (
          <AddLinkForm action={addEventLink} options={eventOptions} targetFieldName="eventId" submitLabel="Add to event" />
        )}
      </section>

      <EntityContinuity entityId={entity.id} />

      <div className="flex items-center gap-2 border-t pt-6">
        <ConvertToEventButton action={convertEntityToEventAction.bind(null, entity.id)} itemLabel={entity.name} />
        <DeleteButton action={deleteEntityAction.bind(null, entity.id, typeConfig.urlSlug)} itemLabel={entity.name} />
      </div>
    </div>
  );
}

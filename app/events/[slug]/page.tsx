import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventBySlug, getEventLocation, getEventLinkedEntities, listEvents, getChildEvents, getParentEvent } from "@/lib/data/events";
import { listEntitiesByType, listAllEntitiesForPicker } from "@/lib/data/entities";
import { entityTypeByDbType } from "@/lib/data/entity-types";
import {
  updateEventAction,
  deleteEventAction,
  addEventLinkAction,
  removeEventLinkAction,
  addSubEventAction,
  removeSubEventAction,
} from "@/lib/actions/events";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LocationSelect } from "@/components/location-select";
import { EventReadView } from "@/components/event-read-view";
import { ViewEditToggle } from "@/components/view-edit-toggle";
import { DeleteButton } from "@/components/delete-button";
import { AddLinkForm } from "@/components/add-link-form";
import { buildWikiResolveMaps } from "@/lib/wiki-resolve";
import { X } from "lucide-react";

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const [location, linkedEntities, locationOptions, allEntities, allEvents, children, parent] = await Promise.all([
    getEventLocation(event.locationId),
    getEventLinkedEntities(event.id),
    listEntitiesByType("location"),
    listAllEntitiesForPicker(),
    listEvents(),
    getChildEvents(event.id),
    getParentEvent(event.parentEventId),
  ]);

  const linkedIds = new Set(linkedEntities.map((e) => e.entityId));
  const entityOptions = allEntities
    .filter((e) => !linkedIds.has(e.id))
    .map((e) => ({ id: e.id, name: e.name, group: entityTypeByDbType(e.type)?.pluralLabel ?? e.type }));

  const childIds = new Set(children.map((c) => c.id));
  const subEventOptions = allEvents
    .filter((e) => e.id !== event.id && !childIds.has(e.id) && e.id !== event.parentEventId)
    .map((e) => ({ id: e.id, name: e.title, group: "Events" }));

  async function addEntityLink(formData: FormData) {
    "use server";
    const entityId = String(formData.get("entityId") ?? "");
    if (entityId) await addEventLinkAction(event!.id, entityId, null);
  }

  async function addSubEvent(formData: FormData) {
    "use server";
    const childId = String(formData.get("childEventId") ?? "");
    if (childId) await addSubEventAction(event!.id, childId);
  }

  const wikiMaps = buildWikiResolveMaps(allEntities, allEvents);

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <Link href="/events" className="text-sm text-muted-foreground hover:underline">
          ← Events
        </Link>
        {parent && (
          <div className="text-sm text-muted-foreground">
            Part of{" "}
            <Link href={`/events/${parent.slug}`} className="hover:underline">
              {parent.title}
            </Link>
          </div>
        )}
        <h1 className="mt-1 text-2xl font-semibold">{event.title}</h1>
        {event.yearLabel && <p className="text-sm text-muted-foreground">{event.yearLabel}</p>}
      </div>

      <ViewEditToggle
        view={
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Location</div>
              <div className="text-sm">
                {location ? (
                  <Link
                    href={`/locations/${location.slug}`}
                    className="underline decoration-muted-foreground/50 underline-offset-2 hover:decoration-foreground"
                  >
                    {location.name}
                  </Link>
                ) : (
                  <span className="text-muted-foreground italic">(blank)</span>
                )}
              </div>
            </div>
            <EventReadView
              whatHappened={event.whatHappened}
              whyItHappened={event.whyItHappened}
              whatItCaused={event.whatItCaused}
              whatWasLearned={event.whatWasLearned}
              draftText={event.draftText}
              sourceDocId={event.sourceDocId}
              maps={wikiMaps}
            />
          </div>
        }
        edit={
          <form action={updateEventAction.bind(null, event.id)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" defaultValue={event.title} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="yearLabel">Year label</Label>
                <Input id="yearLabel" name="yearLabel" defaultValue={event.yearLabel ?? ""} placeholder="Age ~350–400" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sortOrder">Sort order</Label>
                <Input id="sortOrder" name="sortOrder" type="number" defaultValue={event.sortOrder ?? ""} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <LocationSelect name="locationId" defaultValue={event.locationId} options={locationOptions} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatHappened">What happened</Label>
              <Textarea id="whatHappened" name="whatHappened" defaultValue={event.whatHappened ?? ""} rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whyItHappened">Why it happened</Label>
              <Textarea id="whyItHappened" name="whyItHappened" defaultValue={event.whyItHappened ?? ""} rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatItCaused">What it caused</Label>
              <Textarea id="whatItCaused" name="whatItCaused" defaultValue={event.whatItCaused ?? ""} rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatWasLearned">What was learned</Label>
              <Textarea id="whatWasLearned" name="whatWasLearned" defaultValue={event.whatWasLearned ?? ""} rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="draftText">Draft / notes</Label>
              <Textarea id="draftText" name="draftText" defaultValue={event.draftText ?? ""} rows={4} />
            </div>

            <Button type="submit">Save</Button>
          </form>
        }
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Sub-events</h2>
        {children.length > 0 && (
          <ul className="space-y-1">
            {children.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-sm">
                <Link href={`/events/${c.slug}`} className="hover:underline">
                  {c.yearLabel ? <span className="text-muted-foreground">{c.yearLabel} — </span> : null}
                  {c.title}
                </Link>
                <form action={removeSubEventAction.bind(null, c.id)}>
                  <Button type="submit" variant="ghost" size="icon" aria-label="Remove sub-event">
                    <X className="size-4" />
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
        {subEventOptions.length > 0 && (
          <AddLinkForm action={addSubEvent} options={subEventOptions} targetFieldName="childEventId" submitLabel="Add sub-event" />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Entities involved</h2>
        {linkedEntities.length > 0 && (
          <ul className="space-y-1">
            {linkedEntities.map((e) => {
              const t = entityTypeByDbType(e.type);
              return (
                <li key={e.entityId} className="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-sm">
                  <Link href={t ? `/${t.urlSlug}/${e.slug}` : "#"} className="hover:underline">
                    {e.name} {e.role && <span className="text-muted-foreground">({e.role})</span>}
                  </Link>
                  <form action={removeEventLinkAction.bind(null, event.id, e.entityId)}>
                    <Button type="submit" variant="ghost" size="icon" aria-label="Remove link">
                      <X className="size-4" />
                    </Button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
        {entityOptions.length > 0 && (
          <AddLinkForm action={addEntityLink} options={entityOptions} targetFieldName="entityId" submitLabel="Add entity" />
        )}
      </section>

      <div className="border-t pt-6">
        <DeleteButton action={deleteEventAction.bind(null, event.id)} itemLabel={event.title} />
      </div>
    </div>
  );
}

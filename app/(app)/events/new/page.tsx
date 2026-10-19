import Link from "next/link";
import { listEntitiesByType } from "@/lib/data/entities";
import { createEventAction } from "@/lib/actions/events";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LocationSelect } from "@/components/location-select";

export default async function NewEventPage() {
  const locationOptions = await listEntitiesByType("location");

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/events" className="text-sm text-muted-foreground hover:underline">
          ← Events
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">New event</h1>
      </div>

      <form action={createEventAction} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" required autoFocus />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="yearLabel">Year label</Label>
            <Input id="yearLabel" name="yearLabel" placeholder="Age ~350–400" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sortOrder">Sort order</Label>
            <Input id="sortOrder" name="sortOrder" type="number" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Location</Label>
          <LocationSelect name="locationId" defaultValue={null} options={locationOptions} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="whatHappened">What happened</Label>
          <Textarea id="whatHappened" name="whatHappened" rows={3} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="whyItHappened">Why it happened</Label>
          <Textarea id="whyItHappened" name="whyItHappened" rows={3} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="whatItCaused">What it caused</Label>
          <Textarea id="whatItCaused" name="whatItCaused" rows={3} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="whatWasLearned">What was learned</Label>
          <Textarea id="whatWasLearned" name="whatWasLearned" rows={3} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="draftText">Draft / notes</Label>
          <Textarea id="draftText" name="draftText" rows={4} />
        </div>

        <Button type="submit">Create event</Button>
      </form>
    </div>
  );
}

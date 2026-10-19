import Link from "next/link";
import { listEvents } from "@/lib/data/events";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function EventsIndexPage() {
  const rows = await listEvents();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Events</h1>
        <Button asChild size="sm">
          <Link href="/events/new">
            <Plus className="size-4" /> Add event
          </Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No events yet.</p>
      ) : (
        <div className="divide-y rounded-md border">
          {rows.map((e) => (
            <Link key={e.id} href={`/events/${e.slug ?? e.id}`} className="flex items-center justify-between gap-4 p-3 hover:bg-accent">
              <span className="font-medium">{e.title}</span>
              <span className="text-sm text-muted-foreground">{e.yearLabel}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

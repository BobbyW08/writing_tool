import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { entities, events } from "@/lib/db/schema";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ENTITY_TYPES } from "@/lib/data/entity-types";

export default async function HomePage() {
  const entityCounts = await db.select({ type: entities.type, count: sql<number>`count(*)::int` }).from(entities).groupBy(entities.type);
  const [{ count: eventCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(events);
  const countByType = Object.fromEntries(entityCounts.map((r) => [r.type, r.count]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">The Traveler</h1>
        <p className="text-sm text-muted-foreground">Story wiki and timeline.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <Link href="/events">
          <Card className="transition-colors hover:bg-accent">
            <CardHeader>
              <CardTitle>Events</CardTitle>
              <CardDescription>{eventCount} recorded</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/snippets">
          <Card className="transition-colors hover:bg-accent">
            <CardHeader>
              <CardTitle>Snippets</CardTitle>
              <CardDescription>Write and check against canon</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        {ENTITY_TYPES.map((t) => (
          <Link key={t.urlSlug} href={`/${t.urlSlug}`}>
            <Card className="transition-colors hover:bg-accent">
              <CardHeader>
                <CardTitle>{t.pluralLabel}</CardTitle>
                <CardDescription>{countByType[t.dbType] ?? 0} entries</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

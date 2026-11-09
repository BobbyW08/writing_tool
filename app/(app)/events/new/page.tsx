import Link from "next/link";
import { NewEntityForm } from "@/components/new-entity-form";
import { COLLECTION_FIELDS } from "@/lib/world/fields";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ startYear?: string; lane?: string }>;
}) {
  const { startYear, lane } = await searchParams;
  const initialValues: Record<string, unknown> = {};
  if (startYear) initialValues.startYear = Number(startYear);
  if (lane) initialValues.lane = Number(lane);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/events" className="text-sm text-muted-foreground hover:underline">
          Events
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">New event</h1>
      </div>
      <NewEntityForm
        collection="events"
        fields={COLLECTION_FIELDS.events ?? []}
        redirectBase="/events"
        initialValues={initialValues}
      />
    </div>
  );
}

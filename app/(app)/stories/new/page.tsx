import Link from "next/link";
import { NewEntityForm } from "@/components/new-entity-form";
import { COLLECTION_FIELDS } from "@/lib/world/fields";

export default async function NewStoryPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/stories" className="text-sm text-muted-foreground hover:underline">
          Stories
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">New story</h1>
      </div>
      <NewEntityForm
        collection="stories"
        fields={COLLECTION_FIELDS.stories ?? []}
        redirectBase="/stories"
      />
    </div>
  );
}

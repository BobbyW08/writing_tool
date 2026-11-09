import { notFound } from "next/navigation";
import { WORLD_SLUGS } from "@/lib/codes";
import EntityReadPage from "@/app/(app)/[entityType]/[slug]/page";
import EventReadPage from "@/app/(app)/events/[slug]/page";
import StoryReadPage from "@/app/(app)/stories/[code]/page";

const WORLD_COLLECTION_SET = new Set<string>(WORLD_SLUGS);

// Step U5: renders a record's full read page from just its collection and code, reusing the
// exact same page components the real routes use (hard rule 10 -- never a second copy of the
// same rendering logic). Used by both the @modal intercepted popup and anywhere else that only
// has a collection+code pair to work from. Scoped to the collections node map / relationship
// view / boards / story board actually link into -- the 8 world collections, events and stories.
export async function RecordViewDispatch({ collection, code }: { collection: string; code: string }) {
  const upper = code.toUpperCase();

  if (WORLD_COLLECTION_SET.has(collection)) {
    return <EntityReadPage params={Promise.resolve({ entityType: collection, slug: upper })} />;
  }
  if (collection === "events") {
    return <EventReadPage params={Promise.resolve({ slug: upper })} />;
  }
  if (collection === "stories") {
    return <StoryReadPage params={Promise.resolve({ code: upper })} />;
  }
  notFound();
}

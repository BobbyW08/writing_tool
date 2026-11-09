import { RecordModal } from "@/components/record-modal";
import { RecordViewDispatch } from "@/components/record-view-dispatch";
import { hrefForNode } from "@/lib/graph/href";

// Step U5: the modal path. A client-side navigation to /view/[collection]/[code] lands here
// instead of the real route one level up (app/(app)/view/.../page.tsx), per Next's
// intercepting-routes convention -- same read page components, shown as a popup over whatever
// view the user was already on.
export default async function ViewModalPage({ params }: { params: Promise<{ collection: string; code: string }> }) {
  const { collection, code } = await params;
  const upper = code.toUpperCase();

  return (
    <RecordModal href={hrefForNode(collection, upper)}>
      <RecordViewDispatch collection={collection} code={upper} />
    </RecordModal>
  );
}

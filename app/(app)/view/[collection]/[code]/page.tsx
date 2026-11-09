import { redirect } from "next/navigation";
import { hrefForNode } from "@/lib/graph/href";

// Step U5: the real route behind the @modal/(.)view intercepted popup. On a hard navigation,
// refresh, or shared link, there's no modal to intercept into, so this just sends the browser to
// the record's own canonical page -- the same one the modal's "Open full page" link uses.
export default async function ViewRedirectPage({ params }: { params: Promise<{ collection: string; code: string }> }) {
  const { collection, code } = await params;
  redirect(hrefForNode(collection, code.toUpperCase()));
}

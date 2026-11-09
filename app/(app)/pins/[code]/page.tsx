import { redirect, notFound } from "next/navigation";
import { getEntryByCode, getMapCodeById } from "@/lib/world/queries";

// Pins have no read page of their own — they live inside their map's viewer. This route exists
// only so a P-code in text or the link index resolves somewhere real (lib/graph/href.ts).
export default async function PinRedirectPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const pin = await getEntryByCode("map-pins", code) as { mapId?: number | null } | null;
  if (!pin) notFound();

  const mapCode = await getMapCodeById(pin.mapId ?? null);
  if (!mapCode) notFound();

  redirect(`/maps/${mapCode}?pin=${code.toUpperCase()}`);
}

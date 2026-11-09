import { getGraphCandidates } from "@/lib/world/queries";
import { NodeMapView } from "@/components/node-map-view";

export default async function NodeMapPage() {
  const candidates = await getGraphCandidates();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Node map</h1>
        <p className="text-sm text-muted-foreground">
          Every connection from the link index. Color by collection; click a node to center on it, double-click to open it.
        </p>
      </div>
      <NodeMapView candidates={candidates} />
    </div>
  );
}

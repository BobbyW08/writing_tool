import Link from "next/link";
import { notFound } from "next/navigation";
import { getMapByCode } from "@/lib/world/queries";
import { EditableField } from "@/components/editable-field";
import { DeleteRecordButton } from "@/components/delete-record-button";
import { MapBaseImageUpload } from "@/components/map-base-image-upload";
import { MapCanvas, type MapData } from "@/components/map-canvas";
import { WhatLinksHere } from "@/components/what-links-here";

const KIND_OPTIONS = [
  { label: "World", value: "world" },
  { label: "Region", value: "region" },
  { label: "City", value: "city" },
  { label: "Building", value: "building" },
  { label: "Diagram", value: "diagram" },
  { label: "Other", value: "other" },
];

export default async function MapPage({
  params, searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ pin?: string }>;
}) {
  const { code } = await params;
  const { pin } = await searchParams;
  const map = await getMapByCode(code);
  if (!map) notFound();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/maps" className="hover:underline">Maps</Link>
        </div>
        <div className="mt-1 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">
              <EditableField collection="maps" docId={map.id} fieldName="name" value={map.name} kind="text" className="text-2xl font-semibold" />
            </h1>
            <p className="font-mono text-xs text-muted-foreground">{map.code}</p>
          </div>
          <div className="flex items-center gap-2">
            <EditableField collection="maps" docId={map.id} fieldName="kind" value={map.kind} kind="select" options={KIND_OPTIONS} />
            <MapBaseImageUpload mapId={map.id} hasImage={!!map.baseImage} />
          </div>
        </div>
        <div className="mt-2">
          <EditableField collection="maps" docId={map.id} fieldName="summary" value={map.summary} kind="textarea" placeholder="Click to add summary" className="text-sm" />
        </div>
        {map.location && (
          <p className="mt-1 text-xs text-muted-foreground">
            Depicts <Link href={`/locations/${map.location.code}`} className="hover:underline">{map.location.name}</Link>
          </p>
        )}
      </div>

      <MapCanvas map={map as unknown as MapData} editable focusPinCode={pin} />

      <WhatLinksHere code={map.code} />

      <div className="border-t pt-4">
        <DeleteRecordButton collection="maps" id={map.id} code={map.code} name={map.name} />
      </div>
    </div>
  );
}

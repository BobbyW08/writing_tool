import Link from "next/link";
import { notFound } from "next/navigation";
import { getChronicleByCode, getEventsForChronicle, getMapsDataByIds } from "@/lib/world/queries";
import { EditableField } from "@/components/editable-field";
import { DeleteRecordButton } from "@/components/delete-record-button";
import { WhatLinksHere } from "@/components/what-links-here";
import { MapPeriodsEditor, ChronicleErasEditor, ChronicleFilterEditor } from "@/components/chronicle-config";
import { ChronicleView, type ChronicleEvent } from "@/components/chronicle-view";
import type { MapData } from "@/components/map-canvas";

export default async function ChroniclePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const chronicle = await getChronicleByCode(code);
  if (!chronicle) notFound();

  const events = await getEventsForChronicle({
    startYear: chronicle.startYear,
    endYear: chronicle.endYear,
    filter: chronicle.filter,
  });

  const mapIds = [
    ...new Set([
      ...chronicle.mapPeriods.map(p => p.mapId),
      ...events.flatMap(e => e.pins.map(p => p.mapId)),
    ]),
  ];
  const maps = await getMapsDataByIds(mapIds);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/chronicles" className="hover:underline">Chronicles</Link>
        </div>
        <h1 className="mt-1 text-2xl font-semibold">
          <EditableField collection="chronicles" docId={chronicle.id} fieldName="name" value={chronicle.name} kind="text" className="text-2xl font-semibold" />
        </h1>
        <p className="font-mono text-xs text-muted-foreground">{chronicle.code}</p>
        <div className="mt-2">
          <EditableField collection="chronicles" docId={chronicle.id} fieldName="summary" value={chronicle.summary} kind="textarea" placeholder="Click to add summary" className="text-sm" />
        </div>
        <div className="mt-2 flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Start year</span>
            <EditableField collection="chronicles" docId={chronicle.id} fieldName="startYear" value={chronicle.startYear} kind="number" placeholder="Click to set" />
          </span>
          <span className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">End year</span>
            <EditableField collection="chronicles" docId={chronicle.id} fieldName="endYear" value={chronicle.endYear} kind="number" placeholder="Click to set" />
          </span>
        </div>
      </div>

      <div className="grid gap-4 rounded-md border p-3 sm:grid-cols-2">
        <MapPeriodsEditor chronicleId={chronicle.id} periods={chronicle.mapPeriods} />
        <ChronicleErasEditor chronicleId={chronicle.id} eras={chronicle.eras} />
      </div>

      <div className="rounded-md border p-3">
        <ChronicleFilterEditor chronicleId={chronicle.id} filter={chronicle.filter} />
      </div>

      <ChronicleView
        events={events as ChronicleEvent[]}
        eras={chronicle.eras}
        mapPeriods={chronicle.mapPeriods}
        maps={maps as unknown as MapData[]}
        startYear={chronicle.startYear}
        endYear={chronicle.endYear}
      />

      <WhatLinksHere code={chronicle.code} />

      <div className="border-t pt-4">
        <DeleteRecordButton collection="chronicles" id={chronicle.id} code={chronicle.code} name={chronicle.name} />
      </div>
    </div>
  );
}

"use client";

import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import L, { CRS } from "leaflet";
import {
  MapContainer, ImageOverlay, Marker, Circle, Polyline, Polygon, Popup, useMap, useMapEvent,
} from "react-leaflet";
import { pixelToLatLng, latLngsToPoints, type PinGeometry } from "@/lib/maps/coords";
import { hrefForNode } from "@/lib/graph/href";
import { createMapPinAction, updateMapPinGeometryAction, deleteEntityAction, updateFieldAction, resolveEntryForLinkAction, updateMapPinLinksAction } from "@/lib/world/actions";

export interface PinData {
  id: number;
  code: string;
  name: string;
  summary: string | null;
  shape: string;
  geometry: PinGeometry;
  icon: string | null;
  color: string | null;
  group: string | null;
  layer: string | null;
  behavior: string;
  opensMapId: number | null;
  opensMap: { code: string; name: string } | null;
  links: { collection: string; id: number; code: string; name: string }[];
}

export interface LayerData {
  name: string;
  imageId: number;
  opacity: number;
  defaultVisible: boolean;
  order: number;
  image: { id: number; url?: string | null } | null;
}

export interface PinGroupData {
  name: string;
  color: string;
  defaultVisible: boolean;
}

export interface MapData {
  id: number;
  code: string;
  name: string;
  baseImage: { id: number; url?: string | null } | null;
  imageWidth: number | null;
  imageHeight: number | null;
  layers: LayerData[];
  pinGroups: PinGroupData[];
  pins: PinData[];
}

const SHAPE_OPTIONS = [
  { value: "pin", label: "Pin" },
  { value: "label", label: "Label" },
];

function pinDivIcon(color: string | null): L.DivIcon {
  const c = color ?? "#2563eb";
  return L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${c};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.5)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

// Adds the Geoman drawing toolbar and reports each freshly drawn shape's raw geometry (already
// converted to our pixel convention) up to the parent, which decides whether to keep or discard it.
// Geoman is a classic (non-ESM) Leaflet plugin: it expects a global `window.L` to already exist
// the moment its module body runs, and patches L's prototypes as a side effect. A static top-level
// import races Leaflet's own module evaluation under Next's bundler, so it is dynamically imported
// here instead, after explicitly putting Leaflet on `window` first.
let geomanReady: Promise<void> | null = null;
function loadGeoman(): Promise<void> {
  if (!geomanReady) {
    geomanReady = (async () => {
      (window as unknown as { L: typeof L }).L = L;
      await import("@geoman-io/leaflet-geoman-free");
    })();
  }
  return geomanReady;
}

// Geoman normally attaches `.pm` to a Leaflet object via `addInitHook`, which only fires for
// instances constructed *after* the hook is registered. Our map and shape layers are always
// constructed by react-leaflet before the dynamic import above resolves, so `.pm` is missing on
// every one of them and has to be built by hand, matching geoman's own init-hook construction
// exactly (dist/leaflet-geoman.js's initMap/initCircle/initPolygon/initPolyline).
type PmLayer = L.Layer & { pm?: { enable: (opts?: unknown) => void; disable: () => void } };
type PmMap = L.Map & { pm?: { addControls: (opts: unknown) => void; removeControls: () => void } };

function ensureMapPm(map: L.Map): void {
  const m = map as PmMap;
  if (m.pm) return;
  const PM = (L as unknown as { PM: { Map: new (m: L.Map) => unknown } }).PM;
  m.pm = new PM.Map(map) as PmMap["pm"];
}

function ensureLayerPm(layer: L.Layer, shape: string): void {
  const l = layer as PmLayer;
  if (l.pm) return;
  const PM = (L as unknown as { PM: { Edit: Record<string, new (l: L.Layer) => unknown> } }).PM;
  const ctor = shape === "circle" ? PM.Edit.Circle : shape === "polygon" ? PM.Edit.Polygon : PM.Edit.Line;
  l.pm = new ctor(layer) as PmLayer["pm"];
}

function DrawingControls({ imageHeight, onDraft }: { imageHeight: number; onDraft: (shape: string, geometry: PinGeometry) => void }) {
  const map = useMap();
  useEffect(() => {
    let cancelled = false;
    function handleCreate(e: { shape: string; layer: L.Layer }) {
      map.removeLayer(e.layer);
      if (e.shape === "Marker") {
        const ll = (e.layer as L.Marker).getLatLng();
        const p = latLngsToPoints([ll], imageHeight)[0];
        onDraft("pin", { x: p[0], y: p[1] });
      } else if (e.shape === "Circle") {
        const c = e.layer as L.Circle;
        const ll = c.getLatLng();
        const p = latLngsToPoints([ll], imageHeight)[0];
        onDraft("circle", { x: p[0], y: p[1], radius: Math.round(c.getRadius()) });
      } else if (e.shape === "Line" || e.shape === "Polygon") {
        const latlngs = (e.layer as L.Polyline).getLatLngs() as L.LatLng[];
        const points = latLngsToPoints(latlngs, imageHeight);
        onDraft(e.shape === "Line" ? "line" : "polygon", { points });
      }
    }
    loadGeoman().then(() => {
      if (cancelled) return;
      ensureMapPm(map);
      map.pm.addControls({
        position: "topleft",
        drawMarker: true, drawCircleMarker: false, drawPolyline: true, drawRectangle: false,
        drawPolygon: true, drawCircle: true, drawText: false, editMode: false, dragMode: false,
        cutPolygon: false, rotateMode: false, removalMode: false,
      });
      map.on("pm:create", handleCreate as never);
    });
    return () => {
      cancelled = true;
      map.off("pm:create", handleCreate as never);
      map.pm?.removeControls?.();
    };
  }, [map, imageHeight, onDraft]);
  return null;
}

function ClickToDeselect({ onClick }: { onClick: () => void }) {
  useMapEvent("click", onClick);
  return null;
}

export function MapCanvasInner({ map, editable, focusPinCode }: { map: MapData; editable: boolean; focusPinCode?: string | null }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<number | null>(
    focusPinCode ? map.pins.find(p => p.code === focusPinCode.toUpperCase())?.id ?? null : null
  );
  const [draft, setDraft] = useState<{ shape: string; geometry: PinGeometry } | null>(null);
  const [hiddenGroups, setHiddenGroups] = useState<Set<string>>(
    new Set(map.pinGroups.filter(g => !g.defaultVisible).map(g => g.name))
  );
  const [hiddenLayers, setHiddenLayers] = useState<Set<string>>(
    new Set(map.layers.filter(l => !l.defaultVisible).map(l => l.name))
  );
  const [editingShapeId, setEditingShapeId] = useState<number | null>(null);
  const shapeRefs = useRef<Map<number, L.Layer>>(new Map());

  const height = map.imageHeight ?? 1000;
  const width = map.imageWidth ?? 1000;
  const bounds: [[number, number], [number, number]] = [[0, 0], [height, width]];

  const visiblePins = useMemo(
    () => map.pins.filter(p => !(p.group && hiddenGroups.has(p.group)) && !(p.layer && hiddenLayers.has(p.layer))),
    [map.pins, hiddenGroups, hiddenLayers]
  );

  function toggleGroup(name: string) {
    setHiddenGroups(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }
  function toggleLayer(name: string) {
    setHiddenLayers(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }

  async function handleMarkerDragEnd(pin: PinData, latlng: L.LatLng) {
    const [x, y] = latLngsToPoints([latlng], height)[0];
    await updateMapPinGeometryAction(pin.id, { x, y });
    router.refresh();
  }

  async function persistShapeEdit(pin: PinData, layer: L.Layer) {
    if (pin.shape === "circle") {
      const c = layer as L.Circle;
      const ll = c.getLatLng();
      const [x, y] = latLngsToPoints([ll], height)[0];
      await updateMapPinGeometryAction(pin.id, { x, y, radius: Math.round(c.getRadius()) });
    } else {
      const latlngs = (layer as L.Polyline).getLatLngs() as L.LatLng[];
      const points = latLngsToPoints(latlngs, height);
      await updateMapPinGeometryAction(pin.id, { points });
    }
    router.refresh();
  }

  async function handleDeletePin(pin: PinData) {
    await deleteEntityAction("map-pins", pin.id);
    setSelectedId(null);
    router.refresh();
  }

  function clickBehavior(pin: PinData): (() => void) | undefined {
    if (pin.behavior === "open_entry" && pin.links[0]) {
      const target = pin.links[0];
      return () => router.push(hrefForNode(target.collection, target.code));
    }
    if (pin.behavior === "open_map" && pin.opensMap) {
      return () => router.push(`/maps/${pin.opensMap!.code}`);
    }
    return undefined;
  }

  return (
    <div className="flex gap-3">
      <div className="min-w-0 flex-1 overflow-hidden rounded-md border" style={{ height: 560 }}>
        {map.baseImage?.url ? (
          <MapContainer
            crs={CRS.Simple}
            bounds={bounds}
            style={{ height: "100%", width: "100%", background: "#111" }}
            minZoom={-4}
          >
            <ImageOverlay url={map.baseImage.url} bounds={bounds} />
            {map.layers
              .filter(l => l.image?.url && !hiddenLayers.has(l.name))
              .map(l => (
                <ImageOverlay key={l.name} url={l.image!.url!} bounds={bounds} opacity={l.opacity ?? 1} />
              ))}

            {editable && (
              <DrawingControls imageHeight={height} onDraft={(shape, geometry) => setDraft({ shape, geometry })} />
            )}
            <ClickToDeselect onClick={() => setSelectedId(null)} />

            {visiblePins.map(pin => {
              const onClick = clickBehavior(pin);
              const isEditingThis = editingShapeId === pin.id;

              if (pin.shape === "pin" || pin.shape === "label") {
                const g = pin.geometry as { x: number; y: number };
                const latlng = pixelToLatLng(g, height);
                return (
                  <Marker
                    key={pin.id}
                    position={latlng}
                    icon={pinDivIcon(pin.color)}
                    draggable={editable}
                    eventHandlers={{
                      click: () => { setSelectedId(pin.id); onClick?.(); },
                      dragend: (e) => handleMarkerDragEnd(pin, (e.target as L.Marker).getLatLng()),
                    }}
                  >
                    {pin.behavior === "popup" && (
                      <Popup>
                        <PinPopup pin={pin} />
                      </Popup>
                    )}
                  </Marker>
                );
              }
              if (pin.shape === "circle") {
                const g = pin.geometry as { x: number; y: number; radius: number };
                const center = pixelToLatLng(g, height);
                return (
                  <Circle
                    key={pin.id}
                    center={center}
                    radius={g.radius}
                    pathOptions={{ color: pin.color ?? "#2563eb" }}
                    ref={(l) => { if (l) shapeRefs.current.set(pin.id, l); }}
                    eventHandlers={{
                      click: () => { setSelectedId(pin.id); onClick?.(); },
                      "pm:dragend": () => { const l = shapeRefs.current.get(pin.id); if (l) persistShapeEdit(pin, l); },
                      "pm:edit": () => { const l = shapeRefs.current.get(pin.id); if (l) persistShapeEdit(pin, l); },
                    }}
                  >
                    {pin.behavior === "popup" && <Popup><PinPopup pin={pin} /></Popup>}
                  </Circle>
                );
              }
              const g = pin.geometry as { points: [number, number][] };
              const latlngs = g.points.map(([x, y]) => pixelToLatLng({ x, y }, height));
              const Comp = pin.shape === "polygon" ? Polygon : Polyline;
              return (
                <Comp
                  key={pin.id}
                  positions={latlngs}
                  pathOptions={{ color: pin.color ?? "#2563eb" }}
                  ref={(l: L.Layer | null) => { if (l) shapeRefs.current.set(pin.id, l); }}
                  eventHandlers={{
                    click: () => { setSelectedId(pin.id); onClick?.(); },
                    "pm:dragend": () => { const l = shapeRefs.current.get(pin.id); if (l) persistShapeEdit(pin, l); },
                    "pm:edit": () => { const l = shapeRefs.current.get(pin.id); if (l) persistShapeEdit(pin, l); },
                  }}
                >
                  {pin.behavior === "popup" && <Popup><PinPopup pin={pin} /></Popup>}
                </Comp>
              );
            })}
          </MapContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Upload a base image to start this map.
          </div>
        )}
      </div>

      <aside className="w-56 shrink-0 space-y-4 text-sm">
        {map.pinGroups.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Groups</p>
            {map.pinGroups.map(g => (
              <label key={g.name} className="flex items-center gap-2">
                <input type="checkbox" checked={!hiddenGroups.has(g.name)} onChange={() => toggleGroup(g.name)} />
                <span className="inline-block size-2.5 rounded-full" style={{ background: g.color }} />
                {g.name}
              </label>
            ))}
          </div>
        )}
        {map.layers.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Layers</p>
            {map.layers.map(l => (
              <label key={l.name} className="flex items-center gap-2">
                <input type="checkbox" checked={!hiddenLayers.has(l.name)} onChange={() => toggleLayer(l.name)} />
                {l.name}
              </label>
            ))}
          </div>
        )}

        {editable && draft && (
          <DraftPinForm
            mapId={map.id}
            draft={draft}
            groups={map.pinGroups}
            onCancel={() => setDraft(null)}
            onSaved={() => { setDraft(null); router.refresh(); }}
          />
        )}

        {editable && selectedId != null && !draft && (
          <SelectedPinPanel
            pin={map.pins.find(p => p.id === selectedId) ?? null}
            editingShape={editingShapeId === selectedId}
            onToggleEditShape={async () => {
              const pin = map.pins.find(p => p.id === selectedId);
              if (!pin || pin.shape === "pin" || pin.shape === "label") return;
              const layer = shapeRefs.current.get(selectedId) as (L.Layer & { pm?: { enable: () => void; disable: () => void } }) | undefined;
              if (!layer) return;
              await loadGeoman();
              ensureLayerPm(layer, pin.shape);
              if (editingShapeId === selectedId) { layer.pm!.disable(); setEditingShapeId(null); }
              else { layer.pm!.enable(); setEditingShapeId(selectedId); }
            }}
            onDelete={() => selectedId != null && handleDeletePin(map.pins.find(p => p.id === selectedId)!)}
            onClose={() => setSelectedId(null)}
          />
        )}

        {!editable && selectedId != null && (
          <SelectedPinPanel
            pin={map.pins.find(p => p.id === selectedId) ?? null}
            readOnly
            onClose={() => setSelectedId(null)}
          />
        )}
      </aside>
    </div>
  );
}

function PinPopup({ pin }: { pin: PinData }) {
  return (
    <div className="space-y-1 text-sm">
      <p className="font-semibold">{pin.name}</p>
      {pin.summary && <p className="text-xs">{pin.summary}</p>}
      {pin.links.length > 0 && (
        <ul className="space-y-0.5">
          {pin.links.map(l => (
            <li key={`${l.collection}-${l.id}`}>
              <Link href={hrefForNode(l.collection, l.code)} className="text-xs text-blue-600 hover:underline">
                {l.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DraftPinForm({
  mapId, draft, groups, onCancel, onSaved,
}: {
  mapId: number;
  draft: { shape: string; geometry: PinGeometry };
  groups: PinGroupData[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [group, setGroup] = useState("");
  const [color, setColor] = useState("#2563eb");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    const result = await createMapPinAction({
      mapId, name: name.trim(), shape: draft.shape as "pin" | "label" | "line" | "circle" | "polygon",
      geometry: draft.geometry, color, group: group || null,
    });
    setSaving(false);
    if (result.error) { setError(result.error); return; }
    onSaved();
  }

  return (
    <div className="space-y-2 rounded-md border bg-card p-2.5">
      <p className="text-xs font-semibold uppercase text-muted-foreground">New {draft.shape}</p>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        className="w-full rounded border bg-background px-2 py-1 text-sm"
      />
      {groups.length > 0 && (
        <select value={group} onChange={(e) => setGroup(e.target.value)} className="w-full rounded border bg-background px-2 py-1 text-sm">
          <option value="">No group</option>
          {groups.map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
        </select>
      )}
      <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="size-7 rounded border" />
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving || !name.trim()} className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground disabled:opacity-50">
          {saving ? "Saving..." : "Save"}
        </button>
        <button onClick={onCancel} className="rounded border px-2 py-1 text-xs">Cancel</button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SelectedPinPanel({
  pin, editingShape, onToggleEditShape, onDelete, onClose, readOnly,
}: {
  pin: PinData | null;
  editingShape?: boolean;
  onToggleEditShape?: () => void;
  onDelete?: () => void;
  onClose: () => void;
  readOnly?: boolean;
}) {
  const router = useRouter();
  if (!pin) return null;
  const canEditShape = pin.shape !== "pin" && pin.shape !== "label";
  return (
    <div className="space-y-2 rounded-md border bg-card p-2.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase text-muted-foreground">{pin.code}</p>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:underline">Close</button>
      </div>
      {readOnly ? (
        <>
          <p className="text-sm font-semibold">{pin.name}</p>
          {pin.summary && <p className="text-xs text-muted-foreground">{pin.summary}</p>}
        </>
      ) : (
        <>
          <input
            defaultValue={pin.name}
            onBlur={async (e) => { if (e.target.value !== pin.name) { await updateFieldAction("map-pins", pin.id, "name", e.target.value); router.refresh(); } }}
            className="w-full rounded border bg-background px-2 py-1 text-sm font-semibold"
          />
          <textarea
            defaultValue={pin.summary ?? ""}
            placeholder="Shown in the popup"
            onBlur={async (e) => { if (e.target.value !== (pin.summary ?? "")) { await updateFieldAction("map-pins", pin.id, "summary", e.target.value); router.refresh(); } }}
            className="w-full rounded border bg-background px-2 py-1 text-xs"
          />
        </>
      )}
      {readOnly ? (
        pin.links.length > 0 && (
          <ul className="space-y-0.5">
            {pin.links.map(l => (
              <li key={`${l.collection}-${l.id}`}>
                <Link href={hrefForNode(l.collection, l.code)} className="text-xs text-blue-600 hover:underline">{l.name}</Link>
              </li>
            ))}
          </ul>
        )
      ) : (
        <PinLinksEditor pin={pin} />
      )}
      {!readOnly && (
        <>
          <label className="block text-xs text-muted-foreground">
            Behavior
            <select
              defaultValue={pin.behavior}
              onChange={async (e) => { await updateFieldAction("map-pins", pin.id, "behavior", e.target.value); router.refresh(); }}
              className="mt-0.5 w-full rounded border bg-background px-2 py-1 text-xs"
            >
              <option value="popup">Popup</option>
              <option value="open_entry">Open first link</option>
              <option value="open_map">Open another map</option>
              <option value="none">None</option>
            </select>
          </label>
          <div className="flex flex-wrap gap-2 border-t pt-2">
            {canEditShape && (
              <button onClick={onToggleEditShape} className="rounded border px-2 py-1 text-xs">
                {editingShape ? "Done editing" : "Edit shape"}
              </button>
            )}
            <button onClick={onDelete} className="rounded border px-2 py-1 text-xs text-destructive hover:bg-destructive/10">Delete</button>
          </div>
        </>
      )}
    </div>
  );
}

function PinLinksEditor({ pin }: { pin: PinData }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  async function handleAdd() {
    if (!code.trim()) return;
    const resolved = await resolveEntryForLinkAction(code.trim());
    if (!resolved) { setError(`No entry found for "${code}"`); return; }
    const next = [
      ...pin.links.map(l => ({ entryCollection: l.collection, entryId: l.id })),
      { entryCollection: resolved.collection, entryId: resolved.entryId },
    ];
    await updateMapPinLinksAction(pin.id, next);
    setCode("");
    setError("");
    router.refresh();
  }

  async function handleRemove(l: { collection: string; id: number }) {
    const next = pin.links
      .filter(x => !(x.collection === l.collection && x.id === l.id))
      .map(x => ({ entryCollection: x.collection, entryId: x.id }));
    await updateMapPinLinksAction(pin.id, next);
    router.refresh();
  }

  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase text-muted-foreground">Links</p>
      {pin.links.length > 0 && (
        <ul className="space-y-0.5">
          {pin.links.map(l => (
            <li key={`${l.collection}-${l.id}`} className="flex items-center justify-between gap-1">
              <Link href={hrefForNode(l.collection, l.code)} className="text-xs text-blue-600 hover:underline">{l.name}</Link>
              <button onClick={() => handleRemove(l)} className="text-xs text-muted-foreground hover:text-destructive">×</button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-1">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Code or name"
          className="w-full rounded border bg-background px-2 py-1 text-xs"
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
        />
        <button onClick={handleAdd} className="rounded border px-2 py-1 text-xs">Add</button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// Converts between the app's pixel geometry (origin top-left, y increasing downward — hard rule
// 16: "Map coordinates are pixels on the map's base image, origin at the top left. Never store
// screen positions or zoom-dependent values.") and Leaflet's internal lat/lng, which with
// CRS.Simple is a flat Euclidean plane but has y increasing *upward*. Every pixel value that
// reaches the database or a server action goes through these functions first — nothing Leaflet-
// specific (a LatLng, a zoom level) is ever persisted.

export type Point = { x: number; y: number };

export function pixelToLatLng(p: Point, imageHeight: number): [number, number] {
  return [imageHeight - p.y, p.x];
}

export function latLngToPixel(lat: number, lng: number, imageHeight: number): Point {
  return { x: lng, y: imageHeight - lat };
}

export type PinGeometry =
  | { x: number; y: number } // pin
  | { x: number; y: number; text: string; size: number } // label
  | { x: number; y: number; radius: number } // circle
  | { points: [number, number][] }; // line | polygon

export function geometryToLatLngs(
  shape: string,
  geometry: PinGeometry,
  imageHeight: number
): [number, number] | [number, number][] {
  if (shape === "line" || shape === "polygon") {
    const g = geometry as { points: [number, number][] };
    return g.points.map(([x, y]) => pixelToLatLng({ x, y }, imageHeight));
  }
  const g = geometry as { x: number; y: number };
  return pixelToLatLng({ x: g.x, y: g.y }, imageHeight);
}

export function latLngsToPoints(latlngs: { lat: number; lng: number }[], imageHeight: number): [number, number][] {
  return latlngs.map((ll) => {
    const p = latLngToPixel(ll.lat, ll.lng, imageHeight);
    return [Math.round(p.x), Math.round(p.y)];
  });
}

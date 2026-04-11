import type { Coord } from "@/types/trip";

export const WALK_SPEED_MPS = 1.2;
export const BIKE_SPEED_MPS = 5;

const EARTH_RADIUS_METERS = 6_371_008.8;

const toRad = (deg: number) => (deg * Math.PI) / 180;

export function haversineMeters(a: Coord, b: Coord): number {
  if (a.lat === b.lat && a.lng === b.lng) return 0;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

export function walkSeconds(
  meters: number,
  speedMps: number = WALK_SPEED_MPS,
): number {
  if (meters <= 0) return 0;
  return meters / speedMps;
}

export function bikeSeconds(
  meters: number,
  speedMps: number = BIKE_SPEED_MPS,
): number {
  if (meters <= 0) return 0;
  return meters / speedMps;
}

import "server-only";

import type { Coord } from "@/types/trip";
import { fetchWithTimeout, isUpstreamBlocked, markUpstreamFailure } from "./http";

const OSRM_BASE = "https://router.project-osrm.org/route/v1";

export type OsrmRouteResult = {
  /** 실제 도로 경로 좌표 배열 */
  polyline: Coord[];
  /** 경로 총 거리 (미터) */
  distanceMeters: number;
  /** 예상 소요 시간 (초) */
  durationSec: number;
};

/**
 * OSRM 공개 서버로 자전거 경로를 조회한다.
 * profile: "bike" (자전거 도로 우선), "foot" (도보), "car" (자동차)
 * 실패 시 null 반환 (호출부에서 직선 거리 폴백).
 */
export async function fetchOsrmRoute(
  from: Coord,
  to: Coord,
  profile: "bike" | "foot" | "car" = "bike",
): Promise<OsrmRouteResult | null> {
  if (isUpstreamBlocked("osrm")) return null;

  const url = `${OSRM_BASE}/${profile}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;

  try {
    const res = await fetchWithTimeout(url, { timeoutMs: 5000 });
    if (!res.ok) throw new Error(`OSRM ${res.status}`);

    const data = (await res.json()) as {
      code: string;
      routes?: {
        geometry: { coordinates: [number, number][] };
        distance: number;
        duration: number;
      }[];
    };

    const route = data.routes?.[0];
    if (data.code !== "Ok" || !route) return null;

    const polyline: Coord[] = route.geometry.coordinates.map(
      ([lng, lat]) => ({ lat, lng }),
    );

    return {
      polyline,
      distanceMeters: Math.round(route.distance),
      durationSec: Math.round(route.duration),
    };
  } catch (err) {
    markUpstreamFailure("osrm");
    console.warn("[osrm] route fetch failed, falling back to straight line:", err);
    return null;
  }
}

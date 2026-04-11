import type {
  OdsayPath,
  OdsayPubTransResponse,
  OdsaySubPath,
} from "@/types/odsay";
import type { BusRoute, Coord, RouteLeg } from "@/types/trip";

/**
 * ODsay 응답의 첫 번째(가장 빠른) 경로를 BusRoute 도메인 모델로 변환한다.
 * 결과가 없거나 ODsay 에러 응답이면 null 을 반환한다.
 */
export function mapOdsayToBusRoute(
  response: OdsayPubTransResponse,
): BusRoute | null {
  if (response.error) return null;
  const result = response.result;
  if (!result || !result.path || result.path.length === 0) return null;

  const chosen = pickFastest(result.path);
  return toBusRoute(chosen);
}

function pickFastest(paths: OdsayPath[]): OdsayPath {
  return paths.reduce((best, p) =>
    p.info.totalTime < best.info.totalTime ? p : best,
  );
}

function toBusRoute(path: OdsayPath): BusRoute {
  const legs = path.subPath.map(mapLeg);
  const walkDurationSec = legs
    .filter((l) => l.kind === "walk")
    .reduce((sum, l) => sum + l.durationSec, 0);

  return {
    mode: "bus",
    totalDurationSec: path.info.totalTime * 60,
    walkDurationSec,
    transferCount: path.info.totalTransitCount,
    legs,
    isServiceEnded: false,
    polyline: extractPolyline(path),
  };
}

function mapLeg(sub: OdsaySubPath): RouteLeg {
  const kind: RouteLeg["kind"] =
    sub.trafficType === 3
      ? "walk"
      : sub.trafficType === 1
        ? "subway"
        : "bus";
  return {
    kind,
    fromName: sub.startName,
    toName: sub.endName,
    routeName: sub.lane?.[0]?.busNo,
    distanceMeters: sub.distance,
    durationSec: sub.sectionTime * 60,
  };
}

function extractPolyline(path: OdsayPath): Coord[] {
  const coords: Coord[] = [];
  for (const sub of path.subPath) {
    if (sub.trafficType === 3) continue;
    const stations = sub.passStopList?.stations ?? [];
    for (const s of stations) {
      const lng = Number(s.x);
      const lat = Number(s.y);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        coords.push({ lat, lng });
      }
    }
  }
  return coords;
}

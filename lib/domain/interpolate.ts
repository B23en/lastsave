import type { Coord } from "@/types/trip";

/**
 * 두 좌표 사이에 N개의 보간점을 삽입한다.
 * 직선 폴리라인을 부드럽게 만들기 위해 사용.
 * 약간의 랜덤 오프셋으로 도로 느낌을 시뮬레이션한다.
 */
export function interpolateSegment(
  a: Coord,
  b: Coord,
  steps: number,
  jitterFactor = 0.15,
): Coord[] {
  if (steps <= 0) return [a, b];

  const points: Coord[] = [a];
  const dLat = b.lat - a.lat;
  const dLng = b.lng - a.lng;

  // 수직 방향 벡터 (도로 곡선 효과)
  const perpLat = -dLng;
  const perpLng = dLat;

  for (let i = 1; i <= steps; i++) {
    const t = i / (steps + 1);
    // 사인 곡선으로 부드러운 S자 오프셋
    const offset = Math.sin(t * Math.PI) * jitterFactor;
    points.push({
      lat: a.lat + dLat * t + perpLat * offset,
      lng: a.lng + dLng * t + perpLng * offset,
    });
  }

  points.push(b);
  return points;
}

/**
 * 자전거 폴리라인(4점: origin→pickup→dropoff→dest)을 부드러운
 * 경로처럼 보이도록 보간한다.
 *
 * - origin→pickup: 도보 구간 (보간 2점)
 * - pickup→dropoff: 자전거 주행 구간 (거리 비례 보간, 최대 8점)
 * - dropoff→dest: 도보 구간 (보간 2점)
 */
export function interpolateBikePolyline(polyline: Coord[]): Coord[] {
  if (polyline.length < 4) return polyline;

  const [origin, pickup, dropoff, dest] = polyline as [
    Coord,
    Coord,
    Coord,
    Coord,
  ];

  const walkToPickup = interpolateSegment(origin, pickup, 2, 0.05);
  const ride = interpolateSegment(
    pickup,
    dropoff,
    Math.min(8, Math.max(3, Math.round(distance(pickup, dropoff) / 1500))),
    0.12,
  );
  const walkToDest = interpolateSegment(dropoff, dest, 2, 0.05);

  // 중복 점 제거 (segment 연결부)
  return [
    ...walkToPickup.slice(0, -1),
    ...ride.slice(0, -1),
    ...walkToDest,
  ];
}

function distance(a: Coord, b: Coord): number {
  const R = 6_371_008.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

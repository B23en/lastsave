import type { BikeStation } from "@/types/pbdo";
import type { BikeRoute, Coord, RouteLeg } from "@/types/trip";
import { BIKE_SPEED_MPS, bikeSeconds, haversineMeters, walkSeconds } from "./eta";

export const BIKE_STATION_SEARCH_RADIUS_M = 1000;

export type NearestStationResult = {
  station: BikeStation;
  distanceM: number;
};

export type FindNearestOptions = {
  radiusM: number;
  /** true 면 bikesAvailable > 0 인 거치대만 고려한다. */
  requireBikes: boolean;
};

export function findNearestStationWithBikes(
  from: Coord,
  stations: BikeStation[],
  options: FindNearestOptions,
): NearestStationResult | null {
  let best: NearestStationResult | null = null;
  for (const s of stations) {
    if (options.requireBikes && s.bikesAvailable <= 0) continue;
    const d = haversineMeters(from, { lat: s.lat, lng: s.lng });
    if (d > options.radiusM) continue;
    if (!best || d < best.distanceM) {
      best = { station: s, distanceM: d };
    }
  }
  return best;
}

/** OSRM 등 외부 라우팅 결과를 주입할 때 사용 */
export type RoadRouteSegment = {
  polyline: Coord[];
  distanceMeters: number;
  durationSec: number;
};

export type BuildBikeRouteInput = {
  origin: Coord;
  destination: Coord;
  stations: BikeStation[];
  radiusM?: number;
  /** 도보(출발→대여) 실제 도로 경로 */
  walkToPickup?: RoadRouteSegment | null;
  /** 자전거(대여→반납) 실제 도로 경로 */
  rideRoute?: RoadRouteSegment | null;
  /** 도보(반납→목적지) 실제 도로 경로 */
  walkFromDropoff?: RoadRouteSegment | null;
};

/**
 * 출발지·목적지·거치대 목록으로부터 자전거 경로 모델을 만든다.
 * 양쪽에 적절한 거치대가 없으면 `isAvailable=false` 인 route 를 반환한다.
 */
export function buildBikeRoute(input: BuildBikeRouteInput): BikeRoute {
  const radiusM = input.radiusM ?? BIKE_STATION_SEARCH_RADIUS_M;

  const pickup = findNearestStationWithBikes(input.origin, input.stations, {
    radiusM,
    requireBikes: true,
  });
  const dropoff = findNearestStationWithBikes(
    input.destination,
    input.stations,
    { radiusM, requireBikes: false },
  );

  if (!pickup || !dropoff) {
    return unavailableRoute(pickup ?? null, dropoff ?? null);
  }

  const pickupCoord = { lat: pickup.station.lat, lng: pickup.station.lng };
  const dropoffCoord = { lat: dropoff.station.lat, lng: dropoff.station.lng };

  // OSRM 결과가 있으면 사용, 없으면 직선 거리 폴백
  const walkToPickupDist = input.walkToPickup?.distanceMeters ?? pickup.distanceM;
  const walkToPickupSec = input.walkToPickup?.durationSec ?? walkSeconds(pickup.distanceM);
  const walkFromDropoffDist = input.walkFromDropoff?.distanceMeters ?? dropoff.distanceM;
  const walkFromDropoffSec = input.walkFromDropoff?.durationSec ?? walkSeconds(dropoff.distanceM);

  const rideDistanceMeters = input.rideRoute?.distanceMeters ?? haversineMeters(pickupCoord, dropoffCoord);
  const rideDurationSec = input.rideRoute?.durationSec ?? bikeSeconds(haversineMeters(pickupCoord, dropoffCoord));

  const legs: RouteLeg[] = [
    {
      kind: "walk",
      fromName: "현재 위치",
      toName: pickup.station.name,
      distanceMeters: walkToPickupDist,
      durationSec: walkToPickupSec,
    },
    {
      kind: "bike",
      fromName: pickup.station.name,
      toName: dropoff.station.name,
      distanceMeters: rideDistanceMeters,
      durationSec: rideDurationSec,
    },
    {
      kind: "walk",
      fromName: dropoff.station.name,
      toName: "목적지",
      distanceMeters: walkFromDropoffDist,
      durationSec: walkFromDropoffSec,
    },
  ];

  // 폴리라인: OSRM 경로가 있으면 도로 기반, 없으면 4점 직선
  const polyline: Coord[] = buildPolyline(
    input.origin,
    pickupCoord,
    dropoffCoord,
    input.destination,
    input.walkToPickup?.polyline,
    input.rideRoute?.polyline,
    input.walkFromDropoff?.polyline,
  );

  return {
    mode: "bike",
    totalDurationSec: walkToPickupSec + rideDurationSec + walkFromDropoffSec,
    rideDurationSec,
    walkDurationSec: walkToPickupSec + walkFromDropoffSec,
    rideDistanceMeters,
    fromStationId: pickup.station.id,
    fromStationName: pickup.station.name,
    fromStationBikesAvailable: pickup.station.bikesAvailable,
    toStationId: dropoff.station.id,
    toStationName: dropoff.station.name,
    toStationDocksAvailable: dropoff.station.docksAvailable ?? 0,
    isAvailable: true,
    polyline,
    legs,
  };
}

function unavailableRoute(
  pickup: NearestStationResult | null,
  dropoff: NearestStationResult | null,
): BikeRoute {
  return {
    mode: "bike",
    totalDurationSec: 0,
    rideDurationSec: 0,
    walkDurationSec: 0,
    rideDistanceMeters: 0,
    fromStationId: pickup?.station.id,
    fromStationName: pickup?.station.name,
    fromStationBikesAvailable: pickup?.station.bikesAvailable ?? 0,
    toStationId: dropoff?.station.id,
    toStationName: dropoff?.station.name,
    toStationDocksAvailable: 0,
    isAvailable: false,
    polyline: [],
    legs: [],
  };
}

function buildPolyline(
  origin: Coord,
  pickup: Coord,
  dropoff: Coord,
  destination: Coord,
  walkToPickupPoly?: Coord[],
  ridePoly?: Coord[],
  walkFromDropoffPoly?: Coord[],
): Coord[] {
  // OSRM 경로가 하나라도 있으면 도로 기반 폴리라인 구성
  if (walkToPickupPoly || ridePoly || walkFromDropoffPoly) {
    return [
      ...(walkToPickupPoly ?? [origin, pickup]),
      ...(ridePoly ?? [pickup, dropoff]),
      ...(walkFromDropoffPoly ?? [dropoff, destination]),
    ];
  }
  // 전부 없으면 기존 4점 직선
  return [origin, pickup, dropoff, destination];
}

// re-export for convenience in tests / routes
export { BIKE_SPEED_MPS };

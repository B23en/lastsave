import type { BikeStation } from "@/types/pbdo";
import type { BikeRoute, Coord, RouteLeg } from "@/types/trip";
import { BIKE_SPEED_MPS, bikeSeconds, haversineMeters, walkSeconds } from "./eta";

export const BIKE_STATION_SEARCH_RADIUS_M = 500;

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

export type BuildBikeRouteInput = {
  origin: Coord;
  destination: Coord;
  stations: BikeStation[];
  radiusM?: number;
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

  const walkToPickupSec = walkSeconds(pickup.distanceM);
  const walkFromDropoffSec = walkSeconds(dropoff.distanceM);
  const rideDistanceMeters = haversineMeters(pickupCoord, dropoffCoord);
  const rideDurationSec = bikeSeconds(rideDistanceMeters);

  const legs: RouteLeg[] = [
    {
      kind: "walk",
      fromName: "현재 위치",
      toName: pickup.station.name,
      distanceMeters: pickup.distanceM,
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
      distanceMeters: dropoff.distanceM,
      durationSec: walkFromDropoffSec,
    },
  ];

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
    polyline: [input.origin, pickupCoord, dropoffCoord, input.destination],
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

// re-export for convenience in tests / routes
export { BIKE_SPEED_MPS };

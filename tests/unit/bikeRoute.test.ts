import { describe, expect, it } from "vitest";
import {
  BIKE_STATION_SEARCH_RADIUS_M,
  buildBikeRoute,
  findNearestStationWithBikes,
} from "@/lib/domain/bikeRoute";
import type { BikeStation } from "@/types/pbdo";
import type { Coord } from "@/types/trip";

const CITY_HALL: Coord = { lat: 37.5665, lng: 126.978 };
const GANGNAM: Coord = { lat: 37.4979, lng: 127.0276 };

const STATIONS: BikeStation[] = [
  {
    id: "A",
    name: "시청역 1번 출구",
    lat: 37.5648,
    lng: 126.9768,
    bikesAvailable: 12,
  },
  {
    id: "B",
    name: "시청역 3번 출구",
    lat: 37.5657,
    lng: 126.9775,
    bikesAvailable: 4,
  },
  {
    id: "C",
    name: "덕수궁 앞",
    lat: 37.5661,
    lng: 126.9754,
    bikesAvailable: 0,
  },
  {
    id: "D",
    name: "강남역 5번 출구",
    lat: 37.4982,
    lng: 127.0281,
    bikesAvailable: 15,
  },
  {
    id: "E",
    name: "잠원역",
    lat: 37.5123,
    lng: 127.0112,
    bikesAvailable: 0,
  },
];

describe("findNearestStationWithBikes", () => {
  it("returns the closest station that has bikes available", () => {
    const result = findNearestStationWithBikes(CITY_HALL, STATIONS, {
      radiusM: BIKE_STATION_SEARCH_RADIUS_M,
      requireBikes: true,
    });
    expect(result).not.toBeNull();
    expect(result!.station.id).toBe("B");
  });

  it("ignores stations with zero bikes when requireBikes=true", () => {
    const result = findNearestStationWithBikes(
      { lat: 37.5661, lng: 126.9754 }, // 덕수궁 근처 (station C)
      STATIONS,
      { radiusM: 300, requireBikes: true },
    );
    expect(result!.station.id).not.toBe("C");
  });

  it("returns null when no station is within radius", () => {
    const result = findNearestStationWithBikes(
      { lat: 33.3, lng: 126.5 }, // 제주
      STATIONS,
      { radiusM: 300, requireBikes: true },
    );
    expect(result).toBeNull();
  });

  it("allows empty-dock stations when requireBikes=false (for return)", () => {
    const result = findNearestStationWithBikes(
      { lat: 37.5661, lng: 126.9754 },
      STATIONS,
      { radiusM: 300, requireBikes: false },
    );
    expect(result!.station.id).toBe("C");
  });
});

describe("buildBikeRoute", () => {
  it("returns an unavailable route when no pickup station within radius", () => {
    const route = buildBikeRoute({
      origin: { lat: 33.3, lng: 126.5 },
      destination: GANGNAM,
      stations: STATIONS,
    });
    expect(route.isAvailable).toBe(false);
    expect(route.fromStationId).toBeUndefined();
  });

  it("returns an unavailable route when no dropoff station within radius", () => {
    const route = buildBikeRoute({
      origin: CITY_HALL,
      destination: { lat: 33.3, lng: 126.5 },
      stations: STATIONS,
    });
    expect(route.isAvailable).toBe(false);
    expect(route.toStationId).toBeUndefined();
  });

  it("picks closest pickup (with bikes) and closest dropoff", () => {
    const route = buildBikeRoute({
      origin: CITY_HALL,
      destination: GANGNAM,
      stations: STATIONS,
    });
    expect(route.isAvailable).toBe(true);
    expect(route.fromStationId).toBe("B"); // closest to City Hall with bikes
    expect(route.toStationId).toBe("D"); // closest to Gangnam
  });

  it("totalDurationSec is the sum of walkDurationSec + rideDurationSec", () => {
    const route = buildBikeRoute({
      origin: CITY_HALL,
      destination: GANGNAM,
      stations: STATIONS,
    });
    expect(route.totalDurationSec).toBeCloseTo(
      route.walkDurationSec + route.rideDurationSec,
      5,
    );
  });

  it("polyline includes origin → pickup station → dropoff station → destination", () => {
    const route = buildBikeRoute({
      origin: CITY_HALL,
      destination: GANGNAM,
      stations: STATIONS,
    });
    expect(route.polyline.length).toBe(4);
    expect(route.polyline[0]).toEqual(CITY_HALL);
    expect(route.polyline.at(-1)).toEqual(GANGNAM);
  });

  it("rideDistanceMeters is the straight-line distance between stations", () => {
    const route = buildBikeRoute({
      origin: CITY_HALL,
      destination: GANGNAM,
      stations: STATIONS,
    });
    // City Hall to Gangnam via 따릉이 — 약 9–10 km
    expect(route.rideDistanceMeters).toBeGreaterThan(8000);
    expect(route.rideDistanceMeters).toBeLessThan(11000);
  });
});

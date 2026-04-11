import { describe, expect, it } from "vitest";
import {
  BIKE_SPEED_MPS,
  WALK_SPEED_MPS,
  bikeSeconds,
  haversineMeters,
  walkSeconds,
} from "@/lib/domain/eta";
import type { Coord } from "@/types/trip";

const CITY_HALL: Coord = { lat: 37.5665, lng: 126.978 };
const GWANGHWAMUN: Coord = { lat: 37.5759, lng: 126.9769 };
const GANGNAM: Coord = { lat: 37.4979, lng: 127.0276 };

describe("haversineMeters", () => {
  it("is zero for identical points", () => {
    expect(haversineMeters(CITY_HALL, CITY_HALL)).toBe(0);
  });

  it("is symmetric", () => {
    const a = haversineMeters(CITY_HALL, GWANGHWAMUN);
    const b = haversineMeters(GWANGHWAMUN, CITY_HALL);
    expect(a).toBeCloseTo(b, 5);
  });

  it("returns ~1.05km between City Hall and Gwanghwamun", () => {
    const d = haversineMeters(CITY_HALL, GWANGHWAMUN);
    expect(d).toBeGreaterThan(1000);
    expect(d).toBeLessThan(1200);
  });

  it("returns ~9-10km between City Hall and Gangnam", () => {
    const d = haversineMeters(CITY_HALL, GANGNAM);
    expect(d).toBeGreaterThan(8_500);
    expect(d).toBeLessThan(10_500);
  });
});

describe("walkSeconds", () => {
  it("uses 1.2 m/s as the default speed", () => {
    expect(WALK_SPEED_MPS).toBe(1.2);
  });

  it("120 meters → 100 seconds", () => {
    expect(walkSeconds(120)).toBe(100);
  });

  it("1200 meters → 1000 seconds", () => {
    expect(walkSeconds(1200)).toBe(1000);
  });

  it("accepts a custom speed override", () => {
    expect(walkSeconds(300, 1.5)).toBe(200);
  });

  it("treats zero and negative distances as 0", () => {
    expect(walkSeconds(0)).toBe(0);
    expect(walkSeconds(-5)).toBe(0);
  });
});

describe("bikeSeconds", () => {
  it("uses 5.0 m/s (18 km/h) as the default speed", () => {
    expect(BIKE_SPEED_MPS).toBe(5);
  });

  it("500 meters → 100 seconds", () => {
    expect(bikeSeconds(500)).toBe(100);
  });

  it("5km → 1000 seconds", () => {
    expect(bikeSeconds(5000)).toBe(1000);
  });

  it("is faster than walking for the same distance", () => {
    const d = 2000;
    expect(bikeSeconds(d)).toBeLessThan(walkSeconds(d));
  });
});

import { describe, expect, it } from "vitest";
import { recommend } from "@/lib/domain/recommend";
import type { BikeRoute, BusRoute } from "@/types/trip";

function mkBus(overrides: Partial<BusRoute> = {}): BusRoute {
  return {
    mode: "bus",
    totalDurationSec: 1_800,
    walkDurationSec: 300,
    transferCount: 1,
    legs: [],
    isServiceEnded: false,
    polyline: [],
    ...overrides,
  };
}

function mkBike(overrides: Partial<BikeRoute> = {}): BikeRoute {
  return {
    mode: "bike",
    totalDurationSec: 1_500,
    rideDurationSec: 1_200,
    walkDurationSec: 300,
    rideDistanceMeters: 6_000,
    fromStationBikesAvailable: 5,
    toStationDocksAvailable: 10,
    isAvailable: true,
    polyline: [],
    ...overrides,
  };
}

describe("recommend", () => {
  it("picks bike as only_option when bus service has ended", () => {
    const result = recommend({
      bus: mkBus({ isServiceEnded: true }),
      bike: mkBike(),
      risk: "safe",
    });
    expect(result.winner).toBe("bike");
    expect(result.reason).toBe("only_option");
  });

  it("picks bus as only_option when bike is not available", () => {
    const result = recommend({
      bus: mkBus(),
      bike: mkBike({ isAvailable: false }),
      risk: "safe",
    });
    expect(result.winner).toBe("bus");
    expect(result.reason).toBe("only_option");
  });

  it("returns winner=null when both are unavailable", () => {
    const result = recommend({
      bus: mkBus({ isServiceEnded: true }),
      bike: mkBike({ isAvailable: false }),
      risk: "danger",
    });
    expect(result.winner).toBeNull();
  });

  it("escalates to bike when risk is danger even if bus is faster", () => {
    const result = recommend({
      bus: mkBus({ totalDurationSec: 600 }),
      bike: mkBike({ totalDurationSec: 1_500 }),
      risk: "danger",
    });
    expect(result.winner).toBe("bike");
    expect(result.reason).toBe("safer");
  });

  it("escalates to bike when risk is caution even if bus is faster", () => {
    const result = recommend({
      bus: mkBus({ totalDurationSec: 900 }),
      bike: mkBike({ totalDurationSec: 1_500 }),
      risk: "caution",
    });
    expect(result.winner).toBe("bike");
    expect(result.reason).toBe("safer");
  });

  it("picks the faster option when risk is safe", () => {
    const result = recommend({
      bus: mkBus({ totalDurationSec: 1_800 }),
      bike: mkBike({ totalDurationSec: 1_200 }),
      risk: "safe",
    });
    expect(result.winner).toBe("bike");
    expect(result.reason).toBe("faster");
  });

  it("picks bus when bus is faster and risk is safe", () => {
    const result = recommend({
      bus: mkBus({ totalDurationSec: 800 }),
      bike: mkBike({ totalDurationSec: 1_500 }),
      risk: "safe",
    });
    expect(result.winner).toBe("bus");
    expect(result.reason).toBe("faster");
  });

  it("marks ties when totals are within 60 seconds", () => {
    const result = recommend({
      bus: mkBus({ totalDurationSec: 1_200 }),
      bike: mkBike({ totalDurationSec: 1_230 }),
      risk: "safe",
    });
    expect(result.reason).toBe("tie");
  });

  it("emits a non-empty user-facing label for every outcome", () => {
    const result = recommend({
      bus: mkBus({ totalDurationSec: 1_800 }),
      bike: mkBike({ totalDurationSec: 1_200 }),
      risk: "safe",
    });
    expect(result.label.length).toBeGreaterThan(0);
  });
});

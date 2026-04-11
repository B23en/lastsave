import { describe, expect, it } from "vitest";
import { mapOdsayToBusRoute } from "@/lib/domain/odsayMapper";
import type { OdsayPubTransResponse } from "@/types/odsay";

const FIXTURE: OdsayPubTransResponse = {
  result: {
    searchType: 0,
    outTrafficCheck: 0,
    path: [
      {
        pathType: 2,
        info: {
          totalTime: 28,
          totalWalk: 410,
          totalDistance: 5200,
          busTransitCount: 1,
          subwayTransitCount: 0,
          totalTransitCount: 1,
          firstStartStation: "서울시청",
          lastEndStation: "강남역",
          payment: 1500,
        },
        subPath: [
          { trafficType: 3, distance: 210, sectionTime: 3 },
          {
            trafficType: 2,
            distance: 4700,
            sectionTime: 22,
            stationCount: 8,
            lane: [{ busNo: "N16", busID: 101300013 }],
            startName: "서울시청",
            endName: "강남역",
            startX: 126.9779,
            startY: 37.5663,
            endX: 127.0276,
            endY: 37.4979,
            passStopList: {
              stations: [
                { index: 0, stationName: "서울시청", x: "126.9779", y: "37.5663" },
                { index: 1, stationName: "을지로입구", x: "126.9833", y: "37.5661" },
                { index: 2, stationName: "강남역", x: "127.0276", y: "37.4979" },
              ],
            },
          },
          { trafficType: 3, distance: 290, sectionTime: 3 },
        ],
      },
    ],
  },
};

describe("mapOdsayToBusRoute", () => {
  it("returns null when no path is available (service ended)", () => {
    const result = mapOdsayToBusRoute({
      result: { searchType: 0, outTrafficCheck: 0, path: [] },
    });
    expect(result).toBeNull();
  });

  it("returns null when the response has an error envelope", () => {
    const result = mapOdsayToBusRoute({
      error: { code: "-98", msg: "no result" },
    });
    expect(result).toBeNull();
  });

  it("converts totalTime minutes to totalDurationSec", () => {
    const route = mapOdsayToBusRoute(FIXTURE)!;
    expect(route).not.toBeNull();
    expect(route.totalDurationSec).toBe(28 * 60);
  });

  it("sums walking subPaths into walkDurationSec", () => {
    const route = mapOdsayToBusRoute(FIXTURE)!;
    expect(route.walkDurationSec).toBe((3 + 3) * 60);
  });

  it("uses totalTransitCount as transferCount", () => {
    const route = mapOdsayToBusRoute(FIXTURE)!;
    expect(route.transferCount).toBe(1);
  });

  it("builds legs in subPath order with walk/bus classification", () => {
    const route = mapOdsayToBusRoute(FIXTURE)!;
    expect(route.legs.map((l) => l.kind)).toEqual(["walk", "bus", "walk"]);
    expect(route.legs[1]!.distanceMeters).toBe(4700);
    expect(route.legs[1]!.durationSec).toBe(22 * 60);
  });

  it("captures the bus route name from the lane field", () => {
    const route = mapOdsayToBusRoute(FIXTURE)!;
    expect(route.legs[1]!.routeName).toBe("N16");
    expect(route.legs[0]!.routeName).toBeUndefined();
  });

  it("extracts a polyline from passStopList stations", () => {
    const route = mapOdsayToBusRoute(FIXTURE)!;
    expect(route.polyline.length).toBe(3);
    expect(route.polyline[0]).toEqual({ lat: 37.5663, lng: 126.9779 });
    expect(route.polyline.at(-1)).toEqual({ lat: 37.4979, lng: 127.0276 });
  });

  it("marks mode as 'bus' and isServiceEnded=false when a path exists", () => {
    const route = mapOdsayToBusRoute(FIXTURE)!;
    expect(route.mode).toBe("bus");
    expect(route.isServiceEnded).toBe(false);
  });

  it("prefers the shortest totalTime when multiple paths exist", () => {
    const faster = structuredClone(FIXTURE) as OdsayPubTransResponse;
    const longPath = structuredClone(FIXTURE.result!.path[0]!);
    longPath.info.totalTime = 45;
    faster.result!.path.push(longPath);
    const route = mapOdsayToBusRoute(faster)!;
    expect(route.totalDurationSec).toBe(28 * 60);
  });
});

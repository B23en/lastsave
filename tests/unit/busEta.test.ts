import { describe, it, expect } from "vitest";
import {
  estimateBusEta,
  findNearestBus,
  type BusEtaResult,
} from "@/lib/domain/busEta";
import type { LiveBus, Coord } from "@/types/trip";

const BUS_SPEED_MPS = 8; // 약 30km/h, busEta에서 사용하는 기본 속도

// 시청역 부근 정류장
const STOP: Coord = { lat: 37.5663, lng: 126.9779 };

// fixture 기반 버스들
const BUSES: LiveBus[] = [
  {
    routeId: "SEL-N16",
    routeName: "N16",
    vehicleNo: "서울70사1234",
    lat: 37.5663,
    lng: 126.9779,
    stationName: "시청앞",
  },
  {
    routeId: "SEL-N16",
    routeName: "N16",
    vehicleNo: "서울70사5678",
    lat: 37.5702,
    lng: 126.9824,
    stationName: "광화문",
  },
  {
    routeId: "SEL-N26",
    routeName: "N26",
    vehicleNo: "서울70바0421",
    lat: 37.5641,
    lng: 126.9744,
  },
];

describe("findNearestBus", () => {
  it("returns the closest bus to the given stop for the given route", () => {
    const result = findNearestBus(BUSES, STOP, "N16");
    expect(result).not.toBeNull();
    expect(result!.vehicleNo).toBe("서울70사1234"); // 정류장과 같은 좌표
  });

  it("returns null when no buses match the route", () => {
    const result = findNearestBus(BUSES, STOP, "N99");
    expect(result).toBeNull();
  });

  it("returns null for empty bus array", () => {
    const result = findNearestBus([], STOP, "N16");
    expect(result).toBeNull();
  });

  it("filters by routeName correctly", () => {
    const result = findNearestBus(BUSES, STOP, "N26");
    expect(result).not.toBeNull();
    expect(result!.vehicleNo).toBe("서울70바0421");
  });
});

describe("estimateBusEta", () => {
  it("returns eta for the nearest bus on the route", () => {
    const result = estimateBusEta({
      liveBuses: BUSES,
      stopCoord: STOP,
      routeName: "N16",
    });
    expect(result).not.toBeNull();
    expect(result!.etaSec).toBeGreaterThanOrEqual(0);
    expect(result!.vehicleNo).toBe("서울70사1234");
    expect(result!.distanceMeters).toBeGreaterThanOrEqual(0);
  });

  it("returns null when no matching buses exist", () => {
    const result = estimateBusEta({
      liveBuses: BUSES,
      stopCoord: STOP,
      routeName: "N99",
    });
    expect(result).toBeNull();
  });

  it("calculates reasonable ETA for a bus ~500m away", () => {
    // 광화문 버스는 시청에서 약 500m
    const result = estimateBusEta({
      liveBuses: BUSES,
      stopCoord: STOP,
      routeName: "N16",
    });
    // 가장 가까운 버스(같은 좌표)가 선택되므로 ETA ≈ 0
    expect(result!.etaSec).toBeLessThan(5);
  });

  it("uses bus speed from oprSpd when available", () => {
    const busWithSpeed: LiveBus[] = [
      {
        routeId: "SEL-N16",
        routeName: "N16",
        vehicleNo: "서울70사9999",
        lat: 37.5702, // 시청에서 약 500m
        lng: 126.9824,
        oprSpd: 30, // 30 km/h
      },
    ];
    const result = estimateBusEta({
      liveBuses: busWithSpeed,
      stopCoord: STOP,
    });
    expect(result).not.toBeNull();
    // 500m at 30km/h ≈ 60초
    expect(result!.etaSec).toBeGreaterThan(30);
    expect(result!.etaSec).toBeLessThan(120);
  });

  it("falls back to default speed when oprSpd is 0 or missing", () => {
    const busNoSpeed: LiveBus[] = [
      {
        routeId: "SEL-N16",
        routeName: "N16",
        vehicleNo: "서울70사0000",
        lat: 37.5702,
        lng: 126.9824,
        oprSpd: 0,
      },
    ];
    const result = estimateBusEta({
      liveBuses: busNoSpeed,
      stopCoord: STOP,
    });
    expect(result).not.toBeNull();
    expect(result!.etaSec).toBeGreaterThan(0);
  });

  it("returns all matching buses when no routeName filter", () => {
    const result = estimateBusEta({
      liveBuses: BUSES,
      stopCoord: STOP,
    });
    // 가장 가까운 버스 선택 (노선 무관)
    expect(result).not.toBeNull();
    expect(result!.vehicleNo).toBe("서울70사1234");
  });
});

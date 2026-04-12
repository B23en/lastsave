import type { Coord, LiveBus, RouteLeg } from "@/types/trip";
import { haversineMeters } from "./eta";

/** 버스 기본 속도 (m/s). 약 30 km/h. oprSpd가 없거나 0일 때 사용. */
const DEFAULT_BUS_SPEED_MPS = 8;

/** 직선 거리 → 실제 도로 거리 보정 계수 */
const ROAD_CORRECTION_FACTOR = 1.3;

/**
 * legs 배열에서 첫 번째 버스/지하철 노선명을 찾는다.
 * CompareSheet, RiskBanner, MapCanvas 등 여러 곳에서 공용.
 */
export function firstTransitRouteName(
  legs: Pick<RouteLeg, "kind" | "routeName">[],
): string | undefined {
  for (const leg of legs) {
    if ((leg.kind === "bus" || leg.kind === "subway") && leg.routeName) {
      return leg.routeName;
    }
  }
  return undefined;
}

export type BusEtaInput = {
  /** 실시간 버스 위치 목록 */
  liveBuses: LiveBus[];
  /** 사용자가 탑승할 정류장 좌표 */
  stopCoord: Coord;
  /** 노선 필터 (예: "N16"). 생략 시 전체 버스 중 가장 가까운 것 선택. */
  routeName?: string;
};

export type BusEtaResult = {
  /** 예상 도착 시간 (초) */
  etaSec: number;
  /** 버스-정류장 직선 거리 (미터) */
  distanceMeters: number;
  /** 차량 번호 */
  vehicleNo: string;
  /** 노선명 */
  routeName: string;
};

/**
 * 실시간 버스 위치 목록에서 지정 정류장에 가장 가까운 버스를 찾는다.
 * routeName이 주어지면 해당 노선만 필터링한다.
 */
export function findNearestBus(
  buses: LiveBus[],
  stopCoord: Coord,
  routeName?: string,
): (LiveBus & { distanceMeters: number }) | null {
  const filtered = routeName
    ? buses.filter((b) => b.routeName === routeName)
    : buses;

  if (filtered.length === 0) return null;

  let nearest: LiveBus | null = null;
  let minDist = Infinity;

  for (const bus of filtered) {
    const dist = haversineMeters(
      { lat: bus.lat, lng: bus.lng },
      stopCoord,
    );
    if (dist < minDist) {
      minDist = dist;
      nearest = bus;
    }
  }

  if (!nearest) return null;
  return { ...nearest, distanceMeters: minDist };
}

/**
 * 가장 가까운 실시간 버스의 정류장 도착 예상 시간(ETA)을 계산한다.
 *
 * ETA = 직선거리 / 버스 속도
 * - oprSpd(km/h)가 있으면 해당 속도 사용
 * - 없거나 0이면 기본 30km/h(≈8m/s) 적용
 *
 * 실제 도로 경로가 아닌 직선 거리 기반이므로 보정 계수(1.3)를 곱한다.
 */
export function estimateBusEta(input: BusEtaInput): BusEtaResult | null {
  const nearest = findNearestBus(
    input.liveBuses,
    input.stopCoord,
    input.routeName,
  );

  if (!nearest) return null;

  const distanceMeters = nearest.distanceMeters;

  // 도로 보정: 직선 거리 × 보정 계수 ≈ 실제 도로 거리
  const roadDistance = distanceMeters * ROAD_CORRECTION_FACTOR;

  // 속도 결정: oprSpd(km/h) → m/s, 없으면 기본값
  const oprSpd = nearest.oprSpd;
  const speedMps =
    oprSpd && oprSpd > 0
      ? oprSpd / 3.6 // km/h → m/s
      : DEFAULT_BUS_SPEED_MPS;

  const etaSec = speedMps > 0 ? roadDistance / speedMps : 0;

  return {
    etaSec: Math.round(etaSec),
    distanceMeters: Math.round(distanceMeters),
    vehicleNo: nearest.vehicleNo,
    routeName: nearest.routeName,
  };
}

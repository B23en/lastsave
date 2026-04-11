import type {
  BikeRoute,
  BusRoute,
  RecommendationBadge,
  RiskLevel,
} from "@/types/trip";

export const TIE_WINDOW_SEC = 60;

export type RecommendInput = {
  bus: BusRoute;
  bike: BikeRoute;
  risk: RiskLevel;
};

/**
 * 버스/자전거 경로 중 어느 쪽을 추천할지 결정한다.
 *
 * 우선순위:
 *   1. 버스 운행 종료 → 자전거 (only_option, 대여 가능 시)
 *   2. 자전거 대여 불가 → 버스 (only_option, 운행 중인 경우)
 *   3. 둘 다 사용 불가 → winner = null
 *   4. risk ∈ {danger, caution} → 자전거 (safer)
 *   5. 소요 시간 차이 ≤ 60초 → 비김 (tie, 기본적으로 버스 승)
 *   6. 소요 시간이 더 짧은 쪽 (faster)
 */
export function recommend(input: RecommendInput): RecommendationBadge {
  const { bus, bike, risk } = input;
  const busUsable = !bus.isServiceEnded;
  const bikeUsable = bike.isAvailable;

  if (!busUsable && !bikeUsable) {
    return {
      winner: null,
      reason: "only_option",
      label: "이용 가능한 경로가 없습니다",
    };
  }

  if (!busUsable && bikeUsable) {
    return {
      winner: "bike",
      reason: "only_option",
      label: "버스 운행 종료 · 공영자전거로 이동",
    };
  }

  if (busUsable && !bikeUsable) {
    return {
      winner: "bus",
      reason: "only_option",
      label: "자전거 이용 불가 · 버스 이용",
    };
  }

  if (risk === "danger" || risk === "caution") {
    return {
      winner: "bike",
      reason: "safer",
      label:
        risk === "danger"
          ? "막차 놓칠 위험 · 자전거 추천"
          : "시간 빠듯함 · 자전거 권장",
    };
  }

  const diff = bus.totalDurationSec - bike.totalDurationSec;
  if (Math.abs(diff) <= TIE_WINDOW_SEC) {
    return {
      winner: "bus",
      reason: "tie",
      label: "두 경로 비슷 · 편한 쪽 선택",
    };
  }

  if (bike.totalDurationSec < bus.totalDurationSec) {
    return {
      winner: "bike",
      reason: "faster",
      label: "자전거가 더 빠름",
    };
  }

  return {
    winner: "bus",
    reason: "faster",
    label: "버스가 더 빠름",
  };
}

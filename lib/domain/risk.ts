import type { RiskLevel } from "@/types/trip";

export const DANGER_THRESHOLD_SEC = 120;
export const CAUTION_THRESHOLD_SEC = 300;

export type RiskInput = {
  /** 사용자 → 정류장 도보 예상 시간 (초). */
  walkSec: number;
  /** 버스 도착까지 남은 시간 (초). */
  busEtaSec: number;
  /** 해당 노선 막차 출발 시각. 없으면 운행 중으로 간주. */
  lastBusAt?: Date;
  /** 테스트 결정성을 위한 현재 시각 오버라이드. */
  now?: Date;
};

/**
 * 버스를 잡을 수 있는지의 안전 등급을 계산한다.
 *
 * 규칙:
 *   slack = busEtaSec − walkSec
 *   - slack > 300 (5분 초과)        → safe
 *   - 120 ≤ slack ≤ 300 (2–5분)      → caution
 *   - slack < 120 (2분 미만)         → danger
 *   - lastBusAt 이 현재 시각 이하    → danger (막차 종료)
 */
export function computeRisk(input: RiskInput): RiskLevel {
  const now = input.now ?? new Date();

  if (input.lastBusAt && input.lastBusAt.getTime() <= now.getTime()) {
    return "danger";
  }

  const slack = input.busEtaSec - input.walkSec;

  if (slack < DANGER_THRESHOLD_SEC) return "danger";
  if (slack <= CAUTION_THRESHOLD_SEC) return "caution";
  return "safe";
}

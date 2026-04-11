/**
 * 막차 시각 도메인 헬퍼.
 *
 * 실제 노선별 막차 시각은 제공 API 에 없기 때문에, MVP 는 서울 심야버스 N 라인
 * 기준으로 **00:30 KST 막차 출발**을 가정한다. 노선별 실제 막차가 필요하면
 * 추후 `lib/api/` 에 별도 데이터 소스를 붙이고 이 상수만 바꿔 쓰면 된다.
 */
export const LAST_BUS_HOUR_KST = 0;
export const LAST_BUS_MINUTE_KST = 30;

const MS_PER_DAY = 24 * 60 * 60 * 1_000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1_000;

/**
 * 주어진 시각 이후 처음 돌아오는 막차 출발 시각(KST 기준)을 반환한다.
 * now === 오늘 00:30 이면 내일 00:30 을 반환한다 (경계 포함 = 이미 놓친 것).
 */
export function nextLastBusDeparture(now: Date): Date {
  const kstNow = new Date(now.getTime() + KST_OFFSET_MS);
  // KST 기준 오늘 00:30 UTC epoch
  const kstYear = kstNow.getUTCFullYear();
  const kstMonth = kstNow.getUTCMonth();
  const kstDate = kstNow.getUTCDate();

  const todayCutoffUtc = Date.UTC(
    kstYear,
    kstMonth,
    kstDate,
    LAST_BUS_HOUR_KST - 9,
    LAST_BUS_MINUTE_KST,
    0,
    0,
  );

  if (now.getTime() < todayCutoffUtc) {
    return new Date(todayCutoffUtc);
  }
  return new Date(todayCutoffUtc + MS_PER_DAY);
}

/**
 * 지금부터 다음 막차 출발까지 남은 시간(초).
 */
export function lastBusEtaSec(now: Date): number {
  const next = nextLastBusDeparture(now);
  return Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1_000));
}

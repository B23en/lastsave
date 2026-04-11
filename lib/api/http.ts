import "server-only";

export const DEFAULT_UPSTREAM_TIMEOUT_MS = 2_000;
export const CIRCUIT_COOLDOWN_MS = 60_000;

export type FetchWithTimeoutOptions = RequestInit & {
  timeoutMs?: number;
};

/**
 * 외부 공공 API 호출용 fetch. AbortController 기반 타임아웃을 강제해
 * data.go.kr 게이트웨이 지연이나 키 전파 지연에 묶여 사용자 요청이
 * 타임아웃 없이 매달리지 않도록 한다.
 */
export async function fetchWithTimeout(
  url: URL | string,
  init: FetchWithTimeoutOptions = {},
): Promise<Response> {
  const { timeoutMs = DEFAULT_UPSTREAM_TIMEOUT_MS, ...rest } = init;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...rest,
      cache: rest.cache ?? "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 외부 API 별로 "최근 실패" 상태를 기억해 cooldown 동안은 아예
 * 호출을 건너뛰게 만드는 간이 서킷브레이커.
 *
 * 키 전파 지연(data.go.kr 502) 같은 반복 실패 상황에서 매 요청마다
 * 타임아웃을 기다리지 않도록 한다.
 */
const failedUntil = new Map<string, number>();

export function markUpstreamFailure(
  scope: string,
  cooldownMs: number = CIRCUIT_COOLDOWN_MS,
): void {
  failedUntil.set(scope, Date.now() + cooldownMs);
}

export function isUpstreamBlocked(scope: string): boolean {
  const until = failedUntil.get(scope);
  if (until === undefined) return false;
  if (until > Date.now()) return true;
  failedUntil.delete(scope);
  return false;
}

export function resetCircuitBreakers(): void {
  failedUntil.clear();
}

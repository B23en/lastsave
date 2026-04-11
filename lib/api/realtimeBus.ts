import "server-only";

import type {
  RealtimeBusLocationItem,
  RealtimeBusLocationResponse,
} from "@/types/realtimeBus";
import type { LiveBus } from "@/types/trip";
import { memoCache } from "./cache";
import { loadRealtimeBusLocationsFixture } from "./fixtures";
import {
  fetchWithTimeout,
  isUpstreamBlocked,
  markUpstreamFailure,
} from "./http";

const RTE_BASE = "https://apis.data.go.kr/B551982/rte";
const CACHE_TTL_MS = 15_000;
const DEFAULT_PAGE_SIZE = 100;

/**
 * 기본 지자체 코드 — 서울특별시 (법정동 10자리).
 */
export const DEFAULT_STDG_CD = "1100000000";

const serviceKey = () => process.env.REALTIME_BUS_SERVICE_KEY ?? "";

export type FetchBusLocationsParams = {
  stdgCd?: string;
  numOfRows?: number;
};

/**
 * /rtm_loc_info 실시간 버스 위치. 키 없거나 호출 실패 시 fixture 로 폴백.
 */
export async function fetchBusLocations(
  params: FetchBusLocationsParams = {},
): Promise<RealtimeBusLocationResponse> {
  const stdgCd = params.stdgCd ?? DEFAULT_STDG_CD;
  const cacheKey = `realtime-bus:${stdgCd}`;
  return memoCache(cacheKey, CACHE_TTL_MS, async () => {
    if (!serviceKey() || isUpstreamBlocked("realtime-bus")) {
      return loadRealtimeBusLocationsFixture();
    }

    const url = new URL(`${RTE_BASE}/rtm_loc_info`);
    url.searchParams.set("serviceKey", serviceKey());
    url.searchParams.set(
      "numOfRows",
      String(params.numOfRows ?? DEFAULT_PAGE_SIZE),
    );
    url.searchParams.set("pageNo", "1");
    url.searchParams.set("type", "json");
    url.searchParams.set("stdgCd", stdgCd);

    try {
      const res = await fetchWithTimeout(url);
      if (!res.ok) {
        throw new Error(`realtime-bus fetch failed: ${res.status}`);
      }
      return (await res.json()) as RealtimeBusLocationResponse;
    } catch (err) {
      markUpstreamFailure("realtime-bus");
      console.warn(
        "[realtime-bus] upstream call failed, falling back to fixture for 60s:",
        err,
      );
      return loadRealtimeBusLocationsFixture();
    }
  });
}

/**
 * 실시간 위치 응답을 LiveBus 배열로 정규화한다.
 * `items.item` 이 단일 객체/배열/빈 문자열 중 어느 것이든 안전하게 펼친다.
 */
export function normalizeBusLocations(
  response: RealtimeBusLocationResponse,
  filters: { rteNo?: string } = {},
): LiveBus[] {
  const items = extractItems(response);
  const out: LiveBus[] = [];
  for (const raw of items) {
    const live = toLiveBus(raw);
    if (!live) continue;
    if (filters.rteNo && live.routeName !== filters.rteNo) continue;
    out.push(live);
  }
  return out;
}

function extractItems(
  response: RealtimeBusLocationResponse,
): RealtimeBusLocationItem[] {
  const body = response.body;
  if (!body || body.items === "" || !body.items) return [];
  const item = body.items.item;
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}

function toLiveBus(raw: RealtimeBusLocationItem): LiveBus | null {
  const lat = Number(raw.lat);
  const lng = Number(raw.lot);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    routeId: raw.rteId,
    routeName: raw.rteNo,
    vehicleNo: raw.vhclNo,
    stationName: undefined,
    lat,
    lng,
  };
}

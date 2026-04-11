import "server-only";

import type { TagoBusResponse } from "@/types/tago";
import { memoCache } from "./cache";
import { loadBusPositionsFixture } from "./fixtures";
import {
  fetchWithTimeout,
  isUpstreamBlocked,
  markUpstreamFailure,
} from "./http";

const TAGO_BUS_BASE =
  "https://apis.data.go.kr/1613000/BusLcInfoInqireService";
const CACHE_TTL_MS = 15_000;

const serviceKey = () => process.env.TAGO_SERVICE_KEY ?? "";

export type BusPositionsParams = {
  cityCode: string;
  routeId: string;
};

/**
 * 초정밀버스 실시간 위치. 키가 없거나 호출 실패 시 fixture 로 폴백한다.
 */
export async function fetchBusPositions(
  params: BusPositionsParams,
): Promise<TagoBusResponse> {
  const cacheKey = `tago:bus:${params.cityCode}:${params.routeId}`;
  return memoCache(cacheKey, CACHE_TTL_MS, async () => {
    if (!serviceKey() || isUpstreamBlocked("tago")) {
      return loadBusPositionsFixture();
    }
    const url = new URL(`${TAGO_BUS_BASE}/getRouteAcctoBusLcList`);
    url.searchParams.set("serviceKey", serviceKey());
    url.searchParams.set("cityCode", params.cityCode);
    url.searchParams.set("routeId", params.routeId);
    url.searchParams.set("numOfRows", "50");
    url.searchParams.set("pageNo", "1");
    url.searchParams.set("_type", "json");

    try {
      const res = await fetchWithTimeout(url);
      if (!res.ok) {
        throw new Error(`TAGO bus fetch failed: ${res.status}`);
      }
      return (await res.json()) as TagoBusResponse;
    } catch (err) {
      markUpstreamFailure("tago");
      console.warn(
        "[tago] upstream call failed, falling back to fixture for 60s:",
        err,
      );
      return loadBusPositionsFixture();
    }
  });
}

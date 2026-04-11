import "server-only";

import type { TagoBikeResponse, TagoBusResponse } from "@/types/tago";
import { memoCache } from "./cache";
import {
  loadBikeStationsFixture,
  loadBusPositionsFixture,
} from "./fixtures";

const TAGO_BUS_BASE =
  "https://apis.data.go.kr/1613000/BusLcInfoInqireService";
const TAGO_BIKE_BASE =
  "https://apis.data.go.kr/B553530/bikeList/getBikeList";
const CACHE_TTL_MS = 15_000;

const serviceKey = () => process.env.TAGO_SERVICE_KEY ?? "";

export type BusPositionsParams = {
  cityCode: string;
  routeId: string;
};

export type BikeStationsParams = {
  /** 기본 서울(따릉이) = "SEOUL_BIKE" 등 지역 코드 */
  region?: string;
};

/**
 * 초정밀버스 실시간 위치. 키가 없으면 fixture로 폴백한다.
 */
export async function fetchBusPositions(
  params: BusPositionsParams,
): Promise<TagoBusResponse> {
  const cacheKey = `tago:bus:${params.cityCode}:${params.routeId}`;
  return memoCache(cacheKey, CACHE_TTL_MS, async () => {
    if (!serviceKey()) {
      return loadBusPositionsFixture();
    }
    const url = new URL(`${TAGO_BUS_BASE}/getRouteAcctoBusLcList`);
    url.searchParams.set("serviceKey", serviceKey());
    url.searchParams.set("cityCode", params.cityCode);
    url.searchParams.set("routeId", params.routeId);
    url.searchParams.set("numOfRows", "50");
    url.searchParams.set("pageNo", "1");
    url.searchParams.set("_type", "json");

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`TAGO bus fetch failed: ${res.status}`);
    }
    return (await res.json()) as TagoBusResponse;
  });
}

/**
 * 공영자전거 실시간 거치 정보. 키가 없으면 fixture로 폴백한다.
 */
export async function fetchBikeStations(
  params: BikeStationsParams = {},
): Promise<TagoBikeResponse> {
  const region = params.region ?? "ALL";
  const cacheKey = `tago:bike:${region}`;
  return memoCache(cacheKey, CACHE_TTL_MS, async () => {
    if (!serviceKey()) {
      return loadBikeStationsFixture();
    }
    const url = new URL(TAGO_BIKE_BASE);
    url.searchParams.set("serviceKey", serviceKey());
    url.searchParams.set("numOfRows", "200");
    url.searchParams.set("pageNo", "1");
    url.searchParams.set("_type", "json");

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`TAGO bike fetch failed: ${res.status}`);
    }
    return (await res.json()) as TagoBikeResponse;
  });
}

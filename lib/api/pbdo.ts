import "server-only";

import type {
  BikeStation,
  PbdoStationAvailabilityItem,
  PbdoStationAvailabilityResponse,
} from "@/types/pbdo";
import { memoCache } from "./cache";
import { loadPbdoAvailabilityFixture } from "./fixtures";

const PBDO_BASE = "https://apis.data.go.kr/B551982/pbdo_v2";
const CACHE_TTL_MS = 15_000;
const DEFAULT_PAGE_SIZE = 500;

const serviceKey = () => process.env.PUBLIC_BIKE_SERVICE_KEY ?? "";

export type FetchStationsParams = {
  /** 지자체 코드 (옵션). 생략 시 전국. */
  lcgvmnInstCd?: string;
  numOfRows?: number;
};

/**
 * inf_101_00010002_v2 대여가능 자전거 현황.
 * 키가 없거나 호출 실패 시 fixture 로 폴백한다.
 */
export async function fetchBikeStations(
  params: FetchStationsParams = {},
): Promise<PbdoStationAvailabilityResponse> {
  const region = params.lcgvmnInstCd ?? "ALL";
  const cacheKey = `pbdo:availability:${region}`;
  return memoCache(cacheKey, CACHE_TTL_MS, async () => {
    if (!serviceKey()) {
      return loadPbdoAvailabilityFixture();
    }

    const url = new URL(`${PBDO_BASE}/inf_101_00010002_v2`);
    url.searchParams.set("serviceKey", serviceKey());
    url.searchParams.set(
      "numOfRows",
      String(params.numOfRows ?? DEFAULT_PAGE_SIZE),
    );
    url.searchParams.set("pageNo", "1");
    url.searchParams.set("type", "JSON");
    if (params.lcgvmnInstCd) {
      url.searchParams.set("lcgvmnInstCd", params.lcgvmnInstCd);
    }

    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`PBDO fetch failed: ${res.status}`);
      }
      return (await res.json()) as PbdoStationAvailabilityResponse;
    } catch (err) {
      console.warn(
        "[pbdo] upstream call failed, falling back to fixture:",
        err,
      );
      return loadPbdoAvailabilityFixture();
    }
  });
}

/**
 * PBDO 응답을 사용하기 쉬운 BikeStation 배열로 정규화한다.
 * 숫자 파싱 실패한 항목은 걸러낸다.
 */
export function normalizeStations(
  response: PbdoStationAvailabilityResponse,
): BikeStation[] {
  const items = response.body?.item ?? [];
  const out: BikeStation[] = [];
  for (const raw of items) {
    const station = toStation(raw);
    if (station) out.push(station);
  }
  return out;
}

function toStation(raw: PbdoStationAvailabilityItem): BikeStation | null {
  const lat = Number(raw.lat);
  const lng = Number(raw.lot);
  const bikes = Number(raw.bcyclTpkctNocs);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    id: raw.rntstnId,
    name: raw.rntstnNm,
    lat,
    lng,
    bikesAvailable: Number.isFinite(bikes) ? bikes : 0,
  };
}

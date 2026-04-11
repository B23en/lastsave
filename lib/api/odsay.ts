import "server-only";

import type { OdsayPubTransResponse } from "@/types/odsay";
import { memoCache } from "./cache";
import { loadOdsayRouteFixture } from "./fixtures";

const ODSAY_BASE = "https://api.odsay.com/v1/api/searchPubTransPathT";
const CACHE_TTL_MS = 30_000;

const apiKey = () => process.env.ODSAY_KEY ?? "";

export type PubTransParams = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  /** 0: 전체, 1: 지하철, 2: 버스 */
  searchType?: 0 | 1 | 2;
};

/**
 * 대중교통 경로 탐색. 키가 없으면 fixture로 폴백한다.
 */
export async function searchPubTransPath(
  params: PubTransParams,
): Promise<OdsayPubTransResponse> {
  const { startX, startY, endX, endY, searchType = 0 } = params;
  const cacheKey = `odsay:${startX},${startY}->${endX},${endY}:${searchType}`;
  return memoCache(cacheKey, CACHE_TTL_MS, async () => {
    if (!apiKey()) {
      return loadOdsayRouteFixture();
    }
    const url = new URL(ODSAY_BASE);
    url.searchParams.set("apiKey", apiKey());
    url.searchParams.set("SX", String(startX));
    url.searchParams.set("SY", String(startY));
    url.searchParams.set("EX", String(endX));
    url.searchParams.set("EY", String(endY));
    url.searchParams.set("SearchPathType", String(searchType));

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`ODsay fetch failed: ${res.status}`);
    }
    return (await res.json()) as OdsayPubTransResponse;
  });
}

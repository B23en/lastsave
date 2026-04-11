import "server-only";

import type { KakaoKeywordSearchResponse } from "@/types/kakao";
import { memoCache } from "./cache";
import { loadKakaoKeywordSearchFixture } from "./fixtures";

const KAKAO_KEYWORD_URL =
  "https://dapi.kakao.com/v2/local/search/keyword.json";
const CACHE_TTL_MS = 60_000;

const restKey = () => process.env.KAKAO_REST_KEY ?? "";

export type KeywordSearchParams = {
  query: string;
  /** 검색 중심 좌표의 경도 (선택). */
  x?: number;
  /** 검색 중심 좌표의 위도 (선택). */
  y?: number;
  /** 검색 반경 (미터). x, y 와 함께 사용. */
  radius?: number;
  size?: number;
};

/**
 * 카카오 로컬 키워드 검색. 키 없으면 fixture로 폴백.
 * 같은 query 입력은 60초 동안 메모리에 캐시한다.
 */
export async function searchKeyword(
  params: KeywordSearchParams,
): Promise<KakaoKeywordSearchResponse> {
  const query = params.query.trim();
  if (query.length === 0) {
    return { documents: [], meta: { is_end: true, pageable_count: 0, total_count: 0 } };
  }

  const size = Math.min(Math.max(params.size ?? 10, 1), 15);
  const cacheKey = `kakao:keyword:${query}:${size}:${params.x ?? ""}:${params.y ?? ""}:${params.radius ?? ""}`;

  return memoCache(cacheKey, CACHE_TTL_MS, async () => {
    if (!restKey()) {
      return loadKakaoKeywordSearchFixture();
    }
    const url = new URL(KAKAO_KEYWORD_URL);
    url.searchParams.set("query", query);
    url.searchParams.set("size", String(size));
    if (params.x !== undefined && params.y !== undefined) {
      url.searchParams.set("x", String(params.x));
      url.searchParams.set("y", String(params.y));
      if (params.radius !== undefined) {
        url.searchParams.set("radius", String(params.radius));
      }
    }

    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${restKey()}` },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Kakao keyword search failed: ${res.status}`);
    }
    return (await res.json()) as KakaoKeywordSearchResponse;
  });
}

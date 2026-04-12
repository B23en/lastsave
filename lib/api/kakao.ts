import "server-only";

import type { KakaoKeywordSearchResponse } from "@/types/kakao";
import { memoCache } from "./cache";
import { loadKakaoKeywordSearchFixture } from "./fixtures";

const KAKAO_KEYWORD_URL =
  "https://dapi.kakao.com/v2/local/search/keyword.json";
const KAKAO_COORD2REGION_URL =
  "https://dapi.kakao.com/v2/local/geo/coord2regioncode.json";
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

/**
 * 카카오 역지오코딩: 좌표 → 법정동 코드(10자리).
 * 시/도 단위 코드(앞 2자리 + 00000000)를 반환하여 stdgCd 로 사용한다.
 */
export async function coordToRegionCode(
  lat: number,
  lng: number,
): Promise<string | null> {
  const cacheKey = `kakao:region:${lat.toFixed(3)}:${lng.toFixed(3)}`;
  return memoCache(cacheKey, 300_000, async () => {
    if (!restKey()) return null;

    const url = new URL(KAKAO_COORD2REGION_URL);
    url.searchParams.set("x", String(lng));
    url.searchParams.set("y", String(lat));
    url.searchParams.set("input_coord", "WGS84");

    try {
      const res = await fetch(url, {
        headers: { Authorization: `KakaoAK ${restKey()}` },
        cache: "no-store",
      });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        documents: Array<{
          region_type: string;
          code: string;
          region_1depth_name: string;
        }>;
      };
      // region_type === "B" 가 법정동 결과
      const bDoc = data.documents.find((d) => d.region_type === "B");
      if (!bDoc) return null;
      // 시/도 단위 코드로 변환: 앞 2자리 + "00000000"
      const sido = bDoc.code.slice(0, 2);
      return `${sido}00000000`;
    } catch {
      return null;
    }
  });
}

/**
 * 카카오 로컬 키워드 검색 응답.
 * https://developers.kakao.com/docs/latest/ko/local/dev-guide#search-by-keyword
 */
export type KakaoKeywordSearchResponse = {
  documents: KakaoPlaceDocument[];
  meta: {
    is_end: boolean;
    pageable_count: number;
    same_name?: {
      keyword: string;
      region: string[];
      selected_region: string;
    } | null;
    total_count: number;
  };
};

export type KakaoPlaceDocument = {
  id: string;
  place_name: string;
  address_name: string;
  road_address_name: string;
  category_name: string;
  category_group_code: string;
  category_group_name: string;
  phone: string;
  place_url: string;
  distance: string;
  /** 경도 (longitude) — 문자열로 옴 */
  x: string;
  /** 위도 (latitude) — 문자열로 옴 */
  y: string;
};

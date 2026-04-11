/**
 * 행정안전부 한국지역정보개발원 전국 통합데이터 초정밀버스 위치 실시간 정보
 * (공공데이터포털 15157601, B551982/rte)
 * https://www.data.go.kr/data/15157601/openapi.do
 *
 * header.resultCode === "K0" 이면 정상.
 */
export type RealtimeBusEnvelope<Item> = {
  header: {
    resultCode: string;
    resultMsg: string;
  };
  body: {
    totalCount?: string | number;
    pageNo?: string | number;
    numOfRows?: string | number;
    /**
     * 응답이 1건일 때는 item 이 단일 객체, 여러 건일 때는 배열로 온다.
     * 정규화 쪽에서 둘 다 받을 수 있어야 한다.
     */
    items:
      | { item: Item | Item[] }
      | "";
  };
};

/**
 * `/B551982/rte/rtm_loc_info` 실시간 위치 항목.
 */
export type RealtimeBusLocationItem = {
  /** 지자체 코드 (법정동 10자리) */
  stdgCd: string;
  /** 지방자치단체명 */
  lclgvNm: string;
  /** 노선 ID */
  rteId: string;
  /** 노선 번호 (사용자 노출용, 예: "N16") */
  rteNo: string;
  /** 차량번호 */
  vhclNo: string;
  /** 위도 */
  lat: string;
  /** 경도 — 필드명이 `lot` 임 (sic, pbdo 와 동일한 naming 관습) */
  lot: string;
  /** 방향각 */
  oprDrct?: string;
  /** 속도 */
  oprSpd?: string;
  /** 데이터수신타입 (GNSS/GPS) */
  evtType?: string;
};

export type RealtimeBusLocationResponse =
  RealtimeBusEnvelope<RealtimeBusLocationItem>;

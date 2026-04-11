/**
 * 행정안전부 한국지역정보개발원 전국 공영자전거 실시간 정보 API
 * (공공데이터포털 15126639, B551982/pbdo_v2)
 * https://www.data.go.kr/data/15126639/openapi.do
 *
 * header.resultCode === "K0" 가 정상 응답이다.
 */
export type PbdoEnvelope<Item> = {
  header: {
    resultCode: string;
    resultMsg: string;
  };
  body: {
    totalCount: string;
    pageNo: string;
    numOfRows: string;
    item: Item[];
  };
};

/**
 * `inf_101_00010001_v2` 대여소 정보(정적) 항목.
 */
export type PbdoStationInfoItem = {
  rntstnId: string;
  rntstnNm: string;
  lcgvmnInstCd?: string;
  lcgvmnInstNm?: string;
  /** 위도 */
  lat: string;
  /** 경도 — 공식 필드명이 lon 이 아닌 `lot` 임 (sic). */
  lot: string;
};

/**
 * `inf_101_00010002_v2` 대여가능 자전거 현황(동적) 항목.
 * bcyclTpkctNocs 는 현재 거치되어 대여 가능한 자전거 수를 의미한다.
 */
export type PbdoStationAvailabilityItem = PbdoStationInfoItem & {
  /** 자전거 주차 총 건수 = 현재 대여 가능한 자전거 수 */
  bcyclTpkctNocs: string;
};

export type PbdoStationInfoResponse = PbdoEnvelope<PbdoStationInfoItem>;
export type PbdoStationAvailabilityResponse =
  PbdoEnvelope<PbdoStationAvailabilityItem>;

/**
 * 클라이언트가 직접 쓰기 편하게 정규화한 거치대 모델.
 */
export type BikeStation = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** 대여 가능 자전거 수 */
  bikesAvailable: number;
  /** 반납 여유(추정) — 가용 정보가 없으면 undefined */
  docksAvailable?: number;
};

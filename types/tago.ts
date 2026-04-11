/**
 * 공공데이터포털(TAGO) 공통 응답 envelope.
 * 성공 시 response.header.resultCode === "00".
 */
export type TagoEnvelope<Item> = {
  response: {
    header: {
      resultCode: string;
      resultMsg: string;
    };
    body: {
      items: { item: Item[] } | "";
      numOfRows: number;
      pageNo: number;
      totalCount: number;
    };
  };
};

/**
 * 국토교통부_(TAGO)_전국버스위치정보 개별 항목.
 * https://www.data.go.kr/data/15098534/openapi.do
 */
export type TagoBusPositionItem = {
  gpslati: number;
  gpslong: number;
  nodeid: string;
  nodenm: string;
  nodeord: number;
  routeid: string;
  routenm: string;
  routetp: string;
  vehicleno: string;
};

export type TagoBusResponse = TagoEnvelope<TagoBusPositionItem>;

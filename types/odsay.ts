/**
 * ODsay `searchPubTransPathT` 응답의 최소 구조.
 * https://lab.odsay.com/guide/releaseReference
 *
 * pathType:
 *   1 = 지하철, 2 = 버스, 3 = 버스+지하철
 */
export type OdsayPubTransResponse = {
  result?: {
    searchType: number;
    outTrafficCheck: number;
    path: OdsayPath[];
  };
  error?: {
    code: string;
    msg: string;
  };
};

export type OdsayPath = {
  pathType: 1 | 2 | 3;
  info: {
    totalTime: number;
    totalWalk: number;
    totalDistance: number;
    busTransitCount: number;
    subwayTransitCount: number;
    totalTransitCount: number;
    firstStartStation: string;
    lastEndStation: string;
    payment: number;
  };
  subPath: OdsaySubPath[];
};

export type OdsaySubPath = {
  trafficType: 1 | 2 | 3;
  distance: number;
  sectionTime: number;
  stationCount?: number;
  lane?: Array<{
    busNo?: string;
    subwayCode?: number;
    busID?: number;
  }>;
  startName?: string;
  endName?: string;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  passStopList?: {
    stations: Array<{
      index: number;
      stationName: string;
      x: string;
      y: string;
    }>;
  };
};

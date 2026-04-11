import { beforeEach, describe, expect, it } from "vitest";
import { cacheClear } from "@/lib/api/cache";
import { GET as getBusPositions } from "@/app/api/bus/positions/route";
import { GET as getBikeStations } from "@/app/api/bike/stations/route";
import { GET as getCompare } from "@/app/api/route/compare/route";
import { GET as getKakaoSearch } from "@/app/api/kakao/search/route";
import type { TagoBikeResponse, TagoBusResponse } from "@/types/tago";

type KakaoSearchBody = {
  query: string;
  suggestions: Array<{
    id: string;
    name: string;
    address: string;
    category: string;
    lat: number;
    lng: number;
  }>;
};

const busReq = (qs = "") =>
  new Request(`http://localhost/api/bus/positions${qs}`);
const bikeReq = (qs = "") =>
  new Request(`http://localhost/api/bike/stations${qs}`);

describe("GET /api/bus/positions", () => {
  beforeEach(() => {
    cacheClear();
    delete process.env.TAGO_SERVICE_KEY;
  });

  it("returns the TAGO bus envelope from fixture on cold miss", async () => {
    const res = await getBusPositions(busReq());
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Cache")).toBe("MISS");

    const body = (await res.json()) as TagoBusResponse;
    expect(body.response.header.resultCode).toBe("00");
    expect(body.response.body.totalCount).toBeGreaterThan(0);
    if (typeof body.response.body.items === "string") {
      throw new Error("expected items to be populated");
    }
    const first = body.response.body.items.item[0];
    expect(first).toBeDefined();
    expect(first!.gpslati).toBeTypeOf("number");
    expect(first!.gpslong).toBeTypeOf("number");
    expect(first!.routenm).toBeTypeOf("string");
  });

  it("marks second call within TTL as X-Cache: HIT", async () => {
    await getBusPositions(busReq());
    const res = await getBusPositions(busReq());
    expect(res.headers.get("X-Cache")).toBe("HIT");
  });

  it("scopes cache per routeId query", async () => {
    const a = await getBusPositions(busReq("?routeId=R-A"));
    const b = await getBusPositions(busReq("?routeId=R-B"));
    expect(a.headers.get("X-Cache")).toBe("MISS");
    expect(b.headers.get("X-Cache")).toBe("MISS");
  });
});

describe("GET /api/bike/stations", () => {
  beforeEach(() => {
    cacheClear();
    delete process.env.TAGO_SERVICE_KEY;
  });

  it("returns the TAGO bike envelope from fixture", async () => {
    const res = await getBikeStations(bikeReq());
    expect(res.status).toBe(200);
    const body = (await res.json()) as TagoBikeResponse;
    expect(body.response.header.resultCode).toBe("00");
    if (typeof body.response.body.items === "string") {
      throw new Error("expected items to be populated");
    }
    const items = body.response.body.items.item;
    expect(items.length).toBeGreaterThan(0);
    const first = items[0]!;
    expect(first.stationId).toBeTypeOf("string");
    expect(Number(first.rackTotCnt)).toBeGreaterThan(0);
  });

  it("caches by region within TTL", async () => {
    await getBikeStations(bikeReq());
    const second = await getBikeStations(bikeReq());
    expect(second.headers.get("X-Cache")).toBe("HIT");
  });
});

describe("GET /api/route/compare", () => {
  beforeEach(() => {
    cacheClear();
    delete process.env.ODSAY_KEY;
  });

  const compareReq = (qs: string) =>
    new Request(`http://localhost/api/route/compare${qs}`);

  it("returns 400 when any coordinate is missing", async () => {
    const res = await getCompare(compareReq("?startX=126.9779"));
    expect(res.status).toBe(400);
  });

  it("returns a bus route and bike=null from the fixture path", async () => {
    const res = await getCompare(
      compareReq(
        "?startX=126.9779&startY=37.5663&endX=127.0276&endY=37.4979",
      ),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      bus: { mode: string; totalDurationSec: number; polyline: unknown[] };
      bike: unknown;
    };
    expect(body.bike).toBeNull();
    expect(body.bus.mode).toBe("bus");
    expect(body.bus.totalDurationSec).toBeGreaterThan(0);
    expect(body.bus.polyline.length).toBeGreaterThan(0);
  });
});

describe("GET /api/kakao/search", () => {
  beforeEach(() => {
    cacheClear();
    delete process.env.KAKAO_REST_KEY;
  });

  const searchReq = (qs: string) =>
    new Request(`http://localhost/api/kakao/search${qs}`);

  it("maps Kakao documents into flat suggestions", async () => {
    const res = await getKakaoSearch(searchReq("?q=강남역"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as KakaoSearchBody;
    expect(body.query).toBe("강남역");
    expect(body.suggestions.length).toBeGreaterThan(0);
    const first = body.suggestions[0]!;
    expect(first.name).toBeTypeOf("string");
    expect(first.lat).toBeTypeOf("number");
    expect(first.lng).toBeTypeOf("number");
    expect(Number.isFinite(first.lat)).toBe(true);
    expect(Number.isFinite(first.lng)).toBe(true);
  });

  it("returns empty suggestions for blank query", async () => {
    const res = await getKakaoSearch(searchReq("?q="));
    expect(res.status).toBe(200);
    const body = (await res.json()) as KakaoSearchBody;
    expect(body.suggestions).toEqual([]);
  });
});

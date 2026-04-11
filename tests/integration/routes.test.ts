import { beforeEach, describe, expect, it } from "vitest";
import { cacheClear } from "@/lib/api/cache";
import { GET as getBusPositions } from "@/app/api/bus/positions/route";
import { GET as getBikeStations } from "@/app/api/bike/stations/route";
import { GET as getCompare } from "@/app/api/route/compare/route";
import type { TagoBikeResponse, TagoBusResponse } from "@/types/tago";

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
  it("returns 501 placeholder until P5~P7", async () => {
    const res = await getCompare();
    expect(res.status).toBe(501);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("not_implemented");
  });
});

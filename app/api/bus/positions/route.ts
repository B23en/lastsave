import { NextResponse } from "next/server";
import { fetchBusPositions } from "@/lib/api/tago";
import { cacheHas } from "@/lib/api/cache";
import type { LiveBus } from "@/types/trip";
import type { TagoBusPositionItem } from "@/types/tago";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const cityCode = url.searchParams.get("cityCode") ?? "11";
  const routeId = url.searchParams.get("routeId") ?? "SEB113000013";
  const routeNm = url.searchParams.get("routeNm");

  const cacheKey = `tago:bus:${cityCode}:${routeId}`;
  const wasCached = cacheHas(cacheKey);

  try {
    const raw = await fetchBusPositions({ cityCode, routeId });
    const rawItems = raw.response?.body?.items;
    const items: TagoBusPositionItem[] =
      rawItems && typeof rawItems !== "string" ? rawItems.item : [];

    const buses: LiveBus[] = items
      .filter(
        (i) =>
          Number.isFinite(Number(i.gpslati)) &&
          Number.isFinite(Number(i.gpslong)),
      )
      .filter((i) => (routeNm ? i.routenm === routeNm : true))
      .map((i) => ({
        routeId: i.routeid,
        routeName: i.routenm,
        vehicleNo: i.vehicleno,
        stationName: i.nodenm,
        lat: Number(i.gpslati),
        lng: Number(i.gpslong),
      }));

    return NextResponse.json(
      { buses },
      {
        headers: {
          "X-Cache": wasCached ? "HIT" : "MISS",
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (err) {
    console.error("[api/bus/positions]", err);
    return NextResponse.json(
      { error: "bus_positions_failed" },
      { status: 502 },
    );
  }
}

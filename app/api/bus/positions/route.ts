import { NextResponse } from "next/server";
import { fetchBusPositions } from "@/lib/api/tago";
import { cacheHas } from "@/lib/api/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const cityCode = url.searchParams.get("cityCode") ?? "11";
  const routeId = url.searchParams.get("routeId") ?? "SEB113000013";

  const cacheKey = `tago:bus:${cityCode}:${routeId}`;
  const wasCached = cacheHas(cacheKey);

  try {
    const data = await fetchBusPositions({ cityCode, routeId });
    return NextResponse.json(data, {
      headers: {
        "X-Cache": wasCached ? "HIT" : "MISS",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[api/bus/positions]", err);
    return NextResponse.json(
      { error: "bus_positions_failed" },
      { status: 502 },
    );
  }
}

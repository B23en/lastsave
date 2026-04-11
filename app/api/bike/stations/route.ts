import { NextResponse } from "next/server";
import { fetchBikeStations } from "@/lib/api/tago";
import { cacheHas } from "@/lib/api/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const region = url.searchParams.get("region") ?? "ALL";

  const cacheKey = `tago:bike:${region}`;
  const wasCached = cacheHas(cacheKey);

  try {
    const data = await fetchBikeStations({ region });
    return NextResponse.json(data, {
      headers: {
        "X-Cache": wasCached ? "HIT" : "MISS",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[api/bike/stations]", err);
    return NextResponse.json(
      { error: "bike_stations_failed" },
      { status: 502 },
    );
  }
}

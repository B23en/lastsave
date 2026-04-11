import { NextResponse } from "next/server";
import { fetchBikeStations, normalizeStations } from "@/lib/api/pbdo";
import { cacheHas } from "@/lib/api/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const lcgvmnInstCd = url.searchParams.get("lcgvmnInstCd") ?? undefined;
  const region = lcgvmnInstCd ?? "ALL";

  const cacheKey = `pbdo:availability:${region}`;
  const wasCached = cacheHas(cacheKey);

  try {
    const raw = await fetchBikeStations({ lcgvmnInstCd });
    const stations = normalizeStations(raw);

    return NextResponse.json(
      { resultCode: raw.header?.resultCode, stations },
      {
        headers: {
          "X-Cache": wasCached ? "HIT" : "MISS",
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (err) {
    console.error("[api/bike/stations]", err);
    return NextResponse.json(
      { error: "bike_stations_failed" },
      { status: 502 },
    );
  }
}

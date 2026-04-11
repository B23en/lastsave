import { NextResponse } from "next/server";
import {
  DEFAULT_STDG_CD,
  fetchBusLocations,
  normalizeBusLocations,
} from "@/lib/api/realtimeBus";
import { cacheHas } from "@/lib/api/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const stdgCd = url.searchParams.get("stdgCd") ?? DEFAULT_STDG_CD;
  const rteNo = url.searchParams.get("rteNo") ?? undefined;

  const cacheKey = `realtime-bus:${stdgCd}`;
  const wasCached = cacheHas(cacheKey);

  try {
    const raw = await fetchBusLocations({ stdgCd });
    const buses = normalizeBusLocations(raw, { rteNo });

    return NextResponse.json(
      { resultCode: raw.header?.resultCode, buses },
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

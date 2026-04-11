import { NextResponse } from "next/server";
import { searchPubTransPath } from "@/lib/api/odsay";
import { mapOdsayToBusRoute } from "@/lib/domain/odsayMapper";
import type { BikeRoute, BusRoute } from "@/types/trip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type CompareResponse = {
  bus: BusRoute | null;
  bike: BikeRoute | null;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const startX = num(url.searchParams.get("startX"));
  const startY = num(url.searchParams.get("startY"));
  const endX = num(url.searchParams.get("endX"));
  const endY = num(url.searchParams.get("endY"));

  if ([startX, startY, endX, endY].some((v) => v === null)) {
    return NextResponse.json(
      {
        error: "invalid_coordinates",
        message: "startX, startY, endX, endY 쿼리 파라미터가 모두 필요합니다.",
      },
      { status: 400 },
    );
  }

  try {
    const odsayResponse = await searchPubTransPath({
      startX: startX!,
      startY: startY!,
      endX: endX!,
      endY: endY!,
    });

    const bus = mapOdsayToBusRoute(odsayResponse);

    const body: CompareResponse = {
      bus:
        bus ??
        ({
          mode: "bus",
          totalDurationSec: 0,
          walkDurationSec: 0,
          transferCount: 0,
          legs: [],
          isServiceEnded: true,
          polyline: [],
        } satisfies BusRoute),
      bike: null,
    };

    return NextResponse.json(body, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[api/route/compare]", err);
    return NextResponse.json(
      { error: "compare_failed" },
      { status: 502 },
    );
  }
}

function num(v: string | null): number | null {
  if (v === null || v === "") return null;
  const parsed = Number(v);
  return Number.isFinite(parsed) ? parsed : null;
}

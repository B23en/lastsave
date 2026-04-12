import { NextResponse } from "next/server";
import { fetchBikeStations, normalizeStations } from "@/lib/api/pbdo";
import { searchPubTransPath } from "@/lib/api/odsay";
import { fetchOsrmRoute } from "@/lib/api/osrm";
import {
  buildBikeRoute,
  findNearestStationWithBikes,
  BIKE_STATION_SEARCH_RADIUS_M,
} from "@/lib/domain/bikeRoute";
import { mapOdsayToBusRoute } from "@/lib/domain/odsayMapper";
import type { BikeRoute, BusRoute } from "@/types/trip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type CompareResponse = {
  bus: BusRoute;
  bike: BikeRoute;
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
    const [odsayResponse, bikeRawResponse] = await Promise.all([
      searchPubTransPath({
        startX: startX!,
        startY: startY!,
        endX: endX!,
        endY: endY!,
      }),
      fetchBikeStations(),
    ]);

    const bus =
      mapOdsayToBusRoute(odsayResponse) ??
      ({
        mode: "bus",
        totalDurationSec: 0,
        walkDurationSec: 0,
        transferCount: 0,
        legs: [],
        isServiceEnded: true,
        polyline: [],
      } satisfies BusRoute);

    const stations = normalizeStations(bikeRawResponse);
    const originCoord = { lat: startY!, lng: startX! };
    const destCoord = { lat: endY!, lng: endX! };
    const radiusM = BIKE_STATION_SEARCH_RADIUS_M;

    // 거치대를 먼저 찾아서 OSRM 경로 조회에 사용
    const pickup = findNearestStationWithBikes(originCoord, stations, {
      radiusM,
      requireBikes: true,
    });
    const dropoff = findNearestStationWithBikes(destCoord, stations, {
      radiusM,
      requireBikes: false,
    });

    // 거치대가 있으면 OSRM으로 실제 도로 경로 조회 (병렬)
    const [walkToPickup, rideRoute, walkFromDropoff] =
      pickup && dropoff
        ? await Promise.all([
            fetchOsrmRoute(
              originCoord,
              { lat: pickup.station.lat, lng: pickup.station.lng },
              "foot",
            ),
            fetchOsrmRoute(
              { lat: pickup.station.lat, lng: pickup.station.lng },
              { lat: dropoff.station.lat, lng: dropoff.station.lng },
              "bike",
            ),
            fetchOsrmRoute(
              { lat: dropoff.station.lat, lng: dropoff.station.lng },
              destCoord,
              "foot",
            ),
          ])
        : [null, null, null];

    const bike = buildBikeRoute({
      origin: originCoord,
      destination: destCoord,
      stations,
      walkToPickup,
      rideRoute,
      walkFromDropoff,
    });

    const body: CompareResponse = { bus, bike };
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

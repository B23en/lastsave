import { NextResponse } from "next/server";
import { coordToRegionCode } from "@/lib/api/kakao";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GPS 좌표 → 시/도 법정동 코드(10자리) 반환.
 * 버스 위치 polling 시 stdgCd 를 결정하기 위해 클라이언트가 호출.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "invalid_coords" }, { status: 400 });
  }

  const stdgCd = await coordToRegionCode(lat, lng);
  return NextResponse.json({
    stdgCd: stdgCd ?? "1100000000",
    fallback: stdgCd === null,
  });
}

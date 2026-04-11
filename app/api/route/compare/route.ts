import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * P5/P6/P7 슬라이스에서 구현 예정.
 * Placeholder: ODsay 버스 경로 + TAGO 자전거 거치대 + 도메인 추천 결합.
 */
export function GET() {
  return NextResponse.json(
    {
      error: "not_implemented",
      message:
        "경로 비교 엔드포인트는 Slice P5~P7에서 구현됩니다. 현재는 /api/bus/positions, /api/bike/stations 만 사용 가능합니다.",
    },
    { status: 501 },
  );
}

import { NextResponse } from "next/server";
import { searchKeyword } from "@/lib/api/kakao";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? url.searchParams.get("query") ?? "";
  const xStr = url.searchParams.get("x");
  const yStr = url.searchParams.get("y");
  const radiusStr = url.searchParams.get("radius");
  const sizeStr = url.searchParams.get("size");

  try {
    const data = await searchKeyword({
      query: q,
      x: xStr ? Number(xStr) : undefined,
      y: yStr ? Number(yStr) : undefined,
      radius: radiusStr ? Number(radiusStr) : undefined,
      size: sizeStr ? Number(sizeStr) : undefined,
    });

    const suggestions = data.documents.map((d) => ({
      id: d.id,
      name: d.place_name,
      address: d.road_address_name || d.address_name,
      category: d.category_group_name || d.category_name,
      lat: Number(d.y),
      lng: Number(d.x),
    }));

    return NextResponse.json(
      { query: q, suggestions },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/kakao/search]", err);
    return NextResponse.json(
      { error: "kakao_search_failed" },
      { status: 502 },
    );
  }
}

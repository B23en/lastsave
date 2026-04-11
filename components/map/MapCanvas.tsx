"use client";

import { useEffect } from "react";
import { Map, MapMarker, useKakaoLoader } from "react-kakao-maps-sdk";
import type { Coord } from "@/types/trip";
import { KAKAO_MAP_KEY, SEOUL_CITY_HALL } from "@/lib/config";

type MapCanvasProps = {
  center?: Coord;
  level?: number;
  markerLabel?: string;
};

export function MapCanvas({
  center = SEOUL_CITY_HALL,
  level = 4,
  markerLabel = "서울시청",
}: MapCanvasProps) {
  const [loading, error] = useKakaoLoader({
    appkey: KAKAO_MAP_KEY,
    libraries: ["services", "clusterer"],
  });

  useEffect(() => {
    if (error) {
      console.error("[MapCanvas] Kakao SDK load failed", error);
      console.info(
        "[MapCanvas] 해결: 카카오 Developers → 내 앱 → 플랫폼 → Web 에 " +
          "http://localhost:3000 이 등록되어 있는지 확인하세요.",
      );
    }
  }, [error]);

  if (!KAKAO_MAP_KEY) {
    return (
      <FallbackCard
        title="카카오맵 키가 설정되지 않았습니다"
        body="NEXT_PUBLIC_KAKAO_MAP_KEY 환경 변수를 설정한 뒤 다시 시도해주세요."
      />
    );
  }

  if (error) {
    return (
      <FallbackCard
        title="지도를 불러오지 못했습니다"
        body={
          "브라우저 콘솔(F12) 메시지를 확인해주세요. 보통 카카오 Developers에서 " +
          "Web 플랫폼 도메인에 http://localhost:3000 이 등록되지 않은 경우입니다."
        }
      />
    );
  }

  if (loading) {
    return <MapSkeleton />;
  }

  return (
    <Map
      center={center}
      level={level}
      style={{ width: "100%", height: "100%" }}
      aria-label="지도"
    >
      <MapMarker position={center} title={markerLabel} />
    </Map>
  );
}

function MapSkeleton() {
  return (
    <div
      className="flex h-full w-full items-center justify-center bg-[color:var(--muted)]"
      role="status"
      aria-label="지도 로딩 중"
    >
      <div className="flex flex-col items-center gap-3 text-[color:var(--muted-foreground)]">
        <div className="h-10 w-10 animate-pulse rounded-full bg-[color:var(--border)]" />
        <span className="text-sm">지도를 준비하고 있어요…</span>
      </div>
    </div>
  );
}

function FallbackCard({ title, body }: { title: string; body: string }) {
  return (
    <div
      className="flex h-full w-full items-center justify-center bg-[color:var(--muted)] p-6"
      role="alert"
    >
      <div className="max-w-sm rounded-xl border border-[color:var(--border)] bg-[color:var(--background)] p-5 text-center">
        <p className="text-base font-semibold">{title}</p>
        <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
          {body}
        </p>
      </div>
    </div>
  );
}

"use client";

import type { ComponentProps } from "react";
import { useEffect, useMemo, useRef } from "react";
import { Map, MapMarker, useKakaoLoader } from "react-kakao-maps-sdk";

type MapOnCreate = NonNullable<ComponentProps<typeof Map>["onCreate"]>;
type KakaoMapInstance = Parameters<MapOnCreate>[0];
import type { Coord } from "@/types/trip";
import { KAKAO_MAP_KEY, SEOUL_CITY_HALL } from "@/lib/config";
import { useTripStore } from "@/lib/store/useTripStore";

type MapCanvasProps = {
  fallbackCenter?: Coord;
  level?: number;
};

export function MapCanvas({
  fallbackCenter = SEOUL_CITY_HALL,
  level = 4,
}: MapCanvasProps) {
  const [loading, error] = useKakaoLoader({
    appkey: KAKAO_MAP_KEY,
    libraries: ["services", "clusterer"],
  });

  const origin = useTripStore((s) => s.origin);
  const destination = useTripStore((s) => s.destination);
  const pickMode = useTripStore((s) => s.pickMode);
  const setOrigin = useTripStore((s) => s.setOrigin);
  const setPickMode = useTripStore((s) => s.setPickMode);

  const mapRef = useRef<KakaoMapInstance | null>(null);

  const center = origin?.coord ?? destination?.coord ?? fallbackCenter;

  const bounds = useMemo(() => {
    if (!origin || !destination) return null;
    return [origin.coord, destination.coord] as const;
  }, [origin, destination]);

  useEffect(() => {
    if (!bounds || !mapRef.current) return;
    const kakao = (window as unknown as { kakao?: typeof window.kakao }).kakao;
    if (!kakao) return;
    const latLngBounds = new kakao.maps.LatLngBounds();
    bounds.forEach((c) =>
      latLngBounds.extend(new kakao.maps.LatLng(c.lat, c.lng)),
    );
    mapRef.current.setBounds(latLngBounds, 60, 60, 60, 60);
  }, [bounds]);

  useEffect(() => {
    if (!error) return;
    console.error("[MapCanvas] Kakao SDK load failed", error);
    console.info(
      "[MapCanvas] 해결: 카카오 Developers → 내 앱 → 플랫폼 → Web 에 " +
        "http://localhost:3000 이 등록되어 있는지 확인하세요.",
    );
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
      onCreate={(map) => {
        mapRef.current = map;
      }}
      onClick={(_map, mouseEvent) => {
        if (pickMode !== "origin") return;
        const latlng = mouseEvent.latLng;
        setOrigin({
          id: "map-pick",
          name: "지도에서 선택한 출발지",
          coord: { lat: latlng.getLat(), lng: latlng.getLng() },
        });
        setPickMode("none");
      }}
    >
      {origin && (
        <MapMarker
          position={origin.coord}
          title={origin.name}
          image={{
            src:
              "data:image/svg+xml;utf8," +
              encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="10" fill="#22c55e" stroke="white" stroke-width="3"/></svg>`,
              ),
            size: { width: 32, height: 32 },
          }}
        />
      )}
      {destination && (
        <MapMarker
          position={destination.coord}
          title={destination.name}
          image={{
            src:
              "data:image/svg+xml;utf8," +
              encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40"><path d="M16 2c-7 0-12 5-12 12 0 9 12 24 12 24s12-15 12-24c0-7-5-12-12-12z" fill="#ef4444" stroke="white" stroke-width="2"/><circle cx="16" cy="14" r="4" fill="white"/></svg>`,
              ),
            size: { width: 32, height: 40 },
            options: { offset: { x: 16, y: 40 } },
          }}
        />
      )}
      {!origin && !destination && (
        <MapMarker position={fallbackCenter} title="서울시청" />
      )}
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

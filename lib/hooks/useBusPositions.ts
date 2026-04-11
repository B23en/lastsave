"use client";

import { useQuery } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import type { LiveBus } from "@/types/trip";

type Response = { buses: LiveBus[] };

export type BusPositionsInput = {
  routeId?: string;
  cityCode?: string;
  routeNm?: string;
  enabled?: boolean;
};

const REFETCH_MS = 15_000;

/**
 * 실시간 버스 위치를 15초 간격으로 polling 한다.
 * 탭이 백그라운드로 가면 polling 을 중단하고, 돌아오면 재개한다.
 */
export function useBusPositions({
  routeId,
  cityCode = "11",
  routeNm,
  enabled = true,
}: BusPositionsInput) {
  const visible = useVisible();

  return useQuery<Response>({
    queryKey: ["bus-positions", cityCode, routeId ?? "default", routeNm ?? ""],
    enabled: enabled && visible,
    refetchInterval: visible ? REFETCH_MS : false,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      const qs = new URLSearchParams();
      qs.set("cityCode", cityCode);
      if (routeId) qs.set("routeId", routeId);
      if (routeNm) qs.set("routeNm", routeNm);
      const res = await fetch(`/api/bus/positions?${qs}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`bus positions failed: ${res.status}`);
      }
      return (await res.json()) as Response;
    },
  });
}

function subscribeVisibility(onChange: () => void): () => void {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

function getVisibilitySnapshot(): boolean {
  return !document.hidden;
}

function getVisibilityServerSnapshot(): boolean {
  return true;
}

function useVisible(): boolean {
  return useSyncExternalStore(
    subscribeVisibility,
    getVisibilitySnapshot,
    getVisibilityServerSnapshot,
  );
}

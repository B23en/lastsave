"use client";

import { useQuery } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import type { LiveBus } from "@/types/trip";
import type { Coord } from "@/types/trip";

type BusResponse = { buses: LiveBus[]; resultCode?: string };
type RegionResponse = { stdgCd: string; fallback: boolean };

export type BusPositionsInput = {
  /** 사용자 위치 — 자동 지역 감지에 사용 */
  originCoord?: Coord | null;
  /** 노선 번호 필터 (예: "N16") */
  rteNo?: string;
  enabled?: boolean;
};

const REFETCH_MS = 15_000;

/**
 * 1) origin 좌표로 /api/region 호출 → stdgCd 자동 결정
 * 2) /api/bus/positions?stdgCd=...&rteNo=... 를 15초마다 polling
 */
export function useBusPositions({
  originCoord,
  rteNo,
  enabled = true,
}: BusPositionsInput) {
  const visible = useVisible();

  const regionQuery = useQuery<RegionResponse>({
    queryKey: [
      "region",
      originCoord?.lat.toFixed(2) ?? "",
      originCoord?.lng.toFixed(2) ?? "",
    ],
    enabled: enabled && !!originCoord,
    staleTime: 300_000,
    queryFn: async () => {
      if (!originCoord) return { stdgCd: "1100000000", fallback: true };
      const res = await fetch(
        `/api/region?lat=${originCoord.lat}&lng=${originCoord.lng}`,
      );
      if (!res.ok) return { stdgCd: "1100000000", fallback: true };
      return (await res.json()) as RegionResponse;
    },
  });

  const stdgCd = regionQuery.data?.stdgCd ?? "1100000000";

  const busQuery = useQuery<BusResponse>({
    queryKey: ["bus-positions", stdgCd, rteNo ?? ""],
    enabled: enabled && visible && !!regionQuery.data,
    refetchInterval: visible ? REFETCH_MS : false,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      const qs = new URLSearchParams();
      qs.set("stdgCd", stdgCd);
      if (rteNo) qs.set("rteNo", rteNo);
      const res = await fetch(`/api/bus/positions?${qs}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`bus positions failed: ${res.status}`);
      }
      return (await res.json()) as BusResponse;
    },
  });

  return { ...busQuery, stdgCd };
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

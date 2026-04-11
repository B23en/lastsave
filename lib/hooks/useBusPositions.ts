"use client";

import { useQuery } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import type { LiveBus } from "@/types/trip";

type Response = { buses: LiveBus[]; resultCode?: string };

export type BusPositionsInput = {
  /** 지자체 법정동 코드 10자리. 기본 서울 1100000000. */
  stdgCd?: string;
  /** 사용자 노출 노선번호 (예: "N16"). 지정 시 해당 노선만 표시. */
  rteNo?: string;
  enabled?: boolean;
};

const REFETCH_MS = 15_000;

/**
 * 실시간 버스 위치를 15초 간격으로 polling 한다.
 * 탭이 백그라운드로 가면 polling 을 중단하고, 돌아오면 재개한다.
 */
export function useBusPositions({
  stdgCd = "1100000000",
  rteNo,
  enabled = true,
}: BusPositionsInput) {
  const visible = useVisible();

  return useQuery<Response>({
    queryKey: ["bus-positions", stdgCd, rteNo ?? ""],
    enabled: enabled && visible,
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

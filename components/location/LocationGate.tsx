"use client";

import { useEffect } from "react";
import {
  positionToPlace,
  useTripStore,
  type LocationStatus,
} from "@/lib/store/useTripStore";

const ACCURACY_THRESHOLD_M = 100;

/**
 * 마운트되자마자 한 번 Geolocation 권한을 요청하고 결과에 따라
 * 스토어의 origin·locationStatus 를 채운다. UI는 렌더하지 않는다
 * (상태 표시는 LocationStatusBadge 를 따로 사용).
 */
export function LocationGate() {
  const origin = useTripStore((s) => s.origin);
  const locationStatus = useTripStore((s) => s.locationStatus);
  const setOrigin = useTripStore((s) => s.setOrigin);
  const setLocationStatus = useTripStore((s) => s.setLocationStatus);

  useEffect(() => {
    if (origin || locationStatus.kind !== "idle") return;

    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setLocationStatus({
        kind: "unavailable",
        reason: "브라우저가 위치 API를 지원하지 않습니다.",
      });
      return;
    }

    setLocationStatus({ kind: "prompting" });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOrigin(positionToPlace(position));
        setLocationStatus({
          kind: "granted",
          accuracyMeters: position.coords.accuracy,
        });
      },
      (err) => {
        setLocationStatus({
          kind: "denied",
          reason: err.message,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 30_000,
      },
    );
  }, [origin, locationStatus.kind, setOrigin, setLocationStatus]);

  return null;
}

export function LocationStatusBadge() {
  const status = useTripStore((s) => s.locationStatus);
  const setPickMode = useTripStore((s) => s.setPickMode);
  const pickMode = useTripStore((s) => s.pickMode);

  const copy = describeStatus(status);
  if (!copy) return null;

  return (
    <div
      className="pointer-events-auto flex items-center gap-3 rounded-full border border-[color:var(--border)] bg-[color:var(--background)]/90 px-4 py-2 text-sm shadow-sm backdrop-blur"
      role="status"
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ background: copy.color }}
      />
      <span className="text-[color:var(--muted-foreground)]">{copy.text}</span>
      {status.kind === "denied" || status.kind === "unavailable" ? (
        <button
          type="button"
          onClick={() =>
            setPickMode(pickMode === "origin" ? "none" : "origin")
          }
          className="rounded-full bg-[color:var(--foreground)] px-3 py-1 text-xs font-semibold text-[color:var(--background)]"
        >
          {pickMode === "origin" ? "취소" : "지도에서 출발지 선택"}
        </button>
      ) : null}
    </div>
  );
}

function describeStatus(
  status: LocationStatus,
): { text: string; color: string } | null {
  switch (status.kind) {
    case "idle":
      return null;
    case "prompting":
      return { text: "위치 권한 요청 중…", color: "var(--warning)" };
    case "granted": {
      if (status.accuracyMeters > ACCURACY_THRESHOLD_M) {
        return {
          text: `위치 정확도 낮음 (±${Math.round(status.accuracyMeters)}m)`,
          color: "var(--warning)",
        };
      }
      return {
        text: `현재 위치 사용 중 (±${Math.round(status.accuracyMeters)}m)`,
        color: "var(--safe)",
      };
    }
    case "denied":
      return {
        text: "위치 권한 거부됨",
        color: "var(--danger)",
      };
    case "unavailable":
      return {
        text: "위치 서비스 사용 불가",
        color: "var(--danger)",
      };
  }
}

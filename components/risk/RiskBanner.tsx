"use client";

import { useEffect, useMemo, useState } from "react";
import { useTripStore } from "@/lib/store/useTripStore";
import { useBusPositions } from "@/lib/hooks/useBusPositions";
import { computeRisk } from "@/lib/domain/risk";
import { estimateBusEta, firstTransitRouteName, type BusEtaResult } from "@/lib/domain/busEta";
import { lastBusEtaSec, nextLastBusDeparture } from "@/lib/domain/lastBus";
import type { RiskLevel } from "@/types/trip";

const TICK_MS = 30_000;

/**
 * 사용자가 버스 카드를 선택했을 때, 막차 놓칠 위험을 상단 배너로 알린다.
 * 실시간 버스 위치 데이터가 있으면 해당 ETA로 리스크를 보정한다.
 * 디버그: URL 쿼리 `?now=23:55` 로 현재 시각을 가상 설정할 수 있다.
 */
export function RiskBanner() {
  const origin = useTripStore((s) => s.origin);
  const compare = useTripStore((s) => s.compare);
  const selectedMode = useTripStore((s) => s.selectedMode);
  const selectMode = useTripStore((s) => s.selectMode);

  const busRouteName =
    compare.status === "success"
      ? firstTransitRouteName(compare.data.bus.legs)
      : undefined;

  const { data: busLive } = useBusPositions({
    originCoord: origin?.coord,
    rteNo: busRouteName,
    enabled: selectedMode === "bus",
  });

  const [now, setNow] = useState<Date>(() => resolveNow());

  useEffect(() => {
    const t = setInterval(() => setNow(resolveNow()), TICK_MS);
    return () => clearInterval(t);
  }, []);

  // 실시간 버스 ETA 계산
  const liveEta = useMemo(() => {
    if (!busLive?.buses?.length || !origin?.coord) return null;
    return estimateBusEta({
      liveBuses: busLive.buses,
      stopCoord: origin.coord,
      routeName: busRouteName,
    });
  }, [busLive, origin?.coord, busRouteName]);

  const level = useMemo<RiskLevel | "ended" | null>(() => {
    if (compare.status !== "success") return null;
    const bus = compare.data.bus;
    if (bus.isServiceEnded || bus.totalDurationSec === 0) return "ended";

    const walkSec = firstWalkSec(bus.legs) ?? bus.walkDurationSec;

    // 리스크 계산은 항상 막차 시각 기반 (liveEta는 배너 표시 전용)
    const busEta = lastBusEtaSec(now);
    const lastBusAt = nextLastBusDeparture(now);
    return computeRisk({
      walkSec,
      busEtaSec: busEta,
      lastBusAt,
      now,
    });
  }, [compare, now, liveEta]);

  if (selectedMode !== "bus" || level === null) return null;
  if (level === "safe") return null;

  const copy = describe(level, now, liveEta);

  return (
    <div
      role="alert"
      className="pointer-events-auto flex w-full max-w-2xl items-center gap-3 rounded-2xl border px-4 py-3 text-sm shadow-lg backdrop-blur"
      style={{
        borderColor: copy.border,
        background: copy.background,
        color: copy.text,
      }}
    >
      <span className="text-xl" aria-hidden>
        {copy.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{copy.title}</p>
        <p className="truncate text-xs opacity-80">{copy.subtitle}</p>
      </div>
      <button
        type="button"
        onClick={() => selectMode("bike")}
        className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold"
        style={{
          background: copy.text,
          color: copy.background,
        }}
      >
        자전거로 전환
      </button>
    </div>
  );
}

type Level = RiskLevel | "ended";
type Copy = {
  icon: string;
  title: string;
  subtitle: string;
  border: string;
  background: string;
  text: string;
};

function describe(
  level: Level,
  now: Date,
  liveEta: BusEtaResult | null,
): Copy {
  const liveHint = liveEta
    ? ` (${liveEta.routeName} 약 ${Math.round(liveEta.distanceMeters)}m, ${Math.ceil(liveEta.etaSec / 60)}분 후 도착)`
    : "";

  switch (level) {
    case "ended":
      return {
        icon: "🛑",
        title: "대중교통 운행 종료",
        subtitle: "막차 시각이 지났습니다. 자전거 경로를 권장합니다.",
        border: "var(--danger)",
        background: "color-mix(in srgb, var(--danger) 15%, var(--background))",
        text: "var(--danger)",
      };
    case "danger":
      return {
        icon: "🚨",
        title: "막차 놓칠 가능성 높음",
        subtitle: `${formatKstClock(now)} 기준 여유 시간이 2분 미만입니다.${liveHint} 자전거 경로를 권장합니다.`,
        border: "var(--danger)",
        background: "color-mix(in srgb, var(--danger) 15%, var(--background))",
        text: "var(--danger)",
      };
    case "caution":
      return {
        icon: "⚠️",
        title: "시간 빠듯함",
        subtitle: `${formatKstClock(now)} 기준 여유 시간이 5분 이내입니다.${liveHint} 자전거도 고려해보세요.`,
        border: "var(--warning)",
        background: "color-mix(in srgb, var(--warning) 15%, var(--background))",
        text: "var(--warning)",
      };
    case "safe":
    default:
      return {
        icon: "✅",
        title: "",
        subtitle: "",
        border: "var(--safe)",
        background: "transparent",
        text: "var(--safe)",
      };
  }
}

function firstWalkSec(legs: { kind: string; durationSec: number }[]): number | null {
  for (const leg of legs) {
    if (leg.kind === "walk") return leg.durationSec;
  }
  return null;
}

function formatKstClock(d: Date): string {
  return d.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  });
}

/**
 * 현재 시각을 결정한다. 개발 편의로 URL `?now=HH:MM` 을 지원한다.
 * 해당 경우 오늘 날짜의 HH:MM KST 로 고정된다.
 */
function resolveNow(): Date {
  if (typeof window === "undefined") return new Date();
  const param = new URLSearchParams(window.location.search).get("now");
  if (!param) return new Date();
  const match = /^(\d{1,2}):(\d{2})$/.exec(param.trim());
  if (!match) return new Date();
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return new Date();
  const today = new Date();
  // 오늘 날짜의 KST HH:MM 을 UTC epoch 로 환산
  const kstY = today.getUTCFullYear();
  const kstM = today.getUTCMonth();
  const kstD = today.getUTCDate();
  // KST = UTC + 9h → UTC hour = KST hour - 9
  return new Date(Date.UTC(kstY, kstM, kstD, hour - 9, minute, 0, 0));
}

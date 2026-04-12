"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTripStore } from "@/lib/store/useTripStore";
import { useBusPositions } from "@/lib/hooks/useBusPositions";
import { computeRisk } from "@/lib/domain/risk";
import { recommend } from "@/lib/domain/recommend";
import { estimateBusEta, firstTransitRouteName, type BusEtaResult } from "@/lib/domain/busEta";
import type { CoachInput } from "@/lib/domain/coachPrompt";
import type {
  BikeRoute,
  BusRoute,
  RecommendationBadge,
  RouteMode,
} from "@/types/trip";

/**
 * 출발지/목적지가 모두 준비되면 /api/route/compare 를 호출하고
 * 버스/자전거 두 카드를 바텀시트로 노출한다.
 */
export function CompareSheet() {
  const origin = useTripStore((s) => s.origin);
  const destination = useTripStore((s) => s.destination);
  const compare = useTripStore((s) => s.compare);
  const selectedMode = useTripStore((s) => s.selectedMode);
  const sheetCollapsed = useTripStore((s) => s.sheetCollapsed);
  const runCompare = useTripStore((s) => s.runCompare);
  const selectMode = useTripStore((s) => s.selectMode);
  const toggleSheet = useTripStore((s) => s.toggleSheet);

  const busRouteName =
    compare.status === "success"
      ? firstTransitRouteName(compare.data.bus.legs)
      : undefined;

  const { data: busLive } = useBusPositions({
    originCoord: origin?.coord,
    rteNo: busRouteName,
    enabled: compare.status === "success" && !compare.data.bus.isServiceEnded,
  });

  // 실시간 버스 ETA
  const liveEta = useMemo<BusEtaResult | null>(() => {
    if (!busLive?.buses?.length || !origin?.coord) return null;
    return estimateBusEta({
      liveBuses: busLive.buses,
      stopCoord: origin.coord,
      routeName: busRouteName,
    });
  }, [busLive, origin?.coord, busRouteName]);

  useEffect(() => {
    if (origin && destination && compare.status === "idle") {
      void runCompare();
    }
  }, [origin, destination, compare.status, runCompare]);

  const riskLevel = useMemo(() => {
    if (compare.status !== "success") return "safe" as const;
    const bus = compare.data.bus;
    return computeRisk({
      walkSec: bus.walkDurationSec,
      busEtaSec: Math.max(bus.totalDurationSec - bus.walkDurationSec, 0),
    });
  }, [compare]);

  const badge = useMemo<RecommendationBadge | null>(() => {
    if (compare.status !== "success") return null;
    const { bus, bike } = compare.data;
    return recommend({ bus, bike, risk: riskLevel });
  }, [compare, riskLevel]);

  if (!origin || !destination) return null;

  return (
    <section
      className="pointer-events-auto mx-auto w-full max-w-2xl rounded-t-3xl border border-[color:var(--border)] bg-[color:var(--background)]/95 shadow-2xl backdrop-blur sm:rounded-3xl"
      aria-live="polite"
      aria-label="경로 비교 결과"
      role="region"
    >
      <button
        type="button"
        onClick={toggleSheet}
        aria-expanded={!sheetCollapsed}
        aria-label={sheetCollapsed ? "시트 펼치기" : "시트 접기"}
        className="flex w-full flex-col items-center gap-1 py-3 transition-colors hover:bg-[color:var(--muted)]/30"
      >
        <span className="h-1.5 w-12 rounded-full bg-[color:var(--muted-foreground)]/40" />
        <span className="text-[11px] text-[color:var(--muted-foreground)]">
          {sheetCollapsed ? "▲ 펼치기" : "▼ 접기"}
        </span>
      </button>

      <div className={sheetCollapsed ? "hidden" : "px-4 pb-4"}>
        <header className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-[color:var(--muted-foreground)]">
              경로 비교
            </p>
            <h2 className="truncate text-base font-semibold">
              {origin.name}{" "}
              <span className="text-[color:var(--muted-foreground)]">→</span>{" "}
              {destination.name}
            </h2>
          </div>
          {compare.status === "success" && (
            <button
              type="button"
              onClick={() => void runCompare()}
              className="shrink-0 rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--muted-foreground)]"
            >
              다시 계산
            </button>
          )}
        </header>

        {(compare.status === "idle" || compare.status === "loading") && (
          <LoadingState />
        )}
        {compare.status === "error" && (
          <ErrorCard
            kind={compare.kind}
            message={compare.message}
            onRetry={() => void runCompare()}
          />
        )}
        {compare.status === "success" && (
          <>
            {badge && badge.winner && (
              <div
                className="mb-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)]/40 p-3 text-sm"
                role="status"
              >
                <span className="text-[color:var(--muted-foreground)]">
                  추천{" "}
                </span>
                <span className="font-semibold">{badge.label}</span>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <BusCard
                route={compare.data.bus}
                recommended={badge?.winner === "bus"}
                selected={selectedMode === "bus"}
                dimmed={selectedMode !== null && selectedMode !== "bus"}
                onSelect={() => selectMode("bus")}
                liveEta={liveEta}
              />
              <BikeCard
                route={compare.data.bike}
                recommended={badge?.winner === "bike"}
                selected={selectedMode === "bike"}
                dimmed={selectedMode !== null && selectedMode !== "bike"}
                onSelect={() => selectMode("bike")}
              />
            </div>
            <CoachSection
              origin={origin}
              destination={destination}
              bus={compare.data.bus}
              bike={compare.data.bike}
              riskLevel={riskLevel}
              liveEta={liveEta}
            />
          </>
        )}
      </div>
    </section>
  );
}

function LoadingState() {
  return (
    <div
      className="flex flex-col items-center gap-3 py-6 text-sm text-[color:var(--muted-foreground)]"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <span
          className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[color:var(--border)] border-t-[color:var(--foreground)]"
          aria-hidden
        />
        <span>경로를 계산하고 있어요…</span>
      </div>
      <p className="text-xs text-[color:var(--muted-foreground)]/80">
        버스 경로와 공영자전거 거치대를 동시에 확인하는 중입니다.
      </p>
      <div className="mt-2 grid w-full gap-3 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-2xl bg-[color:var(--muted)]"
          />
        ))}
      </div>
    </div>
  );
}

type CardProps<R> = {
  route: R;
  recommended: boolean;
  selected: boolean;
  dimmed: boolean;
  onSelect: () => void;
};

function BusCard({
  route,
  recommended,
  selected,
  dimmed,
  onSelect,
  liveEta,
}: CardProps<BusRoute> & { liveEta?: BusEtaResult | null }) {
  if (route.isServiceEnded || route.totalDurationSec === 0) {
    return (
      <article className="rounded-2xl border border-[color:var(--border)] p-4 opacity-70">
        <CardHeader mode="bus" label="버스" recommended={false} />
        <p className="mt-3 text-sm text-[color:var(--muted-foreground)]">
          대중교통 운행이 종료되었습니다. 자전거 경로를 권장합니다.
        </p>
      </article>
    );
  }
  const { className, style } = cardStyle({
    accent: "var(--accent-bus)",
    recommended,
    selected,
    dimmed,
  });
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={className}
      style={style}
    >
      <CardHeader mode="bus" label="버스" recommended={recommended} />
      <BigDuration sec={route.totalDurationSec} />
      <RouteNames legs={route.legs} />
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-[color:var(--muted-foreground)]">
        <dt>도보</dt>
        <dd className="text-right">
          {Math.round(route.walkDurationSec / 60)}분
        </dd>
        <dt>환승</dt>
        <dd className="text-right">{route.transferCount}회</dd>
        {liveEta && (
          <>
            <dt className="text-[color:var(--accent-bus)]">실시간</dt>
            <dd className="text-right text-[color:var(--accent-bus)]">
              {liveEta.etaSec < 60
                ? "곧 도착"
                : `약 ${Math.ceil(liveEta.etaSec / 60)}분 후 도착`}
            </dd>
          </>
        )}
      </dl>
    </button>
  );
}

function BikeCard({
  route,
  recommended,
  selected,
  dimmed,
  onSelect,
}: CardProps<BikeRoute>) {
  if (!route.isAvailable) {
    return (
      <article className="rounded-2xl border border-[color:var(--border)] p-4 opacity-70">
        <CardHeader mode="bike" label="자전거" recommended={false} />
        <p className="mt-3 text-sm text-[color:var(--muted-foreground)]">
          근처에 대여 가능한 거치대를 찾지 못했습니다.
        </p>
      </article>
    );
  }
  const { className, style } = cardStyle({
    accent: "var(--accent-bike)",
    recommended,
    selected,
    dimmed,
  });
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={className}
      style={style}
    >
      <CardHeader mode="bike" label="자전거" recommended={recommended} />
      <BigDuration sec={route.totalDurationSec} />
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-[color:var(--muted-foreground)]">
        <dt>주행</dt>
        <dd className="text-right">
          {Math.round(route.rideDistanceMeters / 100) / 10} km
        </dd>
        <dt>도보</dt>
        <dd className="text-right">
          {Math.round(route.walkDurationSec / 60)}분
        </dd>
        <dt>대여</dt>
        <dd className="truncate text-right">
          {route.fromStationName ?? "-"} · {route.fromStationBikesAvailable}대
        </dd>
        <dt>반납</dt>
        <dd className="truncate text-right">{route.toStationName ?? "-"}</dd>
      </dl>
    </button>
  );
}

function cardStyle({
  accent,
  recommended,
  selected,
  dimmed,
}: {
  accent: string;
  recommended: boolean;
  selected: boolean;
  dimmed: boolean;
}): { className: string; style: React.CSSProperties } {
  const emphasized = selected || recommended;
  const className = [
    "w-full rounded-2xl border p-4 text-left transition-all",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[color:var(--foreground)]/60",
    emphasized ? "shadow-lg" : "",
    dimmed && !selected ? "opacity-50" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const style: React.CSSProperties = {
    borderColor: emphasized ? accent : "var(--border)",
    background: emphasized
      ? `color-mix(in srgb, ${accent} 14%, transparent)`
      : "color-mix(in srgb, var(--muted) 40%, transparent)",
  };

  return { className, style };
}

function CardHeader({
  mode,
  label,
  recommended,
}: {
  mode: RouteMode;
  label: string;
  recommended: boolean;
}) {
  const color =
    mode === "bus" ? "var(--accent-bus)" : "var(--accent-bike)";
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      {recommended && (
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
          style={{ background: color, color: "var(--background)" }}
        >
          추천
        </span>
      )}
    </div>
  );
}

function RouteNames({
  legs,
}: {
  legs: { kind: string; routeName?: string; fromName?: string; toName?: string }[];
}) {
  const transitLegs = legs.filter(
    (l) => (l.kind === "bus" || l.kind === "subway") && l.routeName,
  );
  if (transitLegs.length === 0) return null;

  const icons: Record<string, string> = { bus: "🚌", subway: "🚇" };
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-[color:var(--muted-foreground)]">
      {transitLegs.map((l, i) => (
        <span key={i} className="inline-flex items-center gap-0.5">
          {i > 0 && <span className="mx-0.5">→</span>}
          <span>{icons[l.kind] ?? "🚏"}</span>
          <span className="font-semibold text-[color:var(--foreground)]">
            {l.routeName}
          </span>
        </span>
      ))}
      {transitLegs.length > 0 && transitLegs[0]?.fromName && (
        <span className="ml-1 truncate">
          ({transitLegs[0].fromName}
          {transitLegs.at(-1)?.toName
            ? ` → ${transitLegs.at(-1)!.toName}`
            : ""}
          )
        </span>
      )}
    </div>
  );
}

function BigDuration({ sec }: { sec: number }) {
  const min = Math.round(sec / 60);
  return (
    <div className="mt-3 flex items-baseline gap-2">
      <span className="text-3xl font-bold">{min}</span>
      <span className="text-sm text-[color:var(--muted-foreground)]">분</span>
    </div>
  );
}

/* ── AI 귀가 코칭 ─────────────────────────────────── */

type CoachState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; text: string }
  | { status: "error" };

function CoachSection({
  origin,
  destination,
  bus,
  bike,
  riskLevel,
  liveEta,
}: {
  origin: { name: string };
  destination: { name: string };
  bus: BusRoute;
  bike: BikeRoute;
  riskLevel: "safe" | "caution" | "danger";
  liveEta: BusEtaResult | null;
}) {
  const [state, setState] = useState<CoachState>({ status: "idle" });

  const handleClick = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const now = new Date();
      const currentTime = now.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Seoul",
      });

      const body: CoachInput = {
        originName: origin.name,
        destinationName: destination.name,
        bus: {
          totalDurationSec: bus.totalDurationSec,
          walkDurationSec: bus.walkDurationSec,
          transferCount: bus.transferCount,
          isServiceEnded: bus.isServiceEnded,
        },
        bike: {
          totalDurationSec: bike.totalDurationSec,
          rideDistanceMeters: bike.rideDistanceMeters,
          walkDurationSec: bike.walkDurationSec,
          fromStationBikesAvailable: bike.fromStationBikesAvailable,
          isAvailable: bike.isAvailable,
        },
        riskLevel,
        currentTime,
        liveEtaSec: liveEta?.etaSec,
        liveEtaRouteName: liveEta?.routeName,
      };

      const res = await fetch("/api/ai/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as { coaching: string };
      setState({ status: "done", text: data.coaching });
    } catch {
      setState({ status: "error" });
    }
  }, [origin, destination, bus, bike, riskLevel, liveEta]);

  return (
    <div className="mt-3">
      {state.status === "idle" && (
        <button
          type="button"
          onClick={() => void handleClick()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)]/40 px-4 py-3 text-sm transition-colors hover:bg-[color:var(--muted)]/70"
        >
          <span className="text-base" aria-hidden>
            &#x2728;
          </span>
          <span className="font-medium">AI 귀가 코칭 받기</span>
        </button>
      )}

      {state.status === "loading" && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)]/40 px-4 py-3 text-sm">
          <span
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[color:var(--border)] border-t-[color:var(--foreground)]"
            aria-hidden
          />
          <span className="text-[color:var(--muted-foreground)]">
            AI가 경로를 분석하고 있어요...
          </span>
        </div>
      )}

      {state.status === "done" && (
        <button
          type="button"
          onClick={() => setState({ status: "idle" })}
          className="w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)]/40 p-4 text-left transition-colors hover:bg-[color:var(--muted)]/70"
        >
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[color:var(--muted-foreground)]">
            <span aria-hidden>&#x2728;</span>
            AI 귀가 코칭
          </div>
          <p className="text-sm leading-relaxed">{state.text}</p>
        </button>
      )}

      {state.status === "error" && (
        <div className="flex items-center justify-between rounded-2xl border border-[color:var(--danger)]/50 bg-[color:var(--danger)]/10 px-4 py-3 text-sm">
          <span className="text-[color:var(--danger)]">
            AI 코칭을 불러오지 못했습니다.
          </span>
          <button
            type="button"
            onClick={() => void handleClick()}
            className="rounded-full bg-[color:var(--foreground)] px-3 py-1 text-xs font-semibold text-[color:var(--background)]"
          >
            재시도
          </button>
        </div>
      )}
    </div>
  );
}

/* ── 에러 카드 ─────────────────────────────────────── */

type ErrorKindType = "network" | "server" | "no_route" | "unknown";

const ERROR_COPY: Record<
  ErrorKindType,
  { icon: string; title: string; hint: string }
> = {
  network: {
    icon: "📡",
    title: "네트워크 연결 오류",
    hint: "인터넷 연결을 확인하고 다시 시도해주세요.",
  },
  server: {
    icon: "🔧",
    title: "서버 일시 장애",
    hint: "공공데이터 서버가 응답하지 않습니다. 잠시 후 다시 시도해주세요.",
  },
  no_route: {
    icon: "🗺️",
    title: "경로를 찾을 수 없음",
    hint: "출발지와 목적지 사이의 대중교통 경로가 없습니다. 다른 목적지를 선택해보세요.",
  },
  unknown: {
    icon: "⚠️",
    title: "경로를 불러오지 못했습니다",
    hint: "잠시 후 다시 시도해주세요.",
  },
};

function ErrorCard({
  kind,
  message,
  onRetry,
}: {
  kind: ErrorKindType;
  message: string;
  onRetry: () => void;
}) {
  const copy = ERROR_COPY[kind];
  return (
    <div className="rounded-2xl border border-[color:var(--danger)]/50 bg-[color:var(--danger)]/10 p-4 text-sm">
      <p className="flex items-center gap-2 font-medium text-[color:var(--danger)]">
        <span aria-hidden>{copy.icon}</span>
        {copy.title}
      </p>
      <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
        {copy.hint}
      </p>
      {process.env.NODE_ENV === "development" && (
        <p className="mt-1 text-[10px] text-[color:var(--muted-foreground)]/70">
          {message}
        </p>
      )}
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded-full bg-[color:var(--foreground)] px-3 py-1 text-xs font-semibold text-[color:var(--background)]"
      >
        다시 시도
      </button>
    </div>
  );
}

"use client";

import { useEffect, useMemo } from "react";
import { useTripStore } from "@/lib/store/useTripStore";
import { computeRisk } from "@/lib/domain/risk";
import { recommend } from "@/lib/domain/recommend";
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

  useEffect(() => {
    if (origin && destination && compare.status === "idle") {
      void runCompare();
    }
  }, [origin, destination, compare.status, runCompare]);

  const badge = useMemo<RecommendationBadge | null>(() => {
    if (compare.status !== "success") return null;
    const { bus, bike } = compare.data;
    const busWalkSec = bus.walkDurationSec;
    const busEtaSec = bus.totalDurationSec - bus.walkDurationSec;
    const risk = computeRisk({
      walkSec: busWalkSec,
      busEtaSec: Math.max(busEtaSec, 0),
    });
    return recommend({ bus, bike, risk });
  }, [compare]);

  if (!origin || !destination) return null;

  return (
    <section
      className="pointer-events-auto mx-auto w-full max-w-2xl rounded-t-3xl border border-[color:var(--border)] bg-[color:var(--background)]/95 shadow-2xl backdrop-blur sm:rounded-3xl"
      aria-live="polite"
    >
      <button
        type="button"
        onClick={toggleSheet}
        aria-expanded={!sheetCollapsed}
        aria-label={sheetCollapsed ? "시트 펼치기" : "시트 접기"}
        className="flex w-full items-center justify-center py-2"
      >
        <span className="h-1.5 w-10 rounded-full bg-[color:var(--border)]" />
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
              />
              <BikeCard
                route={compare.data.bike}
                recommended={badge?.winner === "bike"}
                selected={selectedMode === "bike"}
                dimmed={selectedMode !== null && selectedMode !== "bike"}
                onSelect={() => selectMode("bike")}
              />
            </div>
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
}: CardProps<BusRoute>) {
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
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-[color:var(--muted-foreground)]">
        <dt>도보</dt>
        <dd className="text-right">
          {Math.round(route.walkDurationSec / 60)}분
        </dd>
        <dt>환승</dt>
        <dd className="text-right">{route.transferCount}회</dd>
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

function BigDuration({ sec }: { sec: number }) {
  const min = Math.round(sec / 60);
  return (
    <div className="mt-3 flex items-baseline gap-2">
      <span className="text-3xl font-bold">{min}</span>
      <span className="text-sm text-[color:var(--muted-foreground)]">분</span>
    </div>
  );
}

function ErrorCard({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--danger)]/50 bg-[color:var(--danger)]/10 p-4 text-sm">
      <p className="font-medium text-[color:var(--danger)]">
        경로를 불러오지 못했습니다
      </p>
      <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
        {message}
      </p>
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

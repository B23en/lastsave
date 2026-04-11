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
  const runCompare = useTripStore((s) => s.runCompare);

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
    <section className="pointer-events-auto mx-auto w-full max-w-2xl rounded-t-3xl border border-[color:var(--border)] bg-[color:var(--background)]/95 p-4 shadow-2xl backdrop-blur sm:rounded-3xl">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-[color:var(--muted-foreground)]">
            경로 비교
          </p>
          <h2 className="text-base font-semibold">
            {origin.name}{" "}
            <span className="text-[color:var(--muted-foreground)]">→</span>{" "}
            {destination.name}
          </h2>
        </div>
        {compare.status === "success" && (
          <button
            type="button"
            onClick={() => void runCompare()}
            className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--muted-foreground)]"
          >
            다시 계산
          </button>
        )}
      </header>

      {compare.status === "loading" && <Skeleton />}
      {compare.status === "error" && (
        <ErrorCard message={compare.message} onRetry={() => void runCompare()} />
      )}
      {compare.status === "success" && (
        <>
          {badge && badge.winner && (
            <div
              className="mb-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)]/40 p-3 text-sm"
              role="status"
            >
              <span className="text-[color:var(--muted-foreground)]">추천 </span>
              <span className="font-semibold">{badge.label}</span>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <BusCard
              route={compare.data.bus}
              recommended={badge?.winner === "bus"}
            />
            <BikeCard
              route={compare.data.bike}
              recommended={badge?.winner === "bike"}
            />
          </div>
        </>
      )}
    </section>
  );
}

function BusCard({
  route,
  recommended,
}: {
  route: BusRoute;
  recommended: boolean;
}) {
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
  return (
    <article
      className={`rounded-2xl border p-4 transition-colors ${
        recommended
          ? "border-[color:var(--accent-bus)] bg-[color:var(--accent-bus)]/10"
          : "border-[color:var(--border)] bg-[color:var(--muted)]/40"
      }`}
    >
      <CardHeader mode="bus" label="버스" recommended={recommended} />
      <BigDuration sec={route.totalDurationSec} />
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-[color:var(--muted-foreground)]">
        <dt>도보</dt>
        <dd className="text-right">{Math.round(route.walkDurationSec / 60)}분</dd>
        <dt>환승</dt>
        <dd className="text-right">{route.transferCount}회</dd>
      </dl>
    </article>
  );
}

function BikeCard({
  route,
  recommended,
}: {
  route: BikeRoute;
  recommended: boolean;
}) {
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
  return (
    <article
      className={`rounded-2xl border p-4 transition-colors ${
        recommended
          ? "border-[color:var(--accent-bike)] bg-[color:var(--accent-bike)]/10"
          : "border-[color:var(--border)] bg-[color:var(--muted)]/40"
      }`}
    >
      <CardHeader mode="bike" label="자전거" recommended={recommended} />
      <BigDuration sec={route.totalDurationSec} />
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-[color:var(--muted-foreground)]">
        <dt>주행</dt>
        <dd className="text-right">
          {Math.round(route.rideDistanceMeters / 100) / 10} km
        </dd>
        <dt>도보</dt>
        <dd className="text-right">{Math.round(route.walkDurationSec / 60)}분</dd>
        <dt>대여</dt>
        <dd className="text-right">
          {route.fromStationName ?? "-"} · {route.fromStationBikesAvailable}대
        </dd>
        <dt>반납</dt>
        <dd className="text-right">{route.toStationName ?? "-"}</dd>
      </dl>
    </article>
  );
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
          style={{
            background: color,
            color: "var(--background)",
          }}
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

function Skeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="h-32 animate-pulse rounded-2xl bg-[color:var(--muted)]"
        />
      ))}
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
      <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">{message}</p>
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

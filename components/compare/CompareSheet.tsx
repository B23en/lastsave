"use client";

import { useEffect } from "react";
import { useTripStore } from "@/lib/store/useTripStore";
import type { BikeRoute, BusRoute } from "@/types/trip";

/**
 * 출발지/목적지가 모두 준비되면 /api/route/compare 를 호출하고
 * 결과를 바텀시트 형태로 노출한다. 자전거 카드는 P6 에서 채워진다.
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
        <div className="grid gap-3 sm:grid-cols-2">
          <BusCard route={compare.data.bus} />
          <BikePlaceholder bike={compare.data.bike} />
        </div>
      )}
    </section>
  );
}

function BusCard({ route }: { route: BusRoute | null }) {
  if (!route || route.isServiceEnded) {
    return (
      <article className="rounded-2xl border border-[color:var(--border)] p-4 opacity-70">
        <Header mode="bus" label="버스" />
        <p className="mt-3 text-sm text-[color:var(--muted-foreground)]">
          대중교통 운행이 종료되었습니다. 자전거 경로를 권장합니다.
        </p>
      </article>
    );
  }
  const totalMin = Math.round(route.totalDurationSec / 60);
  const walkMin = Math.round(route.walkDurationSec / 60);
  return (
    <article className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)]/40 p-4">
      <Header mode="bus" label="버스" />
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold">{totalMin}</span>
        <span className="text-sm text-[color:var(--muted-foreground)]">분</span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-[color:var(--muted-foreground)]">
        <dt>도보</dt>
        <dd className="text-right">{walkMin}분</dd>
        <dt>환승</dt>
        <dd className="text-right">{route.transferCount}회</dd>
      </dl>
    </article>
  );
}

function BikePlaceholder({ bike }: { bike: BikeRoute | null }) {
  return (
    <article className="rounded-2xl border border-dashed border-[color:var(--border)] p-4 text-sm text-[color:var(--muted-foreground)]">
      <Header mode="bike" label="자전거" />
      <p className="mt-3">
        {bike ? "자전거 경로 준비됨" : "자전거 경로는 다음 단계(P6)에서 추가됩니다."}
      </p>
    </article>
  );
}

function Header({ mode, label }: { mode: "bus" | "bike"; label: string }) {
  const color = mode === "bus" ? "var(--accent-bus)" : "var(--accent-bike)";
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
        <span className="text-sm font-medium">{label}</span>
      </div>
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

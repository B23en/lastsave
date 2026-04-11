export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <section className="max-w-xl text-center sm:text-left">
        <span className="inline-flex items-center rounded-full bg-[color:var(--muted)] px-3 py-1 text-xs font-medium uppercase tracking-wider text-[color:var(--muted-foreground)]">
          MVP · 2026 전국 통합데이터 활용 공모전
        </span>
        <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          막차세이브
          <span className="block text-[color:var(--muted-foreground)] text-xl font-medium mt-2">
            LastSave — 늦은 밤, 가장 빠른 귀갓길을 찾아드립니다.
          </span>
        </h1>
        <p className="mt-6 text-base leading-7 text-[color:var(--muted-foreground)]">
          탑승 예정인 버스를 그대로 탈까? 근처 공영자전거로 갈아탈까?
          실시간 공공데이터로 두 경로를 한 번에 비교하고, 막차 놓침 리스크까지
          알려드립니다.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] px-4 py-2 text-sm">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: "var(--accent-bus)" }}
            />
            실시간 버스 위치
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] px-4 py-2 text-sm">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: "var(--accent-bike)" }}
            />
            공영자전거 가용성
          </div>
        </div>
      </section>
    </main>
  );
}

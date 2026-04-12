"use client";

export function DataSourceFooter() {
  return (
    <footer
      className="pointer-events-auto mx-auto max-w-2xl rounded-t-xl bg-[color:var(--background)]/90 px-4 py-2 text-center text-[10px] leading-relaxed text-[color:var(--muted-foreground)] backdrop-blur"
      aria-label="데이터 출처"
    >
      <span className="font-medium">공공데이터 출처</span>{" "}
      행정안전부 한국지역정보개발원 ·{" "}
      <span className="underline decoration-dotted">
        전국 공영자전거 실시간 정보
      </span>{" "}
      ·{" "}
      <span className="underline decoration-dotted">
        초정밀버스 위치 실시간 정보
      </span>{" "}
      | ODsay LAB · 대중교통 경로 | 카카오 Developers · 지도 및 검색
    </footer>
  );
}

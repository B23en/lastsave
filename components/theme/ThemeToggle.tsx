"use client";

import { useTheme } from "next-themes";

/**
 * 테마 토글 버튼. hydration mismatch 를 피하기 위해 부모에서
 * dynamic({ ssr: false }) 로 로드한다.
 */
export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const current = theme === "system" ? resolvedTheme : theme;
  const isDark = current === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--background)]/85 text-lg shadow-sm backdrop-blur transition-colors hover:bg-[color:var(--muted)]"
    >
      <span aria-hidden>{isDark ? "🌙" : "☀️"}</span>
    </button>
  );
}

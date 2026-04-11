"use client";

import dynamic from "next/dynamic";

const ThemeToggle = dynamic(
  () => import("./ThemeToggle").then((m) => m.ThemeToggle),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden
        className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--background)]/85 text-lg shadow-sm backdrop-blur"
      >
        <span className="h-2 w-2 rounded-full bg-[color:var(--muted-foreground)]" />
      </div>
    ),
  },
);

export default ThemeToggle;

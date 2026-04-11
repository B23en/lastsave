"use client";

import dynamic from "next/dynamic";

const MapCanvas = dynamic(
  () => import("./MapCanvas").then((m) => m.MapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[color:var(--muted)] text-sm text-[color:var(--muted-foreground)]">
        지도를 준비하고 있어요…
      </div>
    ),
  },
);

export default MapCanvas;

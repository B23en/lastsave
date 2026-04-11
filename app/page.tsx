import ClientMapCanvas from "@/components/map/ClientMapCanvas";

export default function Home() {
  return (
    <main className="relative flex flex-1">
      <div className="absolute inset-0">
        <ClientMapCanvas />
      </div>

      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center p-4">
        <div className="pointer-events-auto rounded-full border border-[color:var(--border)] bg-[color:var(--background)]/85 px-4 py-2 text-sm font-semibold shadow-sm backdrop-blur">
          막차세이브{" "}
          <span className="text-[color:var(--muted-foreground)]">
            · LastSave
          </span>
        </div>
      </header>
    </main>
  );
}

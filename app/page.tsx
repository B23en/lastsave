import ClientMapCanvas from "@/components/map/ClientMapCanvas";
import {
  LocationGate,
  LocationStatusBadge,
} from "@/components/location/LocationGate";
import { SearchBar } from "@/components/search/SearchBar";
import { CompareSheet } from "@/components/compare/CompareSheet";
import { RiskBanner } from "@/components/risk/RiskBanner";

export default function Home() {
  return (
    <main className="relative flex flex-1">
      <div className="absolute inset-0">
        <ClientMapCanvas />
      </div>

      <LocationGate />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col items-center gap-3 p-4">
        <div className="pointer-events-auto rounded-full border border-[color:var(--border)] bg-[color:var(--background)]/85 px-4 py-2 text-sm font-semibold shadow-sm backdrop-blur">
          막차세이브{" "}
          <span className="text-[color:var(--muted-foreground)]">
            · LastSave
          </span>
        </div>
        <SearchBar />
        <LocationStatusBadge />
        <RiskBanner />
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center p-4 pb-6">
        <CompareSheet />
      </div>
    </main>
  );
}

"use client";

import { create } from "zustand";
import type { BikeRoute, BusRoute, Coord, RouteMode } from "@/types/trip";

export type Place = {
  id: string;
  name: string;
  address?: string;
  category?: string;
  coord: Coord;
};

export type LocationStatus =
  | { kind: "idle" }
  | { kind: "prompting" }
  | { kind: "granted"; accuracyMeters: number }
  | { kind: "denied"; reason?: string }
  | { kind: "unavailable"; reason?: string };

export type CompareData = {
  bus: BusRoute;
  bike: BikeRoute;
};

export type ErrorKind = "network" | "server" | "no_route" | "unknown";

export type CompareState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: CompareData; fetchedAt: number }
  | { status: "error"; kind: ErrorKind; message: string };

export type TripState = {
  origin: Place | null;
  destination: Place | null;
  locationStatus: LocationStatus;
  pickMode: "none" | "origin";
  compare: CompareState;
  selectedMode: RouteMode | null;
  sheetCollapsed: boolean;

  setOrigin: (place: Place | null) => void;
  setDestination: (place: Place | null) => void;
  setLocationStatus: (status: LocationStatus) => void;
  setPickMode: (mode: "none" | "origin") => void;
  selectMode: (mode: RouteMode) => void;
  toggleSheet: () => void;
  runCompare: () => Promise<void>;
  resetTrip: () => void;
};

export const useTripStore = create<TripState>((set, get) => ({
  origin: null,
  destination: null,
  locationStatus: { kind: "idle" },
  pickMode: "none",
  compare: { status: "idle" },
  selectedMode: null,
  sheetCollapsed: false,

  setOrigin: (place) =>
    set({
      origin: place,
      compare: { status: "idle" },
      selectedMode: null,
    }),
  setDestination: (place) =>
    set({
      destination: place,
      compare: { status: "idle" },
      selectedMode: null,
    }),
  setLocationStatus: (status) => set({ locationStatus: status }),
  setPickMode: (mode) => set({ pickMode: mode }),
  selectMode: (mode) =>
    set((s) => ({ selectedMode: s.selectedMode === mode ? null : mode })),
  toggleSheet: () => set((s) => ({ sheetCollapsed: !s.sheetCollapsed })),

  runCompare: async () => {
    const { origin, destination } = get();
    if (!origin || !destination) return;

    set({ compare: { status: "loading" } });
    try {
      const qs = new URLSearchParams({
        startX: String(origin.coord.lng),
        startY: String(origin.coord.lat),
        endX: String(destination.coord.lng),
        endY: String(destination.coord.lat),
      });
      const res = await fetch(`/api/route/compare?${qs}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`compare failed: ${res.status}`);
      }
      const data = (await res.json()) as CompareData;
      set({
        compare: { status: "success", data, fetchedAt: Date.now() },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "알 수 없는 오류";
      const kind: ErrorKind =
        message.includes("fetch") || message.includes("network")
          ? "network"
          : message.includes("502") || message.includes("500")
            ? "server"
            : "unknown";
      set({ compare: { status: "error", kind, message } });
    }
  },

  resetTrip: () =>
    set({
      origin: null,
      destination: null,
      pickMode: "none",
      compare: { status: "idle" },
      selectedMode: null,
      sheetCollapsed: false,
    }),
}));

/**
 * GeolocationPosition 을 Place로 변환한다.
 */
export function positionToPlace(position: GeolocationPosition): Place {
  return {
    id: "current-location",
    name: "현재 위치",
    coord: {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    },
  };
}

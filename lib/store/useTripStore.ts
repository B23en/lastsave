"use client";

import { create } from "zustand";
import type { BikeRoute, BusRoute, Coord } from "@/types/trip";

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

export type CompareState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: CompareData; fetchedAt: number }
  | { status: "error"; message: string };

export type TripState = {
  origin: Place | null;
  destination: Place | null;
  locationStatus: LocationStatus;
  pickMode: "none" | "origin";
  compare: CompareState;

  setOrigin: (place: Place | null) => void;
  setDestination: (place: Place | null) => void;
  setLocationStatus: (status: LocationStatus) => void;
  setPickMode: (mode: "none" | "origin") => void;
  runCompare: () => Promise<void>;
  resetTrip: () => void;
};

export const useTripStore = create<TripState>((set, get) => ({
  origin: null,
  destination: null,
  locationStatus: { kind: "idle" },
  pickMode: "none",
  compare: { status: "idle" },

  setOrigin: (place) => set({ origin: place, compare: { status: "idle" } }),
  setDestination: (place) =>
    set({ destination: place, compare: { status: "idle" } }),
  setLocationStatus: (status) => set({ locationStatus: status }),
  setPickMode: (mode) => set({ pickMode: mode }),

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
      set({
        compare: {
          status: "error",
          message: err instanceof Error ? err.message : "알 수 없는 오류",
        },
      });
    }
  },

  resetTrip: () =>
    set({
      origin: null,
      destination: null,
      pickMode: "none",
      compare: { status: "idle" },
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

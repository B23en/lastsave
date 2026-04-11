"use client";

import { create } from "zustand";
import type { Coord } from "@/types/trip";

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

export type TripState = {
  origin: Place | null;
  destination: Place | null;
  locationStatus: LocationStatus;
  /** 사용자가 지도 탭으로 출발지를 직접 고른 모드인지 */
  pickMode: "none" | "origin";

  setOrigin: (place: Place | null) => void;
  setDestination: (place: Place | null) => void;
  setLocationStatus: (status: LocationStatus) => void;
  setPickMode: (mode: "none" | "origin") => void;
  resetTrip: () => void;
};

export const useTripStore = create<TripState>((set) => ({
  origin: null,
  destination: null,
  locationStatus: { kind: "idle" },
  pickMode: "none",

  setOrigin: (place) => set({ origin: place }),
  setDestination: (place) => set({ destination: place }),
  setLocationStatus: (status) => set({ locationStatus: status }),
  setPickMode: (mode) => set({ pickMode: mode }),
  resetTrip: () =>
    set({
      origin: null,
      destination: null,
      pickMode: "none",
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

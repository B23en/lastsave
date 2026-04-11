export type Coord = {
  lat: number;
  lng: number;
};

export type RiskLevel = "safe" | "caution" | "danger";

export type RouteMode = "bus" | "bike";

export type RouteLeg = {
  kind: "walk" | "bus" | "bike" | "subway";
  fromName?: string;
  toName?: string;
  distanceMeters: number;
  durationSec: number;
};

export type BusRoute = {
  mode: "bus";
  totalDurationSec: number;
  walkDurationSec: number;
  transferCount: number;
  legs: RouteLeg[];
  lastDepartureAt?: Date;
  isServiceEnded: boolean;
  polyline: Coord[];
};

export type BikeRoute = {
  mode: "bike";
  totalDurationSec: number;
  rideDurationSec: number;
  walkDurationSec: number;
  rideDistanceMeters: number;
  fromStationId?: string;
  fromStationName?: string;
  fromStationBikesAvailable: number;
  toStationId?: string;
  toStationName?: string;
  toStationDocksAvailable: number;
  isAvailable: boolean;
  polyline: Coord[];
};

export type CompareResult = {
  bus: BusRoute;
  bike: BikeRoute;
  recommendation: RecommendationBadge;
};

export type RecommendationBadge = {
  winner: RouteMode | null;
  reason: "faster" | "safer" | "only_option" | "tie";
  label: string;
};

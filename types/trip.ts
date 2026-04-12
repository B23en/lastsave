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
  /** bus/subway 인 경우 노선명 (예: "N16", "2호선") */
  routeName?: string;
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
  legs: RouteLeg[];
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

export type LiveBus = {
  routeId: string;
  routeName: string;
  vehicleNo: string;
  stationName?: string;
  lat: number;
  lng: number;
  /** 운행 속도 (km/h). 실시간 API에서 제공. */
  oprSpd?: number;
};

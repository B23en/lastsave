import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import type { OdsayPubTransResponse } from "@/types/odsay";
import type { KakaoKeywordSearchResponse } from "@/types/kakao";
import type { PbdoStationAvailabilityResponse } from "@/types/pbdo";
import type { RealtimeBusLocationResponse } from "@/types/realtimeBus";

const FIXTURE_DIR = path.resolve(process.cwd(), "tests/fixtures");

async function loadJson<T>(name: string): Promise<T> {
  const buf = await readFile(path.join(FIXTURE_DIR, name), "utf-8");
  return JSON.parse(buf) as T;
}

export function loadRealtimeBusLocationsFixture(): Promise<RealtimeBusLocationResponse> {
  return loadJson<RealtimeBusLocationResponse>(
    "realtime-bus-locations.json",
  );
}

export function loadPbdoAvailabilityFixture(): Promise<PbdoStationAvailabilityResponse> {
  return loadJson<PbdoStationAvailabilityResponse>("pbdo-availability.json");
}

export function loadOdsayRouteFixture(): Promise<OdsayPubTransResponse> {
  return loadJson<OdsayPubTransResponse>("odsay-route.json");
}

export function loadKakaoKeywordSearchFixture(): Promise<KakaoKeywordSearchResponse> {
  return loadJson<KakaoKeywordSearchResponse>("kakao-keyword-search.json");
}

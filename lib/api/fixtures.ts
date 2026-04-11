import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import type { TagoBikeResponse, TagoBusResponse } from "@/types/tago";
import type { OdsayPubTransResponse } from "@/types/odsay";

const FIXTURE_DIR = path.resolve(process.cwd(), "tests/fixtures");

async function loadJson<T>(name: string): Promise<T> {
  const buf = await readFile(path.join(FIXTURE_DIR, name), "utf-8");
  return JSON.parse(buf) as T;
}

export function loadBusPositionsFixture(): Promise<TagoBusResponse> {
  return loadJson<TagoBusResponse>("tago-bus-positions.json");
}

export function loadBikeStationsFixture(): Promise<TagoBikeResponse> {
  return loadJson<TagoBikeResponse>("tago-bike-stations.json");
}

export function loadOdsayRouteFixture(): Promise<OdsayPubTransResponse> {
  return loadJson<OdsayPubTransResponse>("odsay-route.json");
}

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isUpstreamBlocked,
  markUpstreamFailure,
  resetCircuitBreakers,
} from "@/lib/api/http";

describe("upstream circuit breaker", () => {
  beforeEach(() => {
    resetCircuitBreakers();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-12T14:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    resetCircuitBreakers();
  });

  it("reports blocked after a failure is marked", () => {
    expect(isUpstreamBlocked("pbdo")).toBe(false);
    markUpstreamFailure("pbdo", 60_000);
    expect(isUpstreamBlocked("pbdo")).toBe(true);
  });

  it("scopes independently per service", () => {
    markUpstreamFailure("pbdo", 60_000);
    expect(isUpstreamBlocked("pbdo")).toBe(true);
    expect(isUpstreamBlocked("tago")).toBe(false);
  });

  it("auto-unblocks once cooldown passes", () => {
    markUpstreamFailure("pbdo", 60_000);
    vi.advanceTimersByTime(59_999);
    expect(isUpstreamBlocked("pbdo")).toBe(true);
    vi.advanceTimersByTime(2);
    expect(isUpstreamBlocked("pbdo")).toBe(false);
  });

  it("resetCircuitBreakers wipes all entries", () => {
    markUpstreamFailure("pbdo", 60_000);
    markUpstreamFailure("odsay", 60_000);
    resetCircuitBreakers();
    expect(isUpstreamBlocked("pbdo")).toBe(false);
    expect(isUpstreamBlocked("odsay")).toBe(false);
  });
});

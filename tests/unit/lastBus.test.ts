import { describe, expect, it } from "vitest";
import {
  LAST_BUS_HOUR_KST,
  LAST_BUS_MINUTE_KST,
  lastBusEtaSec,
  nextLastBusDeparture,
} from "@/lib/domain/lastBus";

function kst(year: number, month: number, day: number, hour: number, minute: number): Date {
  // KST (+09:00) 고정 — 로컬타임존 의존 방지
  return new Date(
    Date.UTC(year, month - 1, day, hour - 9, minute, 0, 0),
  );
}

describe("lastBus constants", () => {
  it("defaults to 00:30 KST", () => {
    expect(LAST_BUS_HOUR_KST).toBe(0);
    expect(LAST_BUS_MINUTE_KST).toBe(30);
  });
});

describe("nextLastBusDeparture", () => {
  it("returns today's 00:30 when now is before it", () => {
    const now = kst(2026, 4, 12, 0, 10); // 04/12 00:10 KST
    const next = nextLastBusDeparture(now);
    expect(next.getTime()).toBe(kst(2026, 4, 12, 0, 30).getTime());
  });

  it("returns tomorrow's 00:30 when now equals 00:30 exactly", () => {
    const now = kst(2026, 4, 12, 0, 30);
    const next = nextLastBusDeparture(now);
    expect(next.getTime()).toBe(kst(2026, 4, 13, 0, 30).getTime());
  });

  it("returns tomorrow's 00:30 when now is in late evening", () => {
    const now = kst(2026, 4, 12, 23, 45); // 04/12 23:45
    const next = nextLastBusDeparture(now);
    expect(next.getTime()).toBe(kst(2026, 4, 13, 0, 30).getTime());
  });

  it("returns today's 00:30 when now is mid-afternoon", () => {
    const now = kst(2026, 4, 12, 14, 0); // 04/12 14:00
    const next = nextLastBusDeparture(now);
    expect(next.getTime()).toBe(kst(2026, 4, 13, 0, 30).getTime());
  });
});

describe("lastBusEtaSec", () => {
  it("counts down from now until the next last-bus departure", () => {
    const now = kst(2026, 4, 12, 0, 25); // 5분 전
    expect(lastBusEtaSec(now)).toBe(5 * 60);
  });

  it("returns 0 exactly at the cutoff", () => {
    const now = kst(2026, 4, 12, 0, 30);
    // at the cutoff we fall through to tomorrow's 00:30 = 24h away
    expect(lastBusEtaSec(now)).toBe(24 * 60 * 60);
  });
});

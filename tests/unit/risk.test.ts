import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computeRisk } from "@/lib/domain/risk";

describe("computeRisk", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-12T14:30:00+09:00")); // 23:30 KST
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("slack classification", () => {
    it("slack > 300s → safe", () => {
      expect(computeRisk({ walkSec: 60, busEtaSec: 420 })).toBe("safe");
    });

    it("slack exactly 301s → safe", () => {
      expect(computeRisk({ walkSec: 0, busEtaSec: 301 })).toBe("safe");
    });

    it("slack exactly 300s → caution (5분 경계는 주의)", () => {
      expect(computeRisk({ walkSec: 0, busEtaSec: 300 })).toBe("caution");
    });

    it("slack 200s → caution", () => {
      expect(computeRisk({ walkSec: 100, busEtaSec: 300 })).toBe("caution");
    });

    it("slack exactly 120s → caution (2분 경계는 주의)", () => {
      expect(computeRisk({ walkSec: 0, busEtaSec: 120 })).toBe("caution");
    });

    it("slack 119s → danger (2분 미만)", () => {
      expect(computeRisk({ walkSec: 0, busEtaSec: 119 })).toBe("danger");
    });

    it("slack 0 → danger", () => {
      expect(computeRisk({ walkSec: 300, busEtaSec: 300 })).toBe("danger");
    });

    it("walk longer than bus ETA → danger", () => {
      expect(computeRisk({ walkSec: 400, busEtaSec: 200 })).toBe("danger");
    });
  });

  describe("last bus cutoff", () => {
    it("lastBusAt in the future with ample slack → safe", () => {
      const future = new Date("2026-04-12T14:50:00+09:00"); // 23:50 KST
      expect(
        computeRisk({ walkSec: 60, busEtaSec: 420, lastBusAt: future }),
      ).toBe("safe");
    });

    it("lastBusAt already passed → danger regardless of slack", () => {
      const past = new Date("2026-04-12T14:29:59+09:00"); // 1s before now
      expect(
        computeRisk({ walkSec: 60, busEtaSec: 9_999, lastBusAt: past }),
      ).toBe("danger");
    });

    it("lastBusAt exactly now → danger (no safety margin)", () => {
      const atNow = new Date("2026-04-12T14:30:00+09:00");
      expect(
        computeRisk({ walkSec: 10, busEtaSec: 600, lastBusAt: atNow }),
      ).toBe("danger");
    });
  });

  describe("explicit now override", () => {
    it("respects caller-supplied `now` for deterministic callers", () => {
      const now = new Date("2026-04-12T14:30:00+09:00");
      const past = new Date("2026-04-12T14:25:00+09:00");
      expect(
        computeRisk({
          walkSec: 60,
          busEtaSec: 420,
          lastBusAt: past,
          now,
        }),
      ).toBe("danger");
    });
  });
});

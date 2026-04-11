import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cacheClear, cacheHas, memoCache } from "@/lib/api/cache";

describe("memoCache", () => {
  beforeEach(() => {
    cacheClear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-12T14:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("invokes loader on miss and stores the value", async () => {
    const loader = vi.fn(async () => ({ n: 1 }));

    const first = await memoCache("k1", 15_000, loader);

    expect(first).toEqual({ n: 1 });
    expect(loader).toHaveBeenCalledTimes(1);
    expect(cacheHas("k1")).toBe(true);
  });

  it("returns cached value within TTL without calling loader again", async () => {
    const loader = vi.fn(async () => Math.random());

    const a = await memoCache("k2", 15_000, loader);
    vi.advanceTimersByTime(14_999);
    const b = await memoCache("k2", 15_000, loader);

    expect(a).toBe(b);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("reloads after TTL expires", async () => {
    const loader = vi
      .fn()
      .mockResolvedValueOnce("first")
      .mockResolvedValueOnce("second");

    const a = await memoCache("k3", 15_000, loader);
    vi.advanceTimersByTime(15_001);
    const b = await memoCache("k3", 15_000, loader);

    expect(a).toBe("first");
    expect(b).toBe("second");
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("cacheHas reports false after expiry", async () => {
    await memoCache("k4", 1_000, async () => "v");
    expect(cacheHas("k4")).toBe(true);

    vi.advanceTimersByTime(1_001);
    expect(cacheHas("k4")).toBe(false);
  });

  it("cacheClear removes all entries", async () => {
    await memoCache("k5", 60_000, async () => "a");
    await memoCache("k6", 60_000, async () => "b");
    expect(cacheHas("k5")).toBe(true);
    expect(cacheHas("k6")).toBe(true);

    cacheClear();

    expect(cacheHas("k5")).toBe(false);
    expect(cacheHas("k6")).toBe(false);
  });

  it("propagates loader rejections without caching", async () => {
    const loader = vi.fn(async () => {
      throw new Error("boom");
    });

    await expect(memoCache("k7", 15_000, loader)).rejects.toThrow("boom");
    expect(cacheHas("k7")).toBe(false);
  });
});

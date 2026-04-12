import { describe, it, expect } from "vitest";
import { buildCoachPrompt, type CoachInput } from "@/lib/domain/coachPrompt";

const BASE_INPUT: CoachInput = {
  originName: "시청역",
  destinationName: "홍대입구역",
  bus: {
    totalDurationSec: 1380,
    walkDurationSec: 300,
    transferCount: 1,
    isServiceEnded: false,
  },
  bike: {
    totalDurationSec: 1080,
    rideDistanceMeters: 3200,
    walkDurationSec: 240,
    fromStationBikesAvailable: 3,
    isAvailable: true,
  },
  riskLevel: "caution",
  currentTime: "23:47",
};

describe("buildCoachPrompt", () => {
  it("returns system and user messages", () => {
    const messages = buildCoachPrompt(BASE_INPUT);
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("system");
    expect(messages[1].role).toBe("user");
  });

  it("system message instructs Korean 2-3 sentence coaching", () => {
    const messages = buildCoachPrompt(BASE_INPUT);
    const system = messages[0].content;
    expect(system).toContain("한국어");
    expect(system).toContain("2-3문장");
  });

  it("user message includes origin, destination, and times", () => {
    const messages = buildCoachPrompt(BASE_INPUT);
    const user = messages[1].content;
    expect(user).toContain("시청역");
    expect(user).toContain("홍대입구역");
    expect(user).toContain("23:47");
    expect(user).toContain("23분"); // 1380/60
    expect(user).toContain("18분"); // 1080/60
  });

  it("includes risk level in user message", () => {
    const messages = buildCoachPrompt(BASE_INPUT);
    expect(messages[1].content).toContain("주의");
  });

  it("handles danger risk level", () => {
    const messages = buildCoachPrompt({ ...BASE_INPUT, riskLevel: "danger" });
    expect(messages[1].content).toContain("위험");
  });

  it("includes liveEta when provided", () => {
    const messages = buildCoachPrompt({
      ...BASE_INPUT,
      liveEtaSec: 180,
      liveEtaRouteName: "N16",
    });
    expect(messages[1].content).toContain("N16");
    expect(messages[1].content).toContain("3분");
  });

  it("notes service ended when bus is unavailable", () => {
    const messages = buildCoachPrompt({
      ...BASE_INPUT,
      bus: { ...BASE_INPUT.bus, isServiceEnded: true },
    });
    expect(messages[1].content).toContain("운행 종료");
  });

  it("notes bike unavailable when applicable", () => {
    const messages = buildCoachPrompt({
      ...BASE_INPUT,
      bike: { ...BASE_INPUT.bike, isAvailable: false },
    });
    expect(messages[1].content).toContain("이용 불가");
  });
});

import type { RiskLevel } from "@/types/trip";

export type CoachInput = {
  originName: string;
  destinationName: string;
  bus: {
    totalDurationSec: number;
    walkDurationSec: number;
    transferCount: number;
    isServiceEnded: boolean;
  };
  bike: {
    totalDurationSec: number;
    rideDistanceMeters: number;
    walkDurationSec: number;
    fromStationBikesAvailable: number;
    isAvailable: boolean;
  };
  riskLevel: RiskLevel;
  currentTime: string;
  liveEtaSec?: number;
  liveEtaRouteName?: string;
};

type Message = { role: "system" | "user"; content: string };

const RISK_LABEL: Record<RiskLevel, string> = {
  safe: "안전",
  caution: "주의",
  danger: "위험",
};

/**
 * 비교 결과 데이터를 OpenAI Chat API용 메시지 배열로 변환한다.
 * 순수 함수이며 외부 I/O 없음.
 */
export function buildCoachPrompt(input: CoachInput): [Message, Message] {
  const system: Message = {
    role: "system",
    content: [
      "당신은 심야 귀가 교통 전문가입니다.",
      "사용자의 버스/자전거 경로 비교 결과를 분석하여 2-3문장으로 명확하고 실용적인 귀가 조언을 제공합니다.",
      "항상 한국어로 답변하며, 존댓말을 사용합니다.",
      "추천 이유를 간결하게 설명하고, 구체적인 행동 지침을 포함하세요.",
    ].join(" "),
  };

  const busMin = Math.round(input.bus.totalDurationSec / 60);
  const bikeMin = Math.round(input.bike.totalDurationSec / 60);
  const walkMin = Math.round(input.bus.walkDurationSec / 60);
  const bikeDistKm = Math.round(input.bike.rideDistanceMeters / 100) / 10;

  const lines: string[] = [
    `현재 시각: ${input.currentTime}`,
    `출발지: ${input.originName}`,
    `도착지: ${input.destinationName}`,
    "",
    "[ 버스 경로 ]",
  ];

  if (input.bus.isServiceEnded) {
    lines.push("상태: 운행 종료");
  } else {
    lines.push(`소요시간: ${busMin}분 (도보 ${walkMin}분 포함)`);
    lines.push(`환승: ${input.bus.transferCount}회`);
  }

  lines.push("");
  lines.push("[ 자전거 경로 ]");

  if (!input.bike.isAvailable) {
    lines.push("상태: 이용 불가 (근처 거치대 없음)");
  } else {
    lines.push(`소요시간: ${bikeMin}분`);
    lines.push(`주행거리: ${bikeDistKm}km`);
    lines.push(`대여 가능: ${input.bike.fromStationBikesAvailable}대`);
  }

  lines.push("");
  lines.push(`막차 리스크: ${RISK_LABEL[input.riskLevel]}`);

  if (input.liveEtaSec != null && input.liveEtaRouteName) {
    const etaMin = Math.ceil(input.liveEtaSec / 60);
    lines.push(
      `실시간 버스: ${input.liveEtaRouteName} 약 ${etaMin}분 후 도착 예정`,
    );
  }

  const user: Message = {
    role: "user",
    content: lines.join("\n"),
  };

  return [system, user];
}

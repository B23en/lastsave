import "server-only";

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { buildCoachPrompt, type CoachInput } from "@/lib/domain/coachPrompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FALLBACK_COACHING =
  "현재 AI 코칭 서비스를 이용할 수 없습니다. 비교 결과의 소요시간과 추천 배지를 참고하여 경로를 선택해주세요.";

export async function POST(req: Request) {
  let body: CoachInput;
  try {
    body = (await req.json()) as CoachInput;
  } catch {
    return NextResponse.json(
      { error: "invalid_body", message: "요청 본문이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  if (!body.originName || !body.destinationName) {
    return NextResponse.json(
      { error: "missing_fields", message: "출발지/목적지가 필요합니다." },
      { status: 400 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ coaching: FALLBACK_COACHING });
  }

  try {
    const openai = new OpenAI({ apiKey });
    const messages = buildCoachPrompt(body);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 200,
      temperature: 0.7,
    });

    const coaching =
      completion.choices[0]?.message?.content?.trim() ?? FALLBACK_COACHING;

    return NextResponse.json({ coaching });
  } catch (err) {
    console.error("[api/ai/coach]", err);
    return NextResponse.json(
      { coaching: FALLBACK_COACHING, error: "ai_failed" },
      { status: 200 },
    );
  }
}

import { NextResponse } from "next/server";
import { createTeaserShare } from "@/lib/shareAnswer/shareStore";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const questionId = Number(body?.questionId);
    const question = typeof body?.question === "string" ? body.question.trim() : "";
    const answer = typeof body?.answer === "string" ? body.answer.trim() : "";

    if (!Number.isInteger(questionId) || questionId <= 0 || !question || !answer) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const record = createTeaserShare({ questionId, question, answer });
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || "https://kwentuhan.cards";
    const revealUrl = `${baseUrl}/q/${record.questionId}/k/${record.kwentoId}`;

    return NextResponse.json({
      kwentoId: record.kwentoId,
      questionId: record.questionId,
      revealUrl,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

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
    return NextResponse.json({ shareId: record.shareId, mode: record.mode, createdAt: record.createdAt });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

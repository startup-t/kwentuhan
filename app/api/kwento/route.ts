import { NextResponse } from "next/server";
import { createPersistedKwento } from "@/lib/kwento/postgresStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const questionId = typeof body?.questionId === "string" ? body.questionId.trim() : "";
    const questionText =
      typeof body?.questionText === "string" && body.questionText.trim().length > 0
        ? body.questionText.trim()
        : questionId;
    const answerText = typeof body?.answerText === "string" ? body.answerText.trim() : "";
    const isTeaser = body?.isTeaser !== false;

    if (!questionId || !answerText) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const record = await createPersistedKwento({
      questionId,
      questionText,
      answerText,
      isTeaser,
    });

    const { origin } = new URL(req.url);
    const revealUrl = `${origin}/q/${record.questionId}/k/${record.kwentoId}`;

    return NextResponse.json({
      kwentoId: record.kwentoId,
      questionId: record.questionId,
      answerText: record.answerText,
      isTeaser: record.isTeaser,
      revealUrl,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to save kwento" }, { status: 500 });
  }
}

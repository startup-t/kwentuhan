import { NextResponse } from "next/server";
import { createPersistedKwento } from "@/lib/kwento/postgresStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/teaser
 *
 * Called by the web SharePreview component via createAnswerRevealUrl().
 * Persists the answer to PostgreSQL so any device can reveal it via the
 * returned URL — not just the tab that created the share.
 *
 * Body: { questionId: number, question: string, answer: string }
 * Returns: { kwentoId, questionId, revealUrl }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Accept questionId as number or string — both are valid.
    const questionId = String(Number(body?.questionId ?? 0));
    const questionText =
      typeof body?.question === "string" && body.question.trim().length > 0
        ? body.question.trim()
        : "";
    const answerText =
      typeof body?.answer === "string" && body.answer.trim().length > 0
        ? body.answer.trim()
        : "";

    if (!questionId || questionId === "0" || !questionText || !answerText) {
      console.debug("[/api/teaser] Invalid payload:", { questionId, questionTextLength: questionText.length, answerTextLength: answerText.length });
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    console.debug("[/api/teaser] Creating persisted kwento:", { questionId });
    const record = await createPersistedKwento({
      questionId,
      questionText,
      answerText,
      isTeaser: true,
    });

    const origin = new URL(req.url).origin;
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ??
      (origin.includes("localhost") ? "https://kwentuhan.cards" : origin);

    const revealUrl = `${baseUrl}/reveal/${record.kwentoId}?teaser=true`;

    console.debug("[/api/teaser] Reveal URL generated:", { kwentoId: record.kwentoId, revealUrl, origin, baseUrl });
    return NextResponse.json({
      kwentoId: record.kwentoId,
      questionId: record.questionId,
      revealUrl,
    });
  } catch (err) {
    console.error("[/api/teaser] failed:", err);
    return NextResponse.json({ error: "Failed to create share" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getKwentoShare } from "@/lib/shareAnswer/shareStore";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ kwentoId: string }> }) {
  const { kwentoId } = await params;

  if (!kwentoId || typeof kwentoId !== "string") {
    return NextResponse.json({ error: "Invalid kwento ID" }, { status: 404 });
  }

  const kwento = getKwentoShare(kwentoId);

  if (!kwento) {
    return NextResponse.json({ error: "Kwento not found" }, { status: 404 });
  }

  if (!kwento.questionId) {
    return NextResponse.json({ error: "Invalid kwento data" }, { status: 500 });
  }

  return NextResponse.json({
    kwentoId: kwento.kwentoId,
    questionId: kwento.questionId,
    questionText: kwento.questionText,
    answerText: kwento.answerText,
    isTeaser: kwento.isTeaser,
  });
}

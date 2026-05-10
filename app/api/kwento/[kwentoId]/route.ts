import { NextResponse } from "next/server";
import { getTeaserShare } from "@/lib/shareAnswer/shareStore";

export async function GET(_: Request, { params }: { params: Promise<{ kwentoId: string }> }) {
  const { kwentoId } = await params;

  if (!kwentoId || typeof kwentoId !== "string") {
    return NextResponse.json({ error: "Invalid kwento ID" }, { status: 404 });
  }

  const kwento = getTeaserShare(kwentoId);

  if (!kwento) {
    return NextResponse.json({ error: "Kwento not found" }, { status: 404 });
  }

  if (!kwento.questionId) {
    return NextResponse.json({ error: "Invalid kwento data" }, { status: 500 });
  }

  return NextResponse.json({
    questionId: kwento.questionId,
    questionText: kwento.questionText,
    answerText: kwento.answerText,
    isTeaser: kwento.isTeaser,
  });
}

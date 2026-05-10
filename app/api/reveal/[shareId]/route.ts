import { NextResponse } from "next/server";
import { getTeaserShare } from "@/lib/shareAnswer/shareStore";

export async function GET(_: Request, { params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;

  if (!shareId || typeof shareId !== "string") {
    return NextResponse.json({ error: "Invalid share ID" }, { status: 404 });
  }

  const record = getTeaserShare(shareId);

  if (!record) {
    return NextResponse.json(
      {
        answers: null,
        mode: "teaser",
        fallback: true,
        error: "Share not found",
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    answers: {
      questionId: Number(record.questionId),
      question: record.questionText,
      answer: record.answerText,
    },
    mode: "teaser",
  });
}

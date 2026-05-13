import { NextResponse } from "next/server";
import { getPersistedKwento } from "@/lib/kwento/postgresStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;

  if (!shareId || typeof shareId !== "string") {
    return NextResponse.json({ error: "Invalid share ID" }, { status: 404 });
  }

  let record = null;
  try {
    record = await getPersistedKwento(shareId);
  } catch (err) {
    console.error("[/api/reveal] lookup failed:", err);
    record = null;
  }

  if (!record) {
    return NextResponse.json(
      { answers: null, mode: "teaser", fallback: true, error: "Share not found" },
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

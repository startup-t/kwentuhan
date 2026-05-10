import { NextResponse } from "next/server";
import { getPersistedKwento } from "@/lib/kwento/postgresStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ kwentoId: string }> }) {
  try {
    const { kwentoId } = await params;

    if (!kwentoId || typeof kwentoId !== "string") {
      return NextResponse.json({ error: "Invalid kwento ID" }, { status: 404 });
    }

    const kwento = await getPersistedKwento(kwentoId);

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
  } catch {
    return NextResponse.json({ error: "Failed to load kwento" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import type { Mode, Level } from "@/lib/types";
import { getPublishedQuestions } from "@/lib/questionsServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") as Mode;
    const category = url.searchParams.get("category");
    const level = url.searchParams.get("level") as Level;

    if (!mode || !["solo", "group"].includes(mode)) {
        return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }

    try {
        const questions = await getPublishedQuestions(mode, category === "null" ? null : category, level);
        return NextResponse.json({ questions });
    } catch (error) {
        console.error("Failed to get questions:", error);
        return NextResponse.json({ error: "Failed to get questions" }, { status: 500 });
    }
}
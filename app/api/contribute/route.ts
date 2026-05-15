import { NextResponse } from "next/server";
import { createContributedQuestion } from "@/lib/kwento/postgresStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/contribute
 *
 * Submits a user-contributed question for immediate publication.
 *
 * Body: { hook: string, deepDive: string, level: string, category: string, mode: string, cluster: string, contributor?: string }
 * Returns: { question: ContributedQuestion }
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();

        const hook = typeof body?.hook === "string" && body.hook.trim().length > 0 ? body.hook.trim() : "";
        const deepDive = typeof body?.deepDive === "string" ? body.deepDive.trim() : "";
        const level = typeof body?.level === "string" && ["light", "deep", "wild"].includes(body.level) ? body.level : "light";
        const category = typeof body?.category === "string" && body.category.trim().length > 0 ? body.category.trim() : "selfCheck";
        const mode = typeof body?.mode === "string" && ["solo", "group"].includes(body.mode) ? body.mode : "solo";
        const cluster = typeof body?.cluster === "string" && body.cluster.trim().length > 0 ? body.cluster.trim() : (mode === "solo" ? "solo" : "barkada");
        const contributorUsername = typeof body?.contributorUsername === "string" && body.contributorUsername.trim().length > 0
            ? body.contributorUsername.trim()
            : "Community Contributor";
        const language = typeof body?.language === "string" && body.language.trim().length > 0
            ? body.language.trim()
            : "en";

        if (!hook || hook.length < 8) {
            return NextResponse.json({ error: "Question must be at least 8 characters" }, { status: 400 });
        }

        console.debug("[/api/contribute] Creating contributed question:", { hook, level, category, mode, contributorUsername, language });
        const question = await createContributedQuestion({
            hook,
            deepDive,
            level,
            category,
            mode,
            cluster,
            contributorUsername,
            language,
            isPublished: true,
        });

        return NextResponse.json({ question });
    } catch (err) {
        console.error("[/api/contribute] failed:", err);
        return NextResponse.json({ error: "Failed to submit question" }, { status: 500 });
    }
}
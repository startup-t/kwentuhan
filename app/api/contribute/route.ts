import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createContributedQuestion } from "@/lib/kwento/postgresStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HOOK_MIN = 8;
const HOOK_MAX = 400;
const DEEP_MAX = 400;
const USERNAME_MAX = 32;

/**
 * POST /api/contribute
 *
 * Publishes a community-contributed question immediately.
 * Triggers cache revalidation so server-rendered routes see the new
 * question on the very next request.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const hookRaw = typeof body?.hook === "string" ? body.hook.trim() : "";
    const deepDive = typeof body?.deepDive === "string" ? body.deepDive.trim().slice(0, DEEP_MAX) : "";
    const level = typeof body?.level === "string" && ["light", "deep", "wild"].includes(body.level)
      ? body.level
      : "light";
    const category = typeof body?.category === "string" && body.category.trim().length > 0
      ? body.category.trim()
      : "selfCheck";
    const mode = typeof body?.mode === "string" && ["solo", "group"].includes(body.mode)
      ? body.mode
      : "solo";
    const cluster = typeof body?.cluster === "string" && body.cluster.trim().length > 0
      ? body.cluster.trim()
      : (mode === "solo" ? "solo" : "social");

    const usernameRaw = typeof body?.contributorUsername === "string"
      ? body.contributorUsername.trim().slice(0, USERNAME_MAX)
      : "";
    const contributorUsername = usernameRaw.length > 0
      ? usernameRaw
      : "Community Contributor";

    const language = typeof body?.language === "string" && body.language.trim().length > 0
      ? body.language.trim().slice(0, 8)
      : "en";

    if (hookRaw.length < HOOK_MIN) {
      return NextResponse.json(
        { error: `Question must be at least ${HOOK_MIN} characters.` },
        { status: 400 },
      );
    }
    if (hookRaw.length > HOOK_MAX) {
      return NextResponse.json(
        { error: `Question can be at most ${HOOK_MAX} characters.` },
        { status: 400 },
      );
    }

    const hook = hookRaw.slice(0, HOOK_MAX);

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

    // Refresh any server-rendered routes that read the merged question pool.
    // Cheap and idempotent — these targets are dynamic but the call also
    // bumps the in-memory route cache for Edge/Node ISR consumers.
    try {
      revalidatePath("/");
      revalidatePath("/q/[questionId]", "page");
      revalidatePath("/q/[questionId]/k/[kwentoId]", "page");
    } catch (e) {
      // revalidatePath is a best-effort hint; never block the response on it.
      console.warn("[/api/contribute] revalidate hint failed:", e);
    }

    return NextResponse.json({ question });
  } catch (err) {
    console.error("[/api/contribute] failed:", err);
    // TEMP: surface the error message so we can diagnose the production
    // failure without relying on log streaming. Revert once root cause is found.
    const message = err instanceof Error ? err.message : String(err);
    const code = (err as { code?: string })?.code ?? null;
    return NextResponse.json(
      { error: "Failed to submit question", debugMessage: message, debugCode: code },
      { status: 500 },
    );
  }
}

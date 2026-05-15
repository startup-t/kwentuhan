import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { revalidatePath } from "next/cache";
import { createContributedQuestion } from "@/lib/kwento/postgresStore";
import { bustQuestionsCache } from "@/lib/questionsServer";
import {
  getCommunityQuestionsWithSignals,
  type CommunityQuestionSort,
} from "@/lib/metrics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HOOK_MIN = 8;
const HOOK_MAX = 400;
const DEEP_MAX = 400;
const USERNAME_MAX = 32;

/* ──────────────────────────────────────────────────────────────────────────
   Admin auth — shared with /api/metrics. Gated by METRICS_ADMIN_TOKEN env.
   ────────────────────────────────────────────────────────────────────────── */

function isAuthorized(req: Request): boolean {
  const expected = process.env.METRICS_ADMIN_TOKEN;
  if (!expected || expected.length < 16) return false;

  let provided = "";
  const auth = req.headers.get("authorization") ?? "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    provided = auth.slice(7).trim();
  } else {
    provided = new URL(req.url).searchParams.get("token") ?? "";
  }
  if (!provided || provided.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return false;
  }
}

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

    // Drop the in-process question cache so the new row appears in the very
    // next /api/questions / /q/[id] read on this function instance.
    bustQuestionsCache();

    // Hint Next.js to invalidate any server-rendered routes that read the
    // merged pool. Best-effort — never blocks the response.
    try {
      revalidatePath("/");
      revalidatePath("/q/[questionId]", "page");
      revalidatePath("/q/[questionId]/k/[kwentoId]", "page");
    } catch (e) {
      console.warn("[/api/contribute] revalidate hint failed:", e);
    }

    return NextResponse.json({ question });
  } catch (err) {
    console.error("[/api/contribute] failed:", err);
    return NextResponse.json({ error: "Failed to submit question" }, { status: 500 });
  }
}

/**
 * GET /api/contribute?sort=newest|best|worst&...
 *
 * Admin-only feed of community-contributed questions enriched with their
 * per-question telemetry signals (shown/answered/reacted/shared/skipped +
 * derived rates). This is the read surface for moat #2 — the quality-filter
 * data that eventually powers community-question promotion / pruning.
 *
 * Auth: same `METRICS_ADMIN_TOKEN` env var as /api/metrics (it's the same
 * class of analytical data — not public).
 *
 * Query params:
 *   - sort        newest | best | worst   (default: newest)
 *   - days        positive int or "all"   (default: 30 — telemetry window only;
 *                                          the question list itself is not
 *                                          windowed)
 *   - mode        solo | group
 *   - category    e.g. "barkada", "selfCheck"
 *   - level       light | deep | wild
 *   - min_shown   suppresses tiny-sample noise on best/worst sorts (default 5)
 *   - limit       1..200                  (default 50)
 *   - offset      >=0                     (default 0)
 *
 * Response: { windowDays, sort, total, limit, offset, questions: [...] }
 */
export async function GET(req: Request) {
  if (!process.env.METRICS_ADMIN_TOKEN || process.env.METRICS_ADMIN_TOKEN.length < 16) {
    return NextResponse.json(
      {
        error: "Contribute admin feed not configured.",
        hint: "Set METRICS_ADMIN_TOKEN (>=16 chars) in the project env to enable.",
      },
      { status: 503 },
    );
  }
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const sortRaw = url.searchParams.get("sort") ?? "newest";
    const sort: CommunityQuestionSort =
      sortRaw === "best" || sortRaw === "worst" ? sortRaw : "newest";

    const daysRaw = url.searchParams.get("days");
    let windowDays: number | null;
    if (daysRaw === null) {
      windowDays = 30;
    } else if (daysRaw === "all") {
      windowDays = null;
    } else {
      const n = Number(daysRaw);
      windowDays = Number.isFinite(n) && n >= 1 && n <= 3650 ? Math.floor(n) : 30;
    }

    const modeRaw = url.searchParams.get("mode");
    const mode = modeRaw === "solo" || modeRaw === "group" ? modeRaw : undefined;

    const category = url.searchParams.get("category") || undefined;

    const levelRaw = url.searchParams.get("level");
    const level =
      levelRaw === "light" || levelRaw === "deep" || levelRaw === "wild"
        ? levelRaw
        : undefined;

    // Note: check raw `null` rather than coercing — Number("") === 0, which
    // would silently swallow the "no param" case and skip the per-sort default.
    const minShownStr = url.searchParams.get("min_shown");
    let minShown: number;
    if (minShownStr === null) {
      minShown = sort === "newest" ? 0 : 5; // default per sort
    } else {
      const n = Number(minShownStr);
      minShown = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 5;
    }

    const limitRaw = Number(url.searchParams.get("limit") ?? "");
    const limit = Number.isFinite(limitRaw) && limitRaw >= 1 ? Math.floor(limitRaw) : 50;

    const offsetRaw = Number(url.searchParams.get("offset") ?? "");
    const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? Math.floor(offsetRaw) : 0;

    const result = await getCommunityQuestionsWithSignals({
      sort,
      windowDays,
      mode,
      category,
      level,
      minShown,
      limit,
      offset,
    });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (err) {
    console.error("[GET /api/contribute] failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch community questions" },
      { status: 500 },
    );
  }
}

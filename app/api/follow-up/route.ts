import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/follow-up
 *
 * Generates ONE contextual "Deep Dive" follow-up question for a freshly
 * published kwento. Routes through Vercel AI Gateway (OpenAI-compatible
 * HTTP) — no SDK dependency, single env var.
 *
 * Required env: AI_GATEWAY_API_KEY
 * Optional env: FOLLOW_UP_MODEL  (default: openai/gpt-4o-mini)
 *
 * Body:    { hook: string, mode?: string, category?: string }
 * Returns: { followUp: string }
 *
 * Status codes:
 *   200 — ok, follow-up generated
 *   400 — bad input
 *   503 — gateway not configured (no API key) — UI should hide gracefully
 *   502 — gateway returned an error — UI should offer retry
 *   500 — unexpected server error
 */

const SYSTEM_PROMPT = `You are a thoughtful conversation partner for the Kwentuhan card game — a Filipino conversation app where Taglish (mixed Tagalog/English) is natural and welcomed.

A user just wrote a question for the deck. Generate ONE follow-up question that:
- Connects directly to the original
- Goes exactly ONE layer deeper: uncover emotion, reveal motivation, explore consequences, or invite introspection
- Is conversational, short, and human (max 18 words)
- Never repeats the original wording
- Avoids therapist tropes ("How does that make you feel?", "What does that bring up for you?")
- Matches the language of the original — English, Tagalog, or Taglish — without forcing a switch

Return ONLY the follow-up question. No quotes, no labels, no preamble.`;

const MAX_HOOK_LEN = 400;
const MAX_OUTPUT_TOKENS = 80;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const hook =
      typeof body?.hook === "string" ? body.hook.trim().slice(0, MAX_HOOK_LEN) : "";
    const mode = typeof body?.mode === "string" && body.mode.length > 0 ? body.mode : "solo";
    const category =
      typeof body?.category === "string" && body.category.length > 0
        ? body.category
        : "general";

    if (!hook || hook.length < 4) {
      return NextResponse.json({ error: "Missing hook" }, { status: 400 });
    }

    const apiKey = process.env.AI_GATEWAY_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Follow-up generation isn't configured yet." },
        { status: 503 },
      );
    }

    const model = process.env.FOLLOW_UP_MODEL || "openai/gpt-4o-mini";

    const userPrompt = `Original question: "${hook}"
Mode: ${mode}
Category: ${category}

Follow-up:`;

    const gatewayRes = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: MAX_OUTPUT_TOKENS,
        temperature: 0.85,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!gatewayRes.ok) {
      const errBody = await gatewayRes.text().catch(() => "");
      console.error(
        "[/api/follow-up] gateway error:",
        gatewayRes.status,
        errBody.slice(0, 400),
      );
      return NextResponse.json({ error: "AI gateway error" }, { status: 502 });
    }

    const data = await gatewayRes.json();
    const raw: unknown = data?.choices?.[0]?.message?.content;
    const rawText = typeof raw === "string" ? raw : "";

    // Strip surrounding quotes, leading "Follow-up:" labels, collapse whitespace.
    const followUp = rawText
      .replace(/^[\s"'“”]+|[\s"'“”]+$/g, "")
      .replace(/^Follow[-\s]?up:\s*/i, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!followUp) {
      console.error("[/api/follow-up] empty content from gateway:", data);
      return NextResponse.json({ error: "Empty response" }, { status: 502 });
    }

    return NextResponse.json({ followUp });
  } catch (err) {
    console.error("[/api/follow-up] failed:", err);
    return NextResponse.json({ error: "Failed to generate follow-up" }, { status: 500 });
  }
}

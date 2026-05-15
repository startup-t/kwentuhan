import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { getMetricsSnapshot } from "@/lib/metrics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/metrics?days=30
 *
 * Returns the full impact-metrics snapshot — activity, engagement, funnel,
 * quality, virality, community, and the top-question performance leaderboard.
 *
 * Admin-gated via `METRICS_ADMIN_TOKEN` env var. The token must be sent as
 * either:
 *   - `Authorization: Bearer <token>` header (preferred), or
 *   - `?token=<token>` query string (convenience for browser-tab use)
 *
 * Uses constant-time compare to avoid timing attacks. If the env var isn't
 * set, the endpoint is completely closed (503) to prevent accidental
 * exposure during initial deploy.
 *
 * Query params:
 *   - days: number of days to window the metrics. Default 30. Pass "all" for
 *     no window (all-time).
 */

function isAuthorized(req: Request): boolean {
  const expected = process.env.METRICS_ADMIN_TOKEN;
  if (!expected || expected.length < 16) return false; // env not configured

  let provided = "";
  const auth = req.headers.get("authorization") ?? "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    provided = auth.slice(7).trim();
  } else {
    const url = new URL(req.url);
    provided = url.searchParams.get("token") ?? "";
  }
  if (!provided) return false;
  if (provided.length !== expected.length) return false;

  try {
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function parseWindow(req: Request): number | null {
  const url = new URL(req.url);
  const raw = url.searchParams.get("days");
  if (!raw) return 30;
  if (raw === "all") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1 || n > 3650) return 30;
  return Math.floor(n);
}

export async function GET(req: Request) {
  if (!process.env.METRICS_ADMIN_TOKEN || process.env.METRICS_ADMIN_TOKEN.length < 16) {
    return NextResponse.json(
      {
        error: "Metrics endpoint not configured.",
        hint: "Set METRICS_ADMIN_TOKEN (>=16 chars) in the Vercel project env to enable.",
      },
      { status: 503 },
    );
  }

  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const windowDays = parseWindow(req);
    const snapshot = await getMetricsSnapshot(windowDays);
    // No-store: metrics are dynamic and small; don't let any CDN cache them.
    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (err) {
    console.error("[/api/metrics] failed:", err);
    return NextResponse.json({ error: "Failed to compute metrics" }, { status: 500 });
  }
}

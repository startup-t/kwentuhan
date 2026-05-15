/**
 * Kwentuhan impact metrics — server-only.
 *
 * The data sources are:
 *   - `session_events`       (raw telemetry from lib/telemetry.ts)
 *   - `contributed_questions` (community-submitted questions)
 *
 * Each metric is a small, typed, self-contained async function over the
 * existing `pg.Pool`. `getMetricsSnapshot()` composes them all into one
 * JSON payload — that's what the admin /api/metrics endpoint returns.
 *
 * No dashboard, no ML, no real-time pipelines — same constraints as the
 * telemetry layer. This module just *computes* the numbers from raw events.
 *
 * Conventions:
 *   - All metrics accept a `windowDays` argument (default 30). Pass `null`
 *     for all-time.
 *   - Counts are integers. Rates are percentages 0–100 (rounded to 2 dp).
 *   - Anything that can divide by zero falls back to 0, not NaN/null.
 */

import { Pool } from "pg";
import staticQuestionsData from "@/data/questions.json";
import type { Question } from "@/lib/types";

const globalForPostgres = globalThis as typeof globalThis & {
  __kwentuhanPostgresPool__?: Pool;
};

/**
 * Lookup table: numeric question id → minimal metadata for leaderboards.
 * Built once at module load. The full Question shape is overkill for metrics
 * display; we keep just the fields a dashboard row needs.
 */
type QuestionMeta = { hook: string; level: string; category: string };
const STATIC_QUESTION_META: Map<string, QuestionMeta> = new Map(
  (staticQuestionsData as Question[]).map((q) => [
    String(q.id),
    { hook: q.hook, level: q.level, category: q.category },
  ]),
);

function getConnectionString(): string {
  const candidates = [process.env.POSTGRES_URL, process.env.DATABASE_URL]
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v.length > 0);
  if (candidates.length === 0) {
    throw new Error("Missing Postgres connection string");
  }
  return candidates[0];
}

function getPool(): Pool {
  if (!globalForPostgres.__kwentuhanPostgresPool__) {
    globalForPostgres.__kwentuhanPostgresPool__ = new Pool({
      connectionString: getConnectionString(),
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return globalForPostgres.__kwentuhanPostgresPool__;
}

/* ──────────────────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────────────────── */

function pct(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 10000) / 100;
}

function round2(n: number | null | undefined): number {
  if (n == null || !Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/** Build a SQL clause + params for "events within the last N days".
 *  If `windowDays` is null, returns no clause (all-time). */
function windowClause(
  windowDays: number | null,
  paramIndex: number,
): { sql: string; params: string[] } {
  if (windowDays === null) return { sql: "", params: [] };
  return {
    sql: `created_at >= NOW() - $${paramIndex}::interval`,
    params: [`${windowDays} days`],
  };
}

/* ──────────────────────────────────────────────────────────────────────────
   Activity — DAU / WAU / MAU
   ────────────────────────────────────────────────────────────────────────── */

export interface ActivityMetrics {
  dau: number;
  wau: number;
  mau: number;
}

export async function getActivityMetrics(): Promise<ActivityMetrics> {
  const pool = getPool();
  const r = await pool.query<{ dau: string; wau: string; mau: string }>(`
    SELECT
      COUNT(DISTINCT session_id) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day')   AS dau,
      COUNT(DISTINCT session_id) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')  AS wau,
      COUNT(DISTINCT session_id) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS mau
    FROM session_events
  `);
  const row = r.rows[0] ?? { dau: "0", wau: "0", mau: "0" };
  return { dau: +row.dau, wau: +row.wau, mau: +row.mau };
}

/* ──────────────────────────────────────────────────────────────────────────
   Engagement — events / shown / answered per session
   ────────────────────────────────────────────────────────────────────────── */

export interface EngagementMetrics {
  totalSessions: number;
  avgEventsPerSession: number;
  avgShownPerSession: number;
  avgAnsweredPerSession: number;
}

export async function getEngagementMetrics(
  windowDays: number | null = 30,
): Promise<EngagementMetrics> {
  const pool = getPool();
  const w = windowClause(windowDays, 1);
  const where = w.sql ? `WHERE ${w.sql}` : "";
  const r = await pool.query<{
    total_sessions: string;
    avg_events: string | null;
    avg_shown: string | null;
    avg_answered: string | null;
  }>(
    `
      SELECT
        COUNT(*)              AS total_sessions,
        AVG(events_count)     AS avg_events,
        AVG(shown_count)      AS avg_shown,
        AVG(answered_count)   AS avg_answered
      FROM (
        SELECT session_id,
               COUNT(*)                                                AS events_count,
               COUNT(*) FILTER (WHERE event_type='shown')              AS shown_count,
               COUNT(*) FILTER (WHERE event_type='answered')           AS answered_count
        FROM session_events
        ${where}
        GROUP BY session_id
      ) s
    `,
    w.params,
  );
  const row = r.rows[0];
  return {
    totalSessions: row ? +row.total_sessions : 0,
    avgEventsPerSession: round2(row?.avg_events ? +row.avg_events : 0),
    avgShownPerSession: round2(row?.avg_shown ? +row.avg_shown : 0),
    avgAnsweredPerSession: round2(row?.avg_answered ? +row.avg_answered : 0),
  };
}

/* ──────────────────────────────────────────────────────────────────────────
   Funnel — answer rate, share rate, reaction rate, skip rate
   ────────────────────────────────────────────────────────────────────────── */

export interface FunnelMetrics {
  shownCount: number;
  answerRatePct: number;
  shareRatePct: number;
  reactionRatePct: number;
  skipRatePct: number;
}

export async function getFunnelMetrics(
  windowDays: number | null = 30,
): Promise<FunnelMetrics> {
  const pool = getPool();
  const w = windowClause(windowDays, 1);
  const where = w.sql ? `WHERE ${w.sql}` : "";
  const r = await pool.query<{
    shown: string;
    answered: string;
    shared: string;
    reacted: string;
    skipped: string;
  }>(
    `
      SELECT
        COUNT(*) FILTER (WHERE event_type='shown')    AS shown,
        COUNT(*) FILTER (WHERE event_type='answered') AS answered,
        COUNT(*) FILTER (WHERE event_type='shared')   AS shared,
        COUNT(*) FILTER (WHERE event_type='reacted')  AS reacted,
        COUNT(*) FILTER (WHERE event_type='skipped')  AS skipped
      FROM session_events
      ${where}
    `,
    w.params,
  );
  const row = r.rows[0] ?? { shown: "0", answered: "0", shared: "0", reacted: "0", skipped: "0" };
  const shown = +row.shown;
  return {
    shownCount: shown,
    answerRatePct: pct(+row.answered, shown),
    shareRatePct: pct(+row.shared, shown),
    reactionRatePct: pct(+row.reacted, shown),
    skipRatePct: pct(+row.skipped, shown),
  };
}

/* ──────────────────────────────────────────────────────────────────────────
   Quality — dwell-to-answer and answer length distribution
   ────────────────────────────────────────────────────────────────────────── */

export interface QualityMetrics {
  answeredCount: number;
  avgDwellMs: number;
  p50DwellMs: number;
  p95DwellMs: number;
  avgAnswerLengthChars: number;
}

export async function getQualityMetrics(
  windowDays: number | null = 30,
): Promise<QualityMetrics> {
  const pool = getPool();
  const w = windowClause(windowDays, 1);
  const whereParts = ["event_type='answered'"];
  if (w.sql) whereParts.push(w.sql);
  const where = `WHERE ${whereParts.join(" AND ")}`;

  const r = await pool.query<{
    n: string;
    avg_dwell: string | null;
    p50_dwell: string | null;
    p95_dwell: string | null;
    avg_len: string | null;
  }>(
    `
      SELECT
        COUNT(*)                                                AS n,
        AVG(dwell_ms)                                           AS avg_dwell,
        PERCENTILE_CONT(0.5)  WITHIN GROUP (ORDER BY dwell_ms)  AS p50_dwell,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY dwell_ms)  AS p95_dwell,
        AVG(answer_length_chars)                                AS avg_len
      FROM session_events
      ${where}
    `,
    w.params,
  );
  const row = r.rows[0];
  return {
    answeredCount: row ? +row.n : 0,
    avgDwellMs: Math.round(row?.avg_dwell ? +row.avg_dwell : 0),
    p50DwellMs: Math.round(row?.p50_dwell ? +row.p50_dwell : 0),
    p95DwellMs: Math.round(row?.p95_dwell ? +row.p95_dwell : 0),
    avgAnswerLengthChars: round2(row?.avg_len ? +row.avg_len : 0),
  };
}

/* ──────────────────────────────────────────────────────────────────────────
   Virality — shares per session (proxy K-factor)
   ────────────────────────────────────────────────────────────────────────── */

export interface ViralityMetrics {
  shareCount: number;
  totalSessions: number;
  sharesPerSession: number; // proxy K-factor
}

export async function getViralityMetrics(
  windowDays: number | null = 30,
): Promise<ViralityMetrics> {
  const pool = getPool();
  const w = windowClause(windowDays, 1);
  const where = w.sql ? `WHERE ${w.sql}` : "";
  const r = await pool.query<{ share_count: string; session_count: string }>(
    `
      SELECT
        COUNT(*) FILTER (WHERE event_type='shared')   AS share_count,
        COUNT(DISTINCT session_id)                    AS session_count
      FROM session_events
      ${where}
    `,
    w.params,
  );
  const row = r.rows[0] ?? { share_count: "0", session_count: "0" };
  const shares = +row.share_count;
  const sessions = +row.session_count;
  return {
    shareCount: shares,
    totalSessions: sessions,
    sharesPerSession: sessions === 0 ? 0 : round2(shares / sessions),
  };
}

/* ──────────────────────────────────────────────────────────────────────────
   Top questions — the seed for the question-quality graph (moat #1)
   ────────────────────────────────────────────────────────────────────────── */

export interface QuestionPerformanceRow {
  questionId: string;
  /** Human-readable question text. `null` if the question can't be resolved
   *  (e.g., a community kwento that was later deleted). */
  hook: string | null;
  /** "light" | "deep" | "wild" — `null` if unresolvable. */
  level: string | null;
  /** Category key (e.g., "barkada", "selfCheck") — `null` if unresolvable. */
  category: string | null;
  /** Whether this question came from the community (q_* id) vs. the static
   *  bundled deck. */
  isCommunity: boolean;
  shown: number;
  answered: number;
  shared: number;
  reacted: number;
  skipped: number;
  answerRatePct: number;
  /** Composite engagement: answered + shared + reacted, divided by shown.
   *  This is the v0 "quality score" — analysts can refine the weights later
   *  when the model gets serious. */
  engagementRatePct: number;
}

export async function getTopQuestionsByAnswerRate(
  windowDays: number | null = 30,
  minShown: number = 5,
  limit: number = 20,
): Promise<QuestionPerformanceRow[]> {
  const pool = getPool();
  const w = windowClause(windowDays, 1);
  const where = w.sql ? `WHERE ${w.sql}` : "";
  const r = await pool.query<{
    question_id: string;
    shown: string;
    answered: string;
    shared: string;
    reacted: string;
    skipped: string;
  }>(
    `
      SELECT question_id,
             COUNT(*) FILTER (WHERE event_type='shown')     AS shown,
             COUNT(*) FILTER (WHERE event_type='answered')  AS answered,
             COUNT(*) FILTER (WHERE event_type='shared')    AS shared,
             COUNT(*) FILTER (WHERE event_type='reacted')   AS reacted,
             COUNT(*) FILTER (WHERE event_type='skipped')   AS skipped
      FROM session_events
      ${where}
      GROUP BY question_id
      HAVING COUNT(*) FILTER (WHERE event_type='shown') >= $${w.params.length + 1}
      ORDER BY
        (COUNT(*) FILTER (WHERE event_type='answered'))::float
        / NULLIF(COUNT(*) FILTER (WHERE event_type='shown'),0) DESC NULLS LAST
      LIMIT $${w.params.length + 2}
    `,
    [...w.params, minShown, limit],
  );
  // Resolve question metadata for the leaderboard rows.
  // Static questions live in the bundled JSON (numeric IDs); community
  // questions live in Postgres (q_* IDs). Batch-fetch the community ones
  // in a single round-trip.
  const rawRows = r.rows;
  const communityIds = rawRows
    .map((r) => r.question_id)
    .filter((id) => id.startsWith("q_"));
  const communityMeta = new Map<string, QuestionMeta>();
  if (communityIds.length > 0) {
    const cq = await pool.query<{
      id: string;
      hook: string;
      level: string;
      category: string;
    }>(
      `SELECT id, hook, level, category
       FROM contributed_questions
       WHERE id = ANY($1::text[])`,
      [communityIds],
    );
    for (const row of cq.rows) {
      communityMeta.set(row.id, {
        hook: row.hook,
        level: row.level,
        category: row.category,
      });
    }
  }

  return rawRows.map((row) => {
    const shown = +row.shown;
    const answered = +row.answered;
    const shared = +row.shared;
    const reacted = +row.reacted;
    const isCommunity = row.question_id.startsWith("q_");
    const meta = isCommunity
      ? communityMeta.get(row.question_id)
      : STATIC_QUESTION_META.get(row.question_id);
    return {
      questionId: row.question_id,
      hook: meta?.hook ?? null,
      level: meta?.level ?? null,
      category: meta?.category ?? null,
      isCommunity,
      shown,
      answered,
      shared,
      reacted,
      skipped: +row.skipped,
      answerRatePct: pct(answered, shown),
      engagementRatePct: pct(answered + shared + reacted, shown),
    };
  });
}

/* ──────────────────────────────────────────────────────────────────────────
   Community — contribution + community-answered counts
   ────────────────────────────────────────────────────────────────────────── */

export interface CommunityMetrics {
  contributedQuestionCount: number;
  answersOnCommunityQuestions: number;
}

export async function getCommunityMetrics(
  windowDays: number | null = 30,
): Promise<CommunityMetrics> {
  const pool = getPool();

  // Contributed questions in the window
  const w1 = windowClause(windowDays, 1);
  const where1 = w1.sql ? `WHERE ${w1.sql}` : "";
  const r1 = await pool.query<{ n: string }>(
    `SELECT COUNT(*) AS n FROM contributed_questions ${where1}`,
    w1.params,
  );

  // Answer events where question_id is a community ID (q_*)
  const w2 = windowClause(windowDays, 1);
  const whereParts2 = ["event_type='answered'", "question_id LIKE 'q\\_%' ESCAPE '\\'"];
  if (w2.sql) whereParts2.push(w2.sql);
  const where2 = `WHERE ${whereParts2.join(" AND ")}`;
  const r2 = await pool.query<{ n: string }>(
    `SELECT COUNT(*) AS n FROM session_events ${where2}`,
    w2.params,
  );

  return {
    contributedQuestionCount: r1.rows[0] ? +r1.rows[0].n : 0,
    answersOnCommunityQuestions: r2.rows[0] ? +r2.rows[0].n : 0,
  };
}

/* ──────────────────────────────────────────────────────────────────────────
   Community questions + per-question signals
   ──────────────────────────────────────────────────────────────────────────

   This is the queryable feed for moat #2 ("community-contribution library
   with quality filter"). Every contributed question gets joined to its
   telemetry aggregate so callers can sort by performance — best (highest
   engagement) for promotion, worst (highest skip) for content pruning.

   Returned rows look like a regular contributed-question record with an
   inline `signals` object. Zero-event questions return all-zero signals
   so callers never have to handle nulls. */

export interface QuestionSignals {
  shown: number;
  answered: number;
  reacted: number;
  shared: number;
  skipped: number;
  /** answered / shown, percentage */
  answerRatePct: number;
  /** reacted / shown, percentage */
  reactionRatePct: number;
  /** shared / shown, percentage */
  shareRatePct: number;
  /** skipped / shown, percentage */
  skipRatePct: number;
  /** (answered + reacted + shared) / shown — v0 composite quality score.
   *  Can exceed 100 since multiple positive events can happen per impression. */
  engagementRatePct: number;
}

export interface CommunityQuestionWithSignals {
  id: string;
  hook: string;
  deepDive: string;
  level: string;
  category: string;
  mode: string;
  cluster: string;
  contributorUsername: string;
  language: string;
  isPublished: boolean;
  createdAt: string;
  signals: QuestionSignals;
}

export type CommunityQuestionSort = "newest" | "best" | "worst";

export interface CommunityQuestionListOptions {
  /** Telemetry aggregation window. Defaults to 30 days. Pass null for all-time. */
  windowDays?: number | null;
  /** Min `shown` count for "best"/"worst" sorts — suppresses tiny-sample noise. */
  minShown?: number;
  /** newest → by created_at DESC. best → by engagement DESC. worst → by skip DESC. */
  sort?: CommunityQuestionSort;
  mode?: "solo" | "group";
  category?: string;
  level?: "light" | "deep" | "wild";
  limit?: number;
  offset?: number;
}

export interface CommunityQuestionListResult {
  windowDays: number | null;
  sort: CommunityQuestionSort;
  total: number;
  limit: number;
  offset: number;
  questions: CommunityQuestionWithSignals[];
}

export async function getCommunityQuestionsWithSignals(
  options: CommunityQuestionListOptions = {},
): Promise<CommunityQuestionListResult> {
  const windowDays = options.windowDays === undefined ? 30 : options.windowDays;
  const minShown = Math.max(0, Math.floor(options.minShown ?? 0));
  const sort: CommunityQuestionSort = options.sort ?? "newest";
  const limit = Math.min(Math.max(1, Math.floor(options.limit ?? 50)), 200);
  const offset = Math.max(0, Math.floor(options.offset ?? 0));

  const pool = getPool();

  // Build WHERE clause + params dynamically. All values are server-controlled
  // or come from a single trusted route param, but we parameterize anyway
  // because it's free and idiomatic.
  const whereParts: string[] = ["cq.is_published = TRUE"];
  const params: unknown[] = [];
  if (options.mode === "solo" || options.mode === "group") {
    params.push(options.mode);
    whereParts.push(`cq.mode = $${params.length}`);
  }
  if (options.category && options.category.length > 0) {
    params.push(options.category);
    whereParts.push(`cq.category = $${params.length}`);
  }
  if (options.level === "light" || options.level === "deep" || options.level === "wild") {
    params.push(options.level);
    whereParts.push(`cq.level = $${params.length}`);
  }
  const whereSql = `WHERE ${whereParts.join(" AND ")}`;

  // Telemetry window — applied inside the lateral subquery so it filters
  // events, not questions. (We always want the question row even if it has
  // zero events in the window.)
  const eventWindowSql = windowDays === null
    ? ""
    : `AND se.created_at >= NOW() - INTERVAL '${windowDays} days'`;

  // Sort + having clause. "best"/"worst" enforce min_shown to suppress
  // tiny-sample winners (a 1-shown 1-answered question doesn't beat a
  // 47-shown 32-answered one just because it's at 100%).
  let orderSql: string;
  let havingSql = "";
  if (sort === "best") {
    orderSql = `ORDER BY engagement_rate DESC NULLS LAST, cq.created_at DESC`;
    if (minShown > 0) havingSql = `AND COALESCE(s.shown, 0) >= ${minShown}`;
  } else if (sort === "worst") {
    orderSql = `ORDER BY skip_rate DESC NULLS LAST, cq.created_at DESC`;
    if (minShown > 0) havingSql = `AND COALESCE(s.shown, 0) >= ${minShown}`;
  } else {
    orderSql = `ORDER BY cq.created_at DESC`;
  }

  // Count query for pagination — runs the same WHERE clause without the
  // lateral join (we don't need signals to count).
  const totalParams = params.slice();
  const total = await pool
    .query<{ n: string }>(
      `SELECT COUNT(*) AS n FROM contributed_questions cq ${whereSql}`,
      totalParams,
    )
    .then((r) => +r.rows[0].n);

  // Main query — LATERAL subquery per row gives us the per-question signal
  // aggregate. With the indexes on session_events (question_id, created_at)
  // this stays cheap until we cross ~1M events.
  params.push(limit, offset);
  const r = await pool.query<{
    id: string;
    hook: string;
    deep_dive: string;
    level: string;
    category: string;
    mode: string;
    cluster: string;
    contributor_username: string;
    language: string;
    is_published: boolean;
    created_at: Date;
    shown: string;
    answered: string;
    reacted: string;
    shared: string;
    skipped: string;
  }>(
    `
      SELECT
        cq.id, cq.hook, cq.deep_dive, cq.level, cq.category, cq.mode,
        cq.cluster, cq.contributor_username, cq.language, cq.is_published,
        cq.created_at,
        COALESCE(s.shown, 0)    AS shown,
        COALESCE(s.answered, 0) AS answered,
        COALESCE(s.reacted, 0)  AS reacted,
        COALESCE(s.shared, 0)   AS shared,
        COALESCE(s.skipped, 0)  AS skipped,
        /* Derived rates exposed so the ORDER BY can reference them */
        (
          (COALESCE(s.answered,0) + COALESCE(s.reacted,0) + COALESCE(s.shared,0))::float
          / NULLIF(COALESCE(s.shown,0), 0)
        ) AS engagement_rate,
        (
          COALESCE(s.skipped,0)::float
          / NULLIF(COALESCE(s.shown,0), 0)
        ) AS skip_rate
      FROM contributed_questions cq
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*) FILTER (WHERE event_type='shown')    AS shown,
          COUNT(*) FILTER (WHERE event_type='answered') AS answered,
          COUNT(*) FILTER (WHERE event_type='reacted')  AS reacted,
          COUNT(*) FILTER (WHERE event_type='shared')   AS shared,
          COUNT(*) FILTER (WHERE event_type='skipped')  AS skipped
        FROM session_events se
        WHERE se.question_id = cq.id
          ${eventWindowSql}
      ) s ON true
      ${whereSql}
      ${havingSql ? "AND " + havingSql.replace(/^AND /, "") : ""}
      ${orderSql}
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `,
    params,
  );

  const questions: CommunityQuestionWithSignals[] = r.rows.map((row) => {
    const shown = +row.shown;
    const answered = +row.answered;
    const reacted = +row.reacted;
    const shared = +row.shared;
    const skipped = +row.skipped;
    return {
      id: row.id,
      hook: row.hook,
      deepDive: row.deep_dive,
      level: row.level,
      category: row.category,
      mode: row.mode,
      cluster: row.cluster,
      contributorUsername: row.contributor_username,
      language: row.language,
      isPublished: row.is_published,
      createdAt: row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
      signals: {
        shown,
        answered,
        reacted,
        shared,
        skipped,
        answerRatePct: pct(answered, shown),
        reactionRatePct: pct(reacted, shown),
        shareRatePct: pct(shared, shown),
        skipRatePct: pct(skipped, shown),
        engagementRatePct: pct(answered + reacted + shared, shown),
      },
    };
  });

  return { windowDays, sort, total, limit, offset, questions };
}

/* ──────────────────────────────────────────────────────────────────────────
   Snapshot — composed result returned by /api/metrics
   ────────────────────────────────────────────────────────────────────────── */

export interface MetricsSnapshot {
  windowDays: number | null;
  generatedAt: string;
  activity: ActivityMetrics;
  engagement: EngagementMetrics;
  funnel: FunnelMetrics;
  quality: QualityMetrics;
  virality: ViralityMetrics;
  community: CommunityMetrics;
  topQuestions: QuestionPerformanceRow[];
}

export async function getMetricsSnapshot(
  windowDays: number | null = 30,
): Promise<MetricsSnapshot> {
  // Run independent queries in parallel — the pool has max:5 so all 7 fit.
  const [activity, engagement, funnel, quality, virality, community, topQuestions] =
    await Promise.all([
      getActivityMetrics(),
      getEngagementMetrics(windowDays),
      getFunnelMetrics(windowDays),
      getQualityMetrics(windowDays),
      getViralityMetrics(windowDays),
      getCommunityMetrics(windowDays),
      getTopQuestionsByAnswerRate(windowDays),
    ]);

  return {
    windowDays,
    generatedAt: new Date().toISOString(),
    activity,
    engagement,
    funnel,
    quality,
    virality,
    community,
    topQuestions,
  };
}

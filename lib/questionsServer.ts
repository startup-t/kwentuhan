import type { Question, Mode, Level } from "./types";
import type { ContributedQuestion } from "./kwento/postgresStore";
import questionsData from "@/data/questions.json";
import { getContributedQuestions, getContributedQuestionById } from "./kwento/postgresStore";

const ALL_STATIC: Question[] = (questionsData as Question[]).map((question) => ({
  ...question,
  contributor: undefined,
  language: undefined,
  isCommunity: false,
}));

function mapContributedQuestion(row: ContributedQuestion): Question {
  return {
    id: row.id,
    hook: row.hook,
    deepDive: row.deepDive,
    level: row.level as Level,
    levelLabel: row.level === "light" ? "Chill" : row.level === "deep" ? "Deep" : "Wild",
    levelColor: row.level === "light" ? "#6C5CE7" : row.level === "deep" ? "#E85C2B" : "#E84393",
    category: row.category,
    categoryLabel: row.category,
    categoryEmoji: "🤔",
    mode: row.mode as Mode,
    cluster: row.cluster,
    isPersonal: row.mode === "solo",
    ageGated: false,
    contributor: row.contributorUsername || "Community Contributor",
    language: row.language,
    isCommunity: true,
  };
}

function filterQuestions(
  questions: Question[],
  mode: Mode,
  category: string | null,
  level?: Level,
) {
  let pool = questions.filter((q) => q.mode === mode);
  if (mode === "solo") {
    pool = pool.filter((q) => q.isPersonal);
  }
  if (category) {
    pool = pool.filter((q) => q.category === category);
  }
  if (level) {
    pool = pool.filter((q) => q.level === level);
  }
  return pool;
}

/* ──────────────────────────────────────────────────────────────────────────
   Server-side caching
   ────────────────────────────────────────────────────────────────────────── */

/**
 * Per-instance in-memory cache for `getPublishedQuestions` results.
 *
 * Why this exists: the merged static + community pool is a hot path — every
 * /api/questions request and every server-rendered /q/[id] page invokes it.
 * Without a memo, every call round-trips to Postgres just to re-read the
 * same `contributed_questions` rows.
 *
 * Scope: per Node.js process. On Vercel each warm function instance gets
 * its own cache; cold starts will hit the DB once to seed. That's fine for
 * our access pattern (questions change rarely, freshness window of a few
 * seconds is acceptable).
 *
 * Invalidation: TTL-based + manual via `bustQuestionsCache()`, which the
 * `/api/contribute` route calls right after publishing a new question so
 * authors see their submission immediately rather than waiting for TTL.
 */
type CacheEntry = { value: Question[]; expiresAt: number };
const QUESTION_TTL_MS = 30_000;

const globalForCache = globalThis as typeof globalThis & {
  __kwentuhanQuestionsCache__?: Map<string, CacheEntry>;
  __kwentuhanContribRowsCache__?: { value: ContributedQuestion[]; expiresAt: number } | null;
};

const questionsCache: Map<string, CacheEntry> =
  globalForCache.__kwentuhanQuestionsCache__ ?? new Map();
if (!globalForCache.__kwentuhanQuestionsCache__) {
  globalForCache.__kwentuhanQuestionsCache__ = questionsCache;
}

function cacheKey(mode: Mode, category: string | null, level?: Level): string {
  return `${mode}|${category ?? "*"}|${level ?? "*"}`;
}

/**
 * Drops every memoized question pool. Called after a successful
 * /api/contribute so the new row appears in the next read without waiting
 * for the TTL.
 */
export function bustQuestionsCache(): void {
  questionsCache.clear();
  globalForCache.__kwentuhanContribRowsCache__ = null;
}

/**
 * Fetch the full contributed_questions table once per TTL window, then
 * filter in-memory for each (mode, category, level) variant. Cheaper than
 * one DB query per variant when many filters are accessed in a session.
 */
async function getAllContributedRows(): Promise<ContributedQuestion[]> {
  const cached = globalForCache.__kwentuhanContribRowsCache__;
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }
  const rows = await getContributedQuestions();
  globalForCache.__kwentuhanContribRowsCache__ = {
    value: rows,
    expiresAt: Date.now() + QUESTION_TTL_MS,
  };
  return rows;
}

/* ──────────────────────────────────────────────────────────────────────────
   Public API
   ────────────────────────────────────────────────────────────────────────── */

/**
 * Returns the merged question pool (static + community), filtered by mode
 * and optionally category / level. Memoized for ~30s per process; call
 * `bustQuestionsCache()` to force a refresh sooner.
 */
export async function getPublishedQuestions(
  mode: Mode,
  category: string | null,
  level?: Level,
): Promise<Question[]> {
  const key = cacheKey(mode, category, level);
  const hit = questionsCache.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.value;
  }

  const staticQuestions = filterQuestions(ALL_STATIC, mode, category, level);
  const contributedRows = await getAllContributedRows();
  // Filter the prefetched rows in-memory rather than per-call to the DB.
  const filteredRows = contributedRows.filter((r) => {
    if (r.mode !== mode) return false;
    if (category && r.category !== category) return false;
    if (level && r.level !== level) return false;
    return true;
  });
  const contributedQuestions = filteredRows.map(mapContributedQuestion);
  const value = [...staticQuestions, ...contributedQuestions];

  questionsCache.set(key, { value, expiresAt: Date.now() + QUESTION_TTL_MS });
  return value;
}

export async function getPublishedQuestionCount(
  mode: Mode,
  category: string | null,
): Promise<number> {
  return (await getPublishedQuestions(mode, category)).length;
}

export async function getQuestionById(questionId: string): Promise<Question | undefined> {
  const staticQuestion = ALL_STATIC.find((q) => String(q.id) === String(questionId));
  if (staticQuestion) {
    return staticQuestion;
  }

  const contributed = await getContributedQuestionById(questionId);
  if (!contributed) {
    return undefined;
  }

  return mapContributedQuestion(contributed);
}

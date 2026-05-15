// lib/questions.ts — Kwentuhan question utilities (client + server-safe)

import type { Question, Mode, Level } from "./types";
import questionsData from "@/data/questions.json";

const ALL_STATIC: Question[] = questionsData as Question[];

/* ──────────────────────────────────────────────────────────────────────────
   Client-side cache for /api/questions responses
   ──────────────────────────────────────────────────────────────────────────

   Why this exists: many components (LandingScreen, CategoryScreen, useSession,
   etc.) call `getQuestions` on mount. Without dedup, parallel mounts trigger
   parallel network requests for the same data. The cache solves two problems:

   1. In-flight dedup: a second call for the same params while the first is
      still pending returns the same Promise — exactly one network request
      regardless of caller count.
   2. Short-lived response cache: a follow-up call within the TTL window
      returns the cached array without any network. New contributions appear
      within ~30s without manual refresh; faster via `clearQuestionCache()`.
   ────────────────────────────────────────────────────────────────────────── */

type CacheRecord = { value: Question[]; expiresAt: number };
const CLIENT_TTL_MS = 30_000;

const responseCache = new Map<string, CacheRecord>();
const inFlight = new Map<string, Promise<Question[]>>();

function cacheKey(mode: Mode, category: string | null, level?: Level): string {
  return `${mode}|${category ?? "*"}|${level ?? "*"}`;
}

/**
 * Force a refresh of the client cache (e.g. right after a contribute success).
 * Components mounted after this call will re-fetch from /api/questions.
 */
export function clearQuestionCache(): void {
  responseCache.clear();
  inFlight.clear();
}

async function fetchFromApi(
  mode: Mode,
  category: string | null,
  level?: Level,
): Promise<Question[]> {
  const params = new URLSearchParams();
  params.set("mode", mode);
  params.set("category", category ?? "null");
  if (level) params.set("level", level);

  const res = await fetch(`/api/questions?${params}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`/api/questions returned ${res.status}`);
  }
  const data = (await res.json()) as { questions?: Question[] };
  return Array.isArray(data.questions) ? data.questions : [];
}

function filterStatic(
  mode: Mode,
  category: string | null,
  level?: Level,
): Question[] {
  let pool = ALL_STATIC.filter((q) => q.mode === mode);
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
   Public API
   ────────────────────────────────────────────────────────────────────────── */

/**
 * Returns the merged question pool (static + community).
 *
 * In the browser this is the single source of truth — backed by
 * `/api/questions`, deduped per (mode, category, level) key, and cached for
 * ~30 seconds. Multiple parallel callers share a single network round-trip.
 *
 * On the server this returns only the static pool (the merged version lives
 * in `lib/questionsServer.ts.getPublishedQuestions` and is server-only).
 *
 * Pass `category=null` for "all categories", and omit `level` for "all
 * levels".
 */
export async function getQuestions(
  mode: Mode,
  category: string | null,
  level?: Level,
): Promise<Question[]> {
  // Server (RSC / route handlers): use the server module instead. We can't
  // import it here without dragging pg into client bundles.
  if (typeof window === "undefined") {
    return filterStatic(mode, category, level);
  }

  const key = cacheKey(mode, category, level);

  // Cache hit — return immediately
  const cached = responseCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  // Already fetching? Reuse the in-flight promise so parallel callers share
  // one network request.
  const pending = inFlight.get(key);
  if (pending) return pending;

  const promise = fetchFromApi(mode, category, level)
    .then((value) => {
      responseCache.set(key, { value, expiresAt: Date.now() + CLIENT_TTL_MS });
      inFlight.delete(key);
      return value;
    })
    .catch((err) => {
      inFlight.delete(key);
      console.warn("[getQuestions] fetch failed, falling back to static:", err);
      // Fallback: never leave the UI empty. Filter the bundled static pool
      // so the deck still works offline / mid-failure.
      const fallback = filterStatic(mode, category, level);
      // Don't cache the fallback — we want the next call to retry.
      return fallback;
    });

  inFlight.set(key, promise);
  return promise;
}

/** Fisher-Yates shuffle with a numeric seed */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export async function buildSession(
  mode: Mode,
  category: string | null,
  seed?: number,
): Promise<Question[]> {
  const pool = await getQuestions(mode, category);
  return seededShuffle(pool, seed ?? Date.now());
}

export async function getQuestionCount(
  mode: Mode,
  category: string | null,
): Promise<number> {
  const pool = await getQuestions(mode, category);
  return pool.length;
}

/**
 * Sync, static-only lookup by id. Use the async server-side equivalent in
 * `lib/questionsServer.ts.getQuestionById` if you also need to resolve
 * community questions (id like `q_*`).
 */
export function getQuestionById(id: number | string): Question | undefined {
  return ALL_STATIC.find((q) => String(q.id) === String(id));
}

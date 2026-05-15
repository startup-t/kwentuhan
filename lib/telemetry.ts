"use client";

/**
 * Client-side telemetry for the future question-quality graph.
 *
 * Design rules (from the spec):
 *   - Fire-and-forget — never blocks the UI
 *   - Fails silently — telemetry breakage MUST NOT surface to users
 *   - Persists session_id in localStorage across reloads
 *   - No auth required
 *   - Batches when possible
 *
 * Implementation:
 *   - Events go onto an in-memory queue
 *   - The queue auto-flushes every FLUSH_MS (or sooner if FLUSH_BATCH is hit)
 *   - On page unload / visibility-hidden we drain via `navigator.sendBeacon`
 *     so events that fire right before navigation aren't lost
 *   - On the server we no-op (this module is "use client" but defensively
 *     guards window access anyway)
 */

const ENDPOINT = "/api/session-event";
const STORAGE_KEY = "kw.sessionId";
const FLUSH_MS = 2_000;
const FLUSH_BATCH = 10;
const MAX_QUEUE = 100;

export type EventType =
  | "shown"
  | "skipped"
  | "answered"
  | "shared"
  | "reacted";

export type TrackInput = {
  questionId: string | number;
  eventType: EventType;
  /** Length of the answer in characters, only meaningful for `answered`. */
  answerLengthChars?: number;
  /** Milliseconds between `shown` and the current event, useful for `answered`. */
  dwellMs?: number;
  /** Optional user handle / token if we ever have auth. */
  userToken?: string | null;
};

/* ──────────────────────────────────────────────────────────────────────────
   session_id management — persists in localStorage across reloads.
   ────────────────────────────────────────────────────────────────────────── */

function makeSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback: ~122 bits of entropy in a URL-safe string.
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10)
  );
}

let cachedSessionId: string | null = null;

/**
 * Returns the device's stable session_id. Generates one on first call and
 * persists it forever in localStorage. Each browser/device = one session_id
 * until the user clears storage.
 *
 * Session-windowing (e.g., "this kwento was answered in the same party") is
 * intentionally NOT done client-side — the analytical layer can cluster
 * events by 30-minute windows in SQL. Keeping the client dumb makes the
 * system more robust.
 */
export function getSessionId(): string {
  if (cachedSessionId) return cachedSessionId;
  if (typeof window === "undefined") {
    // SSR / RSC — synthesize a transient id; this path shouldn't actually
    // fire events because the queue + fetch live in the browser.
    cachedSessionId = "ssr_" + Math.random().toString(36).slice(2, 10);
    return cachedSessionId;
  }
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing && existing.length > 0) {
      cachedSessionId = existing;
      return existing;
    }
  } catch {
    /* localStorage disabled — fall through */
  }
  const fresh = makeSessionId();
  cachedSessionId = fresh;
  try {
    window.localStorage.setItem(STORAGE_KEY, fresh);
  } catch {
    /* ignore — events will still send with the in-memory id for this tab */
  }
  return fresh;
}

/* ──────────────────────────────────────────────────────────────────────────
   Queue + flush
   ────────────────────────────────────────────────────────────────────────── */

type WireEvent = {
  session_id: string;
  user_token: string | null;
  question_id: string;
  event_type: EventType;
  answer_length_chars: number | null;
  dwell_ms: number | null;
};

const queue: WireEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let listenersInstalled = false;

function installUnloadListenersOnce() {
  if (listenersInstalled || typeof window === "undefined") return;
  listenersInstalled = true;
  // pagehide is more reliable than beforeunload on mobile Safari + Chrome
  window.addEventListener("pagehide", drainViaBeacon);
  window.addEventListener("beforeunload", drainViaBeacon);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") drainViaBeacon();
  });
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, FLUSH_MS);
}

function flush() {
  if (queue.length === 0) return;
  const batch = queue.splice(0, FLUSH_BATCH);
  // fire-and-forget; never throws
  void fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ events: batch }),
    // keepalive lets the request survive a navigation that fires
    // immediately after the call
    keepalive: true,
  }).catch(() => {
    /* silent — telemetry never breaks UX */
  });
  // If there's more in the queue, schedule the next flush
  if (queue.length > 0) scheduleFlush();
}

function drainViaBeacon() {
  if (queue.length === 0) return;
  const batch = queue.splice(0, queue.length);
  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([JSON.stringify({ events: batch })], {
        type: "application/json",
      });
      navigator.sendBeacon(ENDPOINT, blob);
      return;
    }
  } catch {
    /* fall through */
  }
  // Fallback — synchronous-ish fetch with keepalive
  try {
    void fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: batch }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    /* silent */
  }
}

/* ──────────────────────────────────────────────────────────────────────────
   Public API
   ────────────────────────────────────────────────────────────────────────── */

/**
 * Track a single session event. Non-blocking, never throws, never logs to
 * console on failure. Safe to call from anywhere (SSR-safe — server-side
 * calls are dropped).
 */
export function track(input: TrackInput): void {
  if (typeof window === "undefined") return;
  installUnloadListenersOnce();

  try {
    const sessionId = getSessionId();
    const event: WireEvent = {
      session_id: sessionId,
      user_token: input.userToken ?? null,
      question_id: String(input.questionId),
      event_type: input.eventType,
      answer_length_chars:
        typeof input.answerLengthChars === "number" && Number.isFinite(input.answerLengthChars)
          ? Math.max(0, Math.floor(input.answerLengthChars))
          : null,
      dwell_ms:
        typeof input.dwellMs === "number" && Number.isFinite(input.dwellMs)
          ? Math.max(0, Math.floor(input.dwellMs))
          : null,
    };

    queue.push(event);
    if (queue.length > MAX_QUEUE) {
      // Hard cap — drop oldest. Better to lose old events than balloon memory.
      queue.splice(0, queue.length - MAX_QUEUE);
    }

    if (queue.length >= FLUSH_BATCH) {
      flush();
    } else {
      scheduleFlush();
    }
  } catch {
    /* swallow — telemetry is never allowed to fault the caller */
  }
}

/**
 * Manually flush the queue. Most callers don't need this — the queue
 * auto-flushes on a timer and on page-unload. Exposed for tests + for any
 * caller that genuinely wants to force-send (e.g., right before an external
 * navigation we don't control).
 */
export function flushTelemetry(): void {
  flush();
}

/**
 * Session-event telemetry — the foundation of the long-term question-quality
 * graph (data moat #1 from the strategy work).
 *
 * Design philosophy: "capture everything cleanly from day one." This module
 * deliberately does NOT analyze, score, or aggregate — it only persists raw
 * events. The eventual personalization / recommendation layer reads from this
 * table; today we're just banking the data.
 *
 * Decoupled from `postgresStore.ts` on purpose:
 *   - `postgresStore.ts` holds user-facing data (shared kwentos, contributed
 *     questions). Failure there is a user-visible error.
 *   - `telemetryStore.ts` holds analytical data. Failure here MUST be silent
 *     — telemetry is never allowed to break the UX.
 *
 * Pool is reused from `postgresStore.ts` via the same globalThis cache so we
 * don't double-allocate connections to Supabase pooler.
 */

import { Pool } from "pg";

const globalForPostgres = globalThis as typeof globalThis & {
  __kwentuhanPostgresPool__?: Pool;
  __kwentuhanTelemetryInit__?: Promise<void>;
};

const VALID_EVENT_TYPES = new Set([
  "shown",
  "skipped",
  "answered",
  "shared",
  "reacted",
]);

export type SessionEventType =
  | "shown"
  | "skipped"
  | "answered"
  | "shared"
  | "reacted";

export type SessionEventInput = {
  sessionId: string;
  userToken?: string | null;
  questionId: string;
  eventType: SessionEventType;
  answerLengthChars?: number | null;
  dwellMs?: number | null;
};

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

/**
 * Idempotent table creation. Runs once per process via the globalThis-cached
 * init promise. The CHECK constraint on event_type enforces the enum at the DB
 * level so bad data never lands even if the route handler is bypassed.
 */
async function ensureTelemetryTable(): Promise<void> {
  if (!globalForPostgres.__kwentuhanTelemetryInit__) {
    globalForPostgres.__kwentuhanTelemetryInit__ = (async () => {
      const pool = getPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS session_events (
          id                  BIGSERIAL PRIMARY KEY,
          session_id          TEXT NOT NULL,
          user_token          TEXT,
          question_id         TEXT NOT NULL,
          event_type          TEXT NOT NULL
            CHECK (event_type IN ('shown','skipped','answered','shared','reacted')),
          answer_length_chars INTEGER,
          dwell_ms            INTEGER,
          created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      // Indexes — match the spec exactly. session_id + created_at is the
      // expected query pattern for session-replay (all events for a session
      // ordered by time), so the composite index pays off later.
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_session_events_session_id ON session_events (session_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_session_events_question_id ON session_events (question_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_session_events_event_type ON session_events (event_type)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_session_events_created_at ON session_events (created_at DESC)`);
    })();
  }
  await globalForPostgres.__kwentuhanTelemetryInit__;
}

/**
 * Validate + clamp a raw event from the wire. Returns null if the event is
 * malformed; the caller should drop nulls.
 */
export function normalizeSessionEvent(raw: unknown): SessionEventInput | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  const sessionId =
    typeof o.session_id === "string" && o.session_id.trim().length > 0
      ? o.session_id.trim().slice(0, 128)
      : "";
  const questionId =
    typeof o.question_id === "string" && o.question_id.trim().length > 0
      ? o.question_id.trim().slice(0, 128)
      : "";
  const eventType =
    typeof o.event_type === "string" && VALID_EVENT_TYPES.has(o.event_type)
      ? (o.event_type as SessionEventType)
      : null;
  if (!sessionId || !questionId || !eventType) return null;

  const userToken =
    typeof o.user_token === "string" && o.user_token.trim().length > 0
      ? o.user_token.trim().slice(0, 128)
      : null;

  const answerLengthChars =
    typeof o.answer_length_chars === "number" &&
    Number.isFinite(o.answer_length_chars) &&
    o.answer_length_chars >= 0
      ? Math.min(Math.floor(o.answer_length_chars), 100_000)
      : null;

  const dwellMs =
    typeof o.dwell_ms === "number" &&
    Number.isFinite(o.dwell_ms) &&
    o.dwell_ms >= 0
      ? Math.min(Math.floor(o.dwell_ms), 24 * 60 * 60 * 1000) // cap at 24h
      : null;

  return { sessionId, userToken, questionId, eventType, answerLengthChars, dwellMs };
}

/**
 * Insert a batch of events in a single round-trip. Each event becomes one
 * row. Empty arrays are no-ops.
 */
export async function insertSessionEvents(events: SessionEventInput[]): Promise<void> {
  if (events.length === 0) return;
  await ensureTelemetryTable();
  const pool = getPool();

  // Build a single multi-VALUES INSERT. Pg's parameterized array binding
  // would also work but this keeps the SQL legible and works for batches up
  // to ~1000 rows (one POST shouldn't exceed that).
  const values: unknown[] = [];
  const placeholders: string[] = [];
  events.forEach((e, i) => {
    const base = i * 6;
    placeholders.push(
      `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`,
    );
    values.push(
      e.sessionId,
      e.userToken,
      e.questionId,
      e.eventType,
      e.answerLengthChars,
      e.dwellMs,
    );
  });

  await pool.query(
    `
      INSERT INTO session_events
        (session_id, user_token, question_id, event_type, answer_length_chars, dwell_ms)
      VALUES ${placeholders.join(", ")}
    `,
    values,
  );
}

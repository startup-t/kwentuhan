import { NextResponse } from "next/server";
import {
  insertSessionEvents,
  normalizeSessionEvent,
  type SessionEventInput,
} from "@/lib/kwento/telemetryStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BATCH = 100;

/**
 * POST /api/session-event
 *
 * Foundation for the question-quality graph (data moat).
 *
 * Accepts either:
 *   - a single event object, OR
 *   - `{ events: [...] }` for batched inserts
 *
 * Body fields per event (snake_case to match the wire format):
 *   - session_id          (string, required)
 *   - question_id         (string, required)
 *   - event_type          ('shown' | 'skipped' | 'answered' | 'shared' | 'reacted', required)
 *   - user_token          (string, optional)
 *   - answer_length_chars (number, optional)
 *   - dwell_ms            (number, optional)
 *
 * Always returns 200 unless the request is structurally malformed (400) or
 * the server hits an unexpected error (500 — still drops the event silently,
 * client should not retry on this category since the client logging path is
 * fire-and-forget by design).
 *
 * Malformed events inside a batch are dropped silently; valid events from
 * the same batch are still persisted.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let rawEvents: unknown[];
  if (Array.isArray(body)) {
    rawEvents = body;
  } else if (
    body &&
    typeof body === "object" &&
    Array.isArray((body as { events?: unknown }).events)
  ) {
    rawEvents = (body as { events: unknown[] }).events;
  } else if (body && typeof body === "object") {
    rawEvents = [body];
  } else {
    return NextResponse.json({ error: "Expected event or events[]" }, { status: 400 });
  }

  if (rawEvents.length === 0) {
    return NextResponse.json({ accepted: 0 });
  }
  if (rawEvents.length > MAX_BATCH) {
    rawEvents = rawEvents.slice(0, MAX_BATCH);
  }

  const events: SessionEventInput[] = [];
  for (const raw of rawEvents) {
    const e = normalizeSessionEvent(raw);
    if (e) events.push(e);
  }

  if (events.length === 0) {
    // All events were malformed — return 200 anyway so the fire-and-forget
    // client doesn't have to handle this case. (Spec: "return 200 OK always
    // unless malformed request" — the request itself parsed, so 200.)
    return NextResponse.json({ accepted: 0, dropped: rawEvents.length });
  }

  try {
    await insertSessionEvents(events);
    return NextResponse.json({ accepted: events.length });
  } catch (err) {
    console.error("[/api/session-event] insert failed:", err);
    // Tell the client we "accepted" so they don't retry — the client's
    // queue has already moved on. Telemetry is allowed to drop on the floor.
    return NextResponse.json({ accepted: 0, error: "insert_failed" }, { status: 500 });
  }
}

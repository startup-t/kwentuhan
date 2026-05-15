"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface FollowUpQuestionCardProps {
  /** The original (just-published) question text. */
  hook: string;
  /** Mode of the original question — passed to the generation prompt. */
  mode: string;
  /** Category key of the original question — passed to the generation prompt. */
  category: string;
  /** Optional callback fired when generation succeeds. Useful for parents
   *  that want to persist the generated text. */
  onGenerated?: (followUp: string) => void;
}

type Status = "loading" | "ready" | "error" | "unavailable";

/**
 * Renders a "Deep Dive" follow-up beneath an original question card.
 *
 *   Visual model:
 *     - Lighter background than the parent kw-card
 *     - Threaded connector line (top-left vertical bar)
 *     - "↳ Deep Dive" label in accent color
 *     - Slight left-indent to reinforce reply hierarchy
 *
 *   Lifecycle:
 *     - Mount → fires `POST /api/follow-up` ONCE (StrictMode-safe via ref guard)
 *     - Skeleton renders while pending
 *     - On 503 (generation not configured) → hides itself entirely
 *     - On any other failure → small inline retry affordance
 *     - Abort-safe if the parent unmounts mid-flight
 */
export default function FollowUpQuestionCard({
  hook,
  mode,
  category,
  onGenerated,
}: FollowUpQuestionCardProps) {
  const [status, setStatus] = useState<Status>("loading");
  const [text, setText] = useState("");
  const requestedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchFollowUp = useCallback(async () => {
    // Cancel any in-flight request before starting a new one (retry).
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setStatus("loading");
    setText("");

    // Hard timeout — if the AI gateway is hung or extremely slow, hide the
    // card rather than leaving a permanent shimmer (visible-bug fix).
    // 8 seconds is generous: a typical generation completes in 1–2s, and
    // the user has long since moved on from a 5+ second wait.
    const TIMEOUT_MS = 8_000;
    let timedOut = false;
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      ac.abort();
    }, TIMEOUT_MS);

    try {
      const res = await fetch("/api/follow-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hook, mode, category }),
        signal: ac.signal,
      });

      if (res.status === 503) {
        // Feature not configured — hide silently rather than leaving an error chip.
        setStatus("unavailable");
        return;
      }

      if (!res.ok) {
        throw new Error(`Follow-up request failed: ${res.status}`);
      }

      const data = (await res.json()) as { followUp?: string };
      const followUp = typeof data?.followUp === "string" ? data.followUp.trim() : "";
      if (!followUp) throw new Error("Empty follow-up");

      setText(followUp);
      setStatus("ready");
      onGenerated?.(followUp);
    } catch (err) {
      if ((err as Error)?.name === "AbortError") {
        // Distinguish a true unmount-abort from our own timeout-abort.
        // On timeout, hide the card just like the 503 path — no error UI.
        if (timedOut) setStatus("unavailable");
        return;
      }
      console.error("[FollowUpQuestionCard] generation failed:", err);
      setStatus("error");
    } finally {
      window.clearTimeout(timeoutId);
    }
  }, [hook, mode, category, onGenerated]);

  useEffect(() => {
    if (requestedRef.current) return;
    requestedRef.current = true;
    fetchFollowUp();
    return () => abortRef.current?.abort();
  }, [fetchFollowUp]);

  if (status === "unavailable") {
    // Per spec: no empty card. Hiding entirely is the correct fallback.
    return null;
  }

  if (status === "error") {
    return (
      <div
        className="rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
        style={{
          background: "var(--kw-surface-alt)",
          border: "1px dashed var(--kw-border-solid)",
        }}
        role="status"
      >
        <span className="text-xs" style={{ color: "var(--kw-subtext)" }}>
          Couldn&apos;t draft a follow-up.
        </span>
        <button
          type="button"
          onClick={fetchFollowUp}
          className="text-xs font-semibold underline transition-colors"
          style={{ color: "var(--kw-accent)" }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="relative" style={{ marginLeft: 8 }}>
      {/* Threading connector — links visually to the question card above */}
      <div
        aria-hidden
        className="absolute -top-3"
        style={{
          left: 22,
          width: 2,
          height: 12,
          background: "var(--kw-border-solid)",
          borderRadius: 1,
        }}
      />

      <div
        className="kw-card kw-slide-up p-4 flex flex-col gap-2"
        style={{
          background: "var(--kw-surface-alt)",
          border: "1px solid var(--kw-border-solid)",
          boxShadow: "0 2px 12px rgba(108,92,231,0.06)",
        }}
        aria-live="polite"
        aria-busy={status === "loading"}
      >
        <span
          className="text-[0.625rem] font-bold uppercase tracking-[0.18em] flex items-center gap-1.5"
          style={{ color: "var(--kw-accent)" }}
        >
          <span aria-hidden>↳</span>
          <span>Deep Dive</span>
        </span>

        {status === "loading" ? (
          <div className="flex flex-col gap-2 py-1" aria-label="Generating a follow-up">
            <div className="kw-shimmer h-3.5 rounded-md" style={{ width: "88%" }} />
            <div className="kw-shimmer h-3.5 rounded-md" style={{ width: "62%" }} />
          </div>
        ) : (
          <p
            className="text-[0.9375rem] leading-snug"
            style={{
              color: "var(--kw-text)",
              fontFamily: "var(--font-playfair), serif",
            }}
          >
            {text}
          </p>
        )}
      </div>
    </div>
  );
}

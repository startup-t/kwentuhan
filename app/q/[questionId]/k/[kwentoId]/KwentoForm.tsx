"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { Question } from "@/lib/types";
import KwentoExportPanel from "@/components/share/KwentoExportPanel";
import { track } from "@/lib/telemetry";

type KwentoFormProps = {
  questionId: string;
  questionText: string;
  /**
   * Full question object. Required when present so the post-submit final
   * screen can render the shared `KwentoExportPanel` (StoryCard + download)
   * with proper level / category / cluster styling.
   *
   * Marked optional so existing call sites that haven't been updated yet
   * still type-check; if missing, the panel falls back to a minimal Question
   * synthesized from the text + id.
   */
  question?: Question;
  heading?: string;
  subheading?: string;
};

type Stage = "idle" | "loading" | "success" | "error";

const MAX_CHARS = 500;

export function KwentoForm({
  questionId,
  questionText,
  question,
  heading = "Your turn",
  subheading = "Write your answer and we'll spin up a shareable link for you.",
}: KwentoFormProps) {
  const [text, setText] = useState("");
  const [submittedAnswer, setSubmittedAnswer] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [revealUrl, setRevealUrl] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Capture mount-time for the `answered` event's dwell_ms calculation.
  // Persisted in a ref so it survives re-renders without retriggering effects.
  const mountedAtRef = useRef<number>(Date.now());

  // When the user lands here via the Answer button on the contribute success
  // screen (?answer=1), scroll the form into view and focus the textarea so
  // they can start typing immediately. One-shot — only fires on first mount.
  const searchParams = useSearchParams();
  const shouldAutoAnswer = searchParams?.get("answer") === "1";
  useEffect(() => {
    if (!shouldAutoAnswer) return;
    const ta = textareaRef.current;
    if (!ta) return;
    const raf = requestAnimationFrame(() => {
      ta.scrollIntoView({ behavior: "smooth", block: "center" });
      ta.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const charsLeft = MAX_CHARS - text.length;
  const canSubmit = text.trim().length > 0 && stage !== "loading";

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimmed = text.trim();
      if (!trimmed || stage === "loading") return;

      setStage("loading");
      setErrorMsg("");

      try {
        const res = await fetch("/api/kwento", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionId,
            questionText,
            answerText: trimmed,
            isTeaser: true,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setErrorMsg(
            typeof data?.error === "string"
              ? data.error
              : "Something went wrong. Please try again."
          );
          setStage("error");
          return;
        }

        if (typeof data?.revealUrl === "string" && data.revealUrl.length > 0) {
          setRevealUrl(data.revealUrl);
          setSubmittedAnswer(trimmed);
          setStage("success");

          // Telemetry: log the answered event. `dwell_ms` measures time from
          // the form mounting (which is roughly when the user landed on the
          // page) to actual submission. `answer_length_chars` is the trimmed
          // body length. Fire-and-forget — silent failure inside `track`.
          track({
            questionId,
            eventType: "answered",
            answerLengthChars: trimmed.length,
            dwellMs: Date.now() - mountedAtRef.current,
          });

          return;
        }

        setErrorMsg("Kwento saved, but couldn't generate the reveal link.");
        setStage("error");
      } catch {
        setErrorMsg("No internet connection. Please try again.");
        setStage("error");
      }
    },
    [text, stage, questionId, questionText]
  );

  const handleReset = useCallback(() => {
    setStage("idle");
    setErrorMsg("");
    setRevealUrl("");
    setSubmittedAnswer("");
    setText("");
    setTimeout(() => textareaRef.current?.focus(), 60);
  }, []);

  // ── Success state ──────────────────────────────────────────────────────────
  //
  // After a successful submission, User 2 sees the SAME final-state UI as User 1:
  // the shared `KwentoExportPanel` with the StoryCard preview, style chips,
  // teaser toggle, PNG download, and social-share row. The previously bespoke
  // "💫 Your kwento is live" + standalone QR + Copy pill has been retired in
  // favor of this unified system.
  if (stage === "success") {
    // Synthesize a minimal Question if the parent didn't pass one through.
    // The render is still correct — just uses default Chill / generic styling.
    const effectiveQuestion: Question = question ?? {
      id: questionId,
      hook: questionText,
      deepDive: "",
      level: "light",
      levelLabel: "Chill",
      levelColor: "#6C5CE7",
      category: "selfCheck",
      categoryLabel: "",
      categoryEmoji: "🤔",
      mode: "solo",
      cluster: "solo",
      isPersonal: true,
      ageGated: false,
    };

    return (
      <div className="w-full kw-card p-2 sm:p-3">
        <KwentoExportPanel
          question={effectiveQuestion}
          answer={submittedAnswer}
          initialRevealUrl={revealUrl}
          /* Per the "fast party-friendly" UX: land on the preview in
           * download-ready mode (no blur, no QR-to-reveal). Users can opt
           * into the teaser/scan-to-reveal experience via the toggle. */
          initialTeaser={false}
          footer={
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-medium text-center w-full py-1 transition-colors"
              style={{ color: "var(--kw-subtext)" }}
            >
              Write another kwento →
            </button>
          }
        />
      </div>
    );
  }

  // ── Idle / loading / error state ──────────────────────────────────────────
  //
  // Compact layout optimized for the Scan-to-Reveal flow: heading + textarea
  // + submit button must all fit above the fold on a 375x812 mobile viewport.
  // Trimmed compared to the standalone /q/[id] flow:
  //   - p-5 instead of p-6 (slimmer card)
  //   - gap-3 instead of gap-5 (tighter vertical rhythm)
  //   - 3-row textarea instead of 5 (saves ~80px)
  //   - char counter only appears past 60% used (less visual chatter)
  //   - no "your kwento is unlisted" disclaimer (moved to /privacy if you
  //     want it discoverable later)
  return (
    <div className="w-full kw-card p-5 flex flex-col gap-3">
      {/* Heading */}
      <div>
        <h3
          className="text-base font-bold flex items-center gap-2"
          style={{ fontFamily: "var(--font-playfair), serif", color: "var(--kw-text)" }}
        >
          <span>{heading}</span>
          <span aria-hidden>✍️</span>
        </h3>
        <p className="text-[0.8125rem] mt-0.5" style={{ color: "var(--kw-subtext)" }}>
          {subheading}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {/* Textarea — 3 rows by default; users can drag-resize if needed */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            required
            minLength={1}
            maxLength={MAX_CHARS}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (stage === "error") setStage("idle");
            }}
            placeholder="Ikwento mo naman…"
            rows={3}
            className="w-full resize-none rounded-2xl px-4 py-3 text-[0.9375rem] leading-relaxed outline-none transition-shadow focus:ring-2"
            style={{
              fontFamily: "var(--font-kalam), cursive",
              background: "var(--kw-surface-alt)",
              color: "var(--kw-note-ink)",
              border: stage === "error"
                ? "1.5px solid var(--kw-wild)"
                : "1.5px solid var(--kw-border-solid)",
              // @ts-expect-error — custom property
              "--tw-ring-color": "var(--kw-accent)",
            }}
          />
          {/* Char counter — only appears once meaningfully used */}
          {text.length > MAX_CHARS * 0.6 && (
            <span
              className="absolute bottom-2 right-3 text-[0.6875rem] font-medium tabular-nums pointer-events-none"
              style={{ color: charsLeft < 40 ? "var(--kw-wild)" : "var(--kw-muted)" }}
            >
              {charsLeft}
            </span>
          )}
        </div>

        {/* Error message */}
        {stage === "error" && errorMsg && (
          <div
            className="flex items-start gap-2 rounded-xl px-3 py-2 text-xs"
            style={{ background: "var(--kw-wild-soft)", color: "var(--kw-wild-text)" }}
          >
            <span className="shrink-0 mt-px">⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Submit — primary, always visible */}
        <button
          type="submit"
          disabled={!canSubmit}
          className="btn-primary w-full py-[0.9375rem] text-[0.9375rem] flex items-center justify-center gap-2 transition-opacity"
          style={{ opacity: canSubmit ? 1 : 0.45, cursor: canSubmit ? "pointer" : "not-allowed" }}
        >
          {stage === "loading" ? (
            <>
              <Spinner />
              <span>Sharing…</span>
            </>
          ) : (
            <>
              <span>✨</span>
              <span>Share your kwento</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden
      className="kw-spin"
    >
      <circle cx="9" cy="9" r="7.5" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" />
      <path
        d="M9 1.5a7.5 7.5 0 0 1 7.5 7.5"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

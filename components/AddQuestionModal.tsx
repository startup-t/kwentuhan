"use client";

import { useEffect, useState } from "react";

interface Props {
  onClose: () => void;
  onSubmit?: (text: string) => void;
}

const MAX_LEN = 220;
const STORAGE_KEY = "kw.pendingContributions";

export default function AddQuestionModal({ onClose, onSubmit }: Props) {
  const [text, setText] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const trimmed = text.trim();
  const tooShort = trimmed.length < 8;

  async function handleSubmit() {
    if (tooShort || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/contribute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hook: trimmed,
          deepDive: "",
          level: "light",
          category: "selfCheck",
          mode: "solo",
          cluster: "solo",
          contributorUsername: "Community Contributor",
          language: "en",
        }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      // Still store locally as backup
      const raw = localStorage.getItem(STORAGE_KEY);
      const queue: string[] = raw ? JSON.parse(raw) : [];
      queue.push(trimmed);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
      onSubmit?.(trimmed);
      setDone(true);
      setTimeout(onClose, 1100);
    } catch (error) {
      console.error("Failed to submit question:", error);
      // Fallback to localStorage only
      const raw = localStorage.getItem(STORAGE_KEY);
      const queue: string[] = raw ? JSON.parse(raw) : [];
      queue.push(trimmed);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
      onSubmit?.(trimmed);
      setDone(true);
      setTimeout(onClose, 1100);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="kw-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Contribute a question"
    >
      <div
        className="kw-sheet w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: "var(--kw-border)" }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3">
          <h3 className="font-bold text-base" style={{ color: "var(--kw-text)" }}>
            Contribute a Question
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center btn-secondary text-xs"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        {done ? (
          <div className="px-6 pb-8 pt-2 text-center">
            <div className="text-4xl mb-3">🙌</div>
            <p className="text-[0.9375rem] font-semibold" style={{ color: "var(--kw-text)" }}>
              Salamat! Question saved.
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--kw-subtext)" }}>
              We&apos;ll review and add the best ones to the deck.
            </p>
          </div>
        ) : (
          <>
            <div className="px-6 pb-2">
              <p className="text-[0.8125rem] mb-3" style={{ color: "var(--kw-subtext)" }}>
                Got a kwento-worthy question? Drop it here and we&apos;ll review it.
              </p>
              <textarea
                value={text}
                onChange={e => setText(e.target.value.slice(0, MAX_LEN))}
                placeholder="e.g. Anong pinakamalaking risk na ginawa mo para sa pag-ibig?"
                autoFocus
                rows={4}
                className="w-full rounded-2xl px-4 py-3 text-[0.9375rem] leading-snug resize-none outline-none transition-all duration-150"
                style={{
                  background: "var(--kw-surface-alt)",
                  border: "1.5px solid var(--kw-border)",
                  color: "var(--kw-text)",
                  fontFamily: "var(--font-dm-sans), sans-serif",
                  minHeight: 108,
                }}
              />
              <div className="flex justify-end mt-1.5">
                <span className="text-[0.6875rem]" style={{ color: "var(--kw-muted)" }}>
                  {trimmed.length}/{MAX_LEN}
                </span>
              </div>
            </div>

            <div className="px-6 pb-6 pt-1 flex flex-col gap-2.5">
              <button
                onClick={handleSubmit}
                disabled={tooShort || submitting}
                className="btn-primary w-full py-[1.0625rem] text-[0.9375rem] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span
                    style={{
                      display: "inline-block",
                      width: 16, height: 16,
                      borderRadius: "50%",
                      border: "2px solid white",
                      borderTopColor: "transparent",
                      animation: "spin 0.7s linear infinite",
                    }}
                  />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path d="M8 3v10M3 8h10" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                )}
                <span>{submitting ? "Submitting…" : "Submit Question"}</span>
              </button>
              <button
                onClick={onClose}
                className="btn-ghost w-full py-2 text-xs"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

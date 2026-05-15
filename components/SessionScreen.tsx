"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import type { useSession } from "@/lib/useSession";
import QuestionCard from "./QuestionCard";
import ShareModal from "./ShareModal";
import AddQuestionModal from "./AddQuestionModal";

type SessionHook = ReturnType<typeof useSession>;
interface Props { session: SessionHook; onEnd: () => void; onBack: () => void; }

export default function SessionScreen({ session, onEnd, onBack }: Props) {
  const { session: s, current, progress, next, previous, toggleDeep, restart } = session;
  const [showShare, setShowShare] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const handleNext = useCallback(() => next(), [next]);
  const handlePrevious = useCallback(() => previous(), [previous]);

  useEffect(() => {
    if (!s || s.isFinished || showShare || showAdd) return;

    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && target.closest("input,textarea,select,[contenteditable='true']")) return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevious();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [s, showShare, showAdd, handleNext, handlePrevious]);

  if (!s) return null;

  /* ── End of deck ── */
  if (s.isFinished) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh px-6 gap-8 safe-top safe-bottom">
        <div className="text-center animate-slide-up">
          <div className="text-7xl mb-5 animate-float">🎉</div>
          <h2 className="text-3xl font-black mb-3"
            style={{ fontFamily: "var(--font-playfair), Georgia, serif", color: "var(--kw-text)" }}>
            All Done!
          </h2>
          <p className="text-base" style={{ color: "var(--kw-subtext)" }}>
            {progress?.total ?? 0} questions played.
          </p>
        </div>

        <div className="w-full max-w-sm flex flex-col gap-3">
          <button onClick={() => restart()} className="btn-primary py-[1.0625rem] text-[0.9375rem]">
            🔄 &nbsp;Play Again
          </button>
          <button onClick={onBack} className="btn-secondary py-4 text-sm">
            ← Choose Another Category
          </button>
          <button onClick={onEnd} className="btn-ghost py-2 text-sm">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!current) return null;
  const pct = progress ? (progress.current / progress.total) * 100 : 0;

  return (
    <div className="flex flex-col min-h-dvh safe-top safe-bottom">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 md:px-6 lg:px-8">

        {/* ── Top bar (iOS spec) ── */}
        <div className="md:pt-6" style={{ padding: "16px 4px 12px" }}>
          <div className="flex items-start md:gap-4" style={{ gap: 12 }}>
            {/* Back */}
            <button
              onClick={onBack}
              aria-label="Back"
              style={{
                width: 40, height: 40, borderRadius: 14,
                background: "#FFFFFF",
                border: "1px solid rgba(200,195,230,0.5)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                cursor: "pointer",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M10 3L5 8l5 5" stroke="#8B87A8" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Center: mini logo + mode, stacked */}
            <div className="flex-1 flex flex-col items-center" style={{ gap: 4 }}>
              <Image
                src="/logo.png"
                alt="Kwentuhan Logo"
                width={40}
                height={40}
                className="h-auto w-auto md:h-11 md:w-11"
              />
              <span
                className="md:text-[15px]"
                style={{
                  fontSize: 14, fontWeight: 700,
                  color: "#1A1730",
                  fontFamily: "var(--font-dm-sans), sans-serif",
                }}
              >
                {s.mode === "group" ? "Group Mode" : "Solo Mode"}
              </span>
            </div>

            {/* Right spacer — keeps the center truly centered */}
            <div style={{ width: 40, height: 40, flexShrink: 0 }} />
          </div>

          {/* Progress bar */}
          <div style={{ marginTop: 14 }}>
            <div
              style={{
                height: 3,
                borderRadius: 2,
                background: "rgba(108,92,231,0.12)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${pct}%`,
                  background: "linear-gradient(90deg,#7B5EE8 0%,#E8527A 100%)",
                  borderRadius: 2,
                  transition: "width 0.45s cubic-bezier(0.34,1.2,0.64,1)",
                }}
              />
            </div>
            <div className="flex justify-between" style={{ marginTop: 8 }}>
              <span style={{ fontSize: 12, color: "#9B97BB" }}>
                Question {progress?.current} of {progress?.total}
              </span>
              <span style={{ fontSize: 12, color: "#9B97BB" }}>
                {Math.round(pct)}% through the deck
              </span>
            </div>
          </div>
        </div>

        {/* ── Card area (QuestionCard owns its own ghost/physics) ── */}
        <div className="flex-1 min-h-0 py-3 md:py-6 lg:py-8">
          <div className="mx-auto w-full max-w-3xl">
            <QuestionCard
              question={current}
              showDeep={s.showDeep}
              onTap={toggleDeep}
              onSwipeNext={handleNext}
              animKey={s.currentIdx}
            />
            <div
              className="mt-3 flex items-center justify-center gap-3 md:mt-4"
            >
              <span style={{ fontSize: 13, color: "#B0ABC8" }}>
                <span style={{ marginRight: 4 }}>👆</span>
                Tap card to deep dive
              </span>
              <span aria-hidden style={{ width: 3, height: 3, borderRadius: 3, background: "#D6D1E7" }} />
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="inline-flex cursor-pointer items-center gap-1 transition-transform duration-200 active:scale-95 lg:hover:-translate-y-0.5"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--kw-accent)",
                  background: "transparent",
                  border: "none",
                  padding: "4px 2px",
                  WebkitTapHighlightColor: "transparent",
                }}
                aria-label="Contribute a question"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <span>Add</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Bottom controls ── */}
        <div className="pb-4 md:pb-6" style={{ paddingBottom: "max(16px,env(safe-area-inset-bottom))" }}>
          <div className="mx-auto flex w-full max-w-3xl gap-2.5 md:gap-4">

            {/* Share */}
            <button
              onClick={() => setShowShare(true)}
              className="h-14 w-14 shrink-0 cursor-pointer rounded-2xl btn-secondary flex items-center justify-center transition-transform duration-200 lg:hover:-translate-y-0.5"
              title="Share question"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="13" cy="3" r="1.8" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="13" cy="15" r="1.8" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="3" cy="9" r="1.8" stroke="currentColor" strokeWidth="1.5" />
                <path d="M5 8l6-3.5M5 10l6 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>

            {/* Skip */}
            <button
              onClick={handleNext}
              className="h-14 w-14 shrink-0 cursor-pointer rounded-2xl btn-secondary flex items-center justify-center transition-transform duration-200 lg:hover:-translate-y-0.5"
              title="Skip"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3 9h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M8 5l4 4-4 4" stroke="currentColor" strokeWidth="1.8"
                  strokeLinecap="round" strokeLinejoin="round" />
                <path d="M15 5v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>

            {/* Next */}
            <button
              onClick={handleNext}
              className="btn-primary flex h-14 flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl text-[0.9375rem] transition-transform duration-200 lg:hover:-translate-y-0.5"
            >
              <span>Next</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M8 4l4 4-4 4" stroke="white" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <p className="text-center text-[0.6875rem] mt-2.5" style={{ color: "var(--kw-muted)" }}>
            ← previous · → next · swipe or tap card for deep dive
          </p>
        </div>
      </div>

      {/* Share modal */}
      {showShare && current && (
        <ShareModal
          question={current}
          onClose={() => setShowShare(false)}
          onNext={handleNext}
        />
      )}

      {/* Contribute question modal */}
      {showAdd && (
        <AddQuestionModal onClose={() => setShowAdd(false)} />
      )}
    </div>
  );
}

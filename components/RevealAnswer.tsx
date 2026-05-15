"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { track } from "@/lib/telemetry";

interface Props {
  answerText: string;
  /** Optional — the kwento or question id this reveal belongs to. When
   *  provided, the component emits `shown` on mount and `reacted` on each
   *  emoji tap. Omit (or pass empty string) to disable telemetry. */
  questionId?: string;
}

const REACTIONS = ["🤣", "😱", "💀", "❤️", "🔥"] as const;
type Reaction = (typeof REACTIONS)[number];

type Burst = { id: number; emoji: Reaction; x: number };

/**
 * The reveal centerpiece for Scan-to-Reveal. Two beats:
 *
 *   1. The kwento itself animates in with a spring `deepReveal` — instant,
 *      no tap gate. The handwritten Kalam typography + faint quote glyph
 *      make it feel like reading someone's actual note.
 *
 *   2. A reactions row underneath lets the reader signal a feeling without
 *      breaking flow. Each tap releases a small floating burst of the
 *      tapped emoji that drifts up and fades out — purely client-side, no
 *      backend, designed for the "scan at a party and laugh" moment.
 *
 *      Selection state persists for the session via React state so the
 *      tapped reaction stays highlighted (helps users remember "ah yeah
 *      I already reacted to this one"). No counts shown — this is a
 *      personal expressive moment, not a poll.
 */
export default function RevealAnswer({ answerText, questionId }: Props) {
  const [reacted, setReacted] = useState<Reaction | null>(null);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const burstIdRef = useRef(0);
  const shownFiredRef = useRef(false);

  // Fire `shown` once when the reveal mounts. Ref-guarded so React StrictMode's
  // double-effect-invoke doesn't double-log in dev. No-op if questionId is
  // missing (caller didn't opt into telemetry).
  useEffect(() => {
    if (shownFiredRef.current) return;
    if (!questionId) return;
    shownFiredRef.current = true;
    track({ questionId, eventType: "shown" });
  }, [questionId]);

  const handleReact = useCallback(
    (emoji: Reaction, btn: HTMLButtonElement) => {
      setReacted(emoji);
      if (questionId) {
        track({ questionId, eventType: "reacted" });
      }

      // Spawn a floating burst at the tapped button's center.
      const rect = btn.getBoundingClientRect();
      const parentRect = btn.closest("[data-burst-host]")?.getBoundingClientRect();
      const x = parentRect ? rect.left - parentRect.left + rect.width / 2 : 0;

      const id = ++burstIdRef.current;
      setBursts((prev) => [...prev, { id, emoji, x }]);

      // Auto-cleanup the burst after its animation completes.
      window.setTimeout(() => {
        setBursts((prev) => prev.filter((b) => b.id !== id));
      }, 1100);
    },
    [questionId],
  );

  return (
    <div
      data-burst-host
      className="kw-card p-5 flex flex-col gap-3 relative overflow-hidden"
    >
      {/* Subtle gradient accent on the corner */}
      <div
        aria-hidden
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(108,92,231,0.18) 0%, transparent 70%)",
          filter: "blur(8px)",
        }}
      />

      {/* Label */}
      <p
        className="relative text-[0.6875rem] font-bold uppercase tracking-[0.18em]"
        style={{ color: "var(--kw-accent)" }}
      >
        ✨ a kwento for you
      </p>

      {/* Answer body — instant entrance, no gate */}
      <div
        className="relative"
        style={{
          animation: "deepReveal 0.55s cubic-bezier(0.34,1.4,0.64,1) both",
          animationDelay: "0.08s",
        }}
      >
        {/* Decorative opening quote glyph */}
        <span
          aria-hidden
          className="absolute -left-1 -top-3 select-none pointer-events-none"
          style={{
            fontFamily: "var(--font-playfair), Georgia, serif",
            fontSize: 56,
            lineHeight: 0.8,
            opacity: 0.1,
            color: "var(--kw-accent)",
          }}
        >
          ❝
        </span>
        <p
          className="text-[1.0625rem] leading-relaxed pl-1 whitespace-pre-wrap"
          style={{
            fontFamily: "var(--font-kalam), cursive",
            color: "var(--kw-note-ink)",
          }}
        >
          {answerText}
        </p>
      </div>

      {/* Anonymous attribution */}
      <p
        className="text-[0.6875rem] italic text-right relative -mt-2"
        style={{ color: "var(--kw-subtext)", fontFamily: "var(--font-playfair), serif" }}
      >
        — someone, anonymously
      </p>

      {/* React row — tappable, with floating burst animation on tap */}
      <div
        className="relative flex items-center justify-between gap-1"
        role="group"
        aria-label="React to this kwento"
      >
        {REACTIONS.map((emoji) => {
          const isActive = reacted === emoji;
          return (
            <button
              key={emoji}
              type="button"
              onClick={(e) => handleReact(emoji, e.currentTarget)}
              className="flex-1 py-1.5 rounded-2xl text-lg transition-transform active:scale-90"
              style={{
                background: isActive ? "var(--kw-accent-soft)" : "transparent",
                border: `1px solid ${isActive ? "var(--kw-accent)" : "var(--kw-border)"}`,
                lineHeight: 1,
                filter: isActive ? "none" : "saturate(0.85)",
                opacity: reacted && !isActive ? 0.55 : 1,
                transition: "background 0.18s, opacity 0.18s, filter 0.18s, transform 0.12s",
              }}
              aria-label={`React with ${emoji}`}
              aria-pressed={isActive}
            >
              {emoji}
            </button>
          );
        })}
      </div>

      {/* Floating-burst layer — absolutely positioned, doesn't displace content */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none overflow-hidden"
      >
        {bursts.map((b) => (
          <span
            key={b.id}
            style={{
              position: "absolute",
              bottom: 56, // line up with the react row
              left: b.x,
              transform: "translateX(-50%)",
              fontSize: 28,
              animation: "kwBurst 1s cubic-bezier(0.34,1.4,0.64,1) forwards",
              willChange: "transform, opacity",
            }}
          >
            {b.emoji}
          </span>
        ))}
      </div>

      <style jsx>{`
        @keyframes kwBurst {
          0%   { transform: translate(-50%, 0)    scale(0.8); opacity: 0; }
          15%  { transform: translate(-50%, -8px) scale(1.1); opacity: 1; }
          100% { transform: translate(-50%, -90px) scale(1);  opacity: 0; }
        }
      `}</style>
    </div>
  );
}

"use client";

import { useRef, useEffect } from "react";
import type { Question } from "@/lib/types";
import { LEVEL_CONFIG } from "@/lib/types";

interface Props {
  question:    Question;
  showDeep:    boolean;
  onTap:       () => void;
  onSwipeNext: () => void;
  animKey:     number;
}

const SWIPE_THRESHOLD = 90;
const EXIT_DISTANCE   = 420;
const EXIT_ROTATION   = 22;
const EXIT_MS         = 300;
const ENTER_MS        = 280;
const SNAP_MS         = 280;

/* Easings */
const EASE_SPRING_OUT  = "cubic-bezier(0.34,1.48,0.64,1)";   // enter: overshoot spring
const EASE_SPRING_SNAP = "cubic-bezier(0.34,1.56,0.64,1)";   // snap back: bouncier
const EASE_FAST_IN     = "cubic-bezier(0.55,0,0.85,0.4)";    // exit: fast ease-in

/* ────────────────────────────────────────────────────────────────
 * QuestionCard — iOS-grade swipe physics
 *
 *  • transform-origin: bottom center (card pivots like a held playing card)
 *  • rotation       = dragX * 0.055
 *  • vertical lift  = -min(|dragX|/6, 12)
 *  • scale          = 1 - min(|dragX|/1800, 0.02)
 *  • ghost behind tracks inversely: scales up and rises as top card drags away
 *  • enter/exit/snap managed with direct DOM mutations via refs (no re-render lag)
 * ───────────────────────────────────────────────────────────────*/
export default function QuestionCard({
  question, showDeep, onTap, onSwipeNext, animKey,
}: Props) {
  const level = LEVEL_CONFIG[question.level] ?? LEVEL_CONFIG.light;

  // DOM refs
  const cardRef  = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const tintLRef = useRef<HTMLDivElement>(null);
  const tintRRef = useRef<HTMLDivElement>(null);

  // Drag state refs (avoid re-render during drag)
  const dragXRef      = useRef(0);
  const startXRef     = useRef<number | null>(null);
  const startYRef     = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const animatingRef  = useRef(false);
  const movedFarRef   = useRef(false);

  /* ── Apply live transforms during drag ─────────────────────── */
  function applyTransform(dx: number) {
    const card  = cardRef.current;
    const ghost = ghostRef.current;
    if (!card) return;

    const absDx = Math.abs(dx);
    const rot   = dx * 0.055;
    const liftY = -Math.min(absDx / 6, 12);
    const scl   = 1 - Math.min(absDx / 1800, 0.02);

    card.style.transform =
      `translateX(${dx}px) translateY(${liftY}px) rotate(${rot}deg) scale(${scl})`;

    if (ghost) {
      const gScale = Math.min(0.93 + absDx / 1200, 1);
      const gLift  = Math.max(8 - absDx / 40, 0);
      const gOp    = Math.min(0.55 + absDx / 500, 1);
      ghost.style.transform = `scale(${gScale}) translateY(${gLift}px)`;
      ghost.style.opacity   = String(gOp);
    }

    // Directional color tints
    const tintL = tintLRef.current;
    const tintR = tintRRef.current;
    if (tintL) tintL.style.opacity = dx < -20 ? String(Math.min(absDx / 160, 1)) : "0";
    if (tintR) tintR.style.opacity = dx >  20 ? String(Math.min(absDx / 160, 1)) : "0";
  }

  /* ── Snap back under threshold ─────────────────────────────── */
  function snapBack() {
    const card  = cardRef.current;
    const ghost = ghostRef.current;
    const tintL = tintLRef.current;
    const tintR = tintRRef.current;
    if (!card) return;

    card.style.transition = `transform ${SNAP_MS}ms ${EASE_SPRING_SNAP}`;
    card.style.transform  = "translateX(0) translateY(0) rotate(0deg) scale(1)";

    if (ghost) {
      ghost.style.transition = `transform ${SNAP_MS}ms ${EASE_SPRING_SNAP}, opacity 0.3s ease`;
      ghost.style.transform  = "scale(0.93) translateY(8px)";
      ghost.style.opacity    = "0.55";
    }
    if (tintL) { tintL.style.transition = "opacity 0.3s"; tintL.style.opacity = "0"; }
    if (tintR) { tintR.style.transition = "opacity 0.3s"; tintR.style.opacity = "0"; }
  }

  /* ── Commit exit animation, then advance ──────────────────── */
  function exitCard(direction: 1 | -1) {
    const card  = cardRef.current;
    const ghost = ghostRef.current;
    const tintL = tintLRef.current;
    const tintR = tintRRef.current;
    if (!card) return;

    animatingRef.current = true;

    card.style.transition = `transform ${EXIT_MS}ms ${EASE_FAST_IN}, opacity ${EXIT_MS}ms ease`;
    card.style.transform  =
      `translateX(${direction * EXIT_DISTANCE}px) translateY(-40px) ` +
      `rotate(${direction * EXIT_ROTATION}deg) scale(0.88)`;
    card.style.opacity    = "0";

    if (ghost) {
      // Ghost rises to take top-card position; will be reset by enter animation.
      ghost.style.transition = `transform ${EXIT_MS}ms ease, opacity ${EXIT_MS}ms ease`;
      ghost.style.transform  = "scale(1) translateY(0)";
      ghost.style.opacity    = "1";
    }
    if (tintL) tintL.style.opacity = "0";
    if (tintR) tintR.style.opacity = "0";

    window.setTimeout(() => {
      animatingRef.current = false;
      onSwipeNext();
    }, EXIT_MS);
  }

  /* ── Gesture end → decide commit vs snap ──────────────────── */
  function commit() {
    const dx = dragXRef.current;
    isDraggingRef.current = false;
    startXRef.current     = null;
    startYRef.current     = null;

    if (dx < -SWIPE_THRESHOLD)      exitCard(-1);
    else if (dx > SWIPE_THRESHOLD)  exitCard( 1);
    else {
      snapBack();
      dragXRef.current = 0;
    }
  }

  /* ── Remove transitions so drag tracks 1:1 with finger ───── */
  function cutTransitions() {
    const card  = cardRef.current;
    const ghost = ghostRef.current;
    const tintL = tintLRef.current;
    const tintR = tintRRef.current;
    if (card)  card.style.transition  = "none";
    if (ghost) ghost.style.transition = "none";
    if (tintL) tintL.style.transition = "none";
    if (tintR) tintR.style.transition = "none";
  }

  /* ── Touch handlers ───────────────────────────────────────── */
  function onTouchStart(e: React.TouchEvent) {
    if (animatingRef.current) return;
    startXRef.current     = e.touches[0].clientX;
    startYRef.current     = e.touches[0].clientY;
    movedFarRef.current   = false;
    isDraggingRef.current = true;
    cutTransitions();
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!isDraggingRef.current || startXRef.current === null) return;
    const dx = e.touches[0].clientX - startXRef.current;
    const dy = e.touches[0].clientY - (startYRef.current ?? 0);
    if (Math.abs(dx) > Math.abs(dy)) {
      e.preventDefault();
      if (Math.abs(dx) > 8) movedFarRef.current = true;
      dragXRef.current = dx;
      applyTransform(dx);
    }
  }

  function onTouchEnd() {
    if (isDraggingRef.current) commit();
  }

  /* ── Mouse handlers ───────────────────────────────────────── */
  function onMouseDown(e: React.MouseEvent) {
    if (animatingRef.current) return;
    startXRef.current     = e.clientX;
    movedFarRef.current   = false;
    isDraggingRef.current = true;
    cutTransitions();
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!isDraggingRef.current || startXRef.current === null) return;
    const dx = e.clientX - startXRef.current;
    if (Math.abs(dx) > 6) movedFarRef.current = true;
    dragXRef.current = dx;
    applyTransform(dx);
  }

  function onMouseUp() {
    if (isDraggingRef.current) commit();
  }

  /* ── Enter animation (runs on animKey change — new card) ─── */
  useEffect(() => {
    const card  = cardRef.current;
    const ghost = ghostRef.current;
    if (!card) return;

    dragXRef.current     = 0;
    animatingRef.current = true;

    // Starting pose
    card.style.transition = "none";
    card.style.opacity    = "0";
    card.style.transform  =
      "translateX(0) translateY(40px) rotate(-1.5deg) scale(0.92)";

    if (ghost) {
      ghost.style.transition = "none";
      ghost.style.transform  = "scale(0.93) translateY(8px)";
      ghost.style.opacity    = "0.55";
    }

    // Force layout flush so the transition animates from the starting pose.
    void card.offsetHeight;

    const raf = requestAnimationFrame(() => {
      card.style.transition =
        `transform ${ENTER_MS}ms ${EASE_SPRING_OUT}, opacity 0.3s ease`;
      card.style.transform  =
        "translateX(0) translateY(0) rotate(0deg) scale(1)";
      card.style.opacity    = "1";
    });

    const unlock = window.setTimeout(() => {
      animatingRef.current = false;
    }, ENTER_MS);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(unlock);
    };
  }, [animKey]);

  /* ── Click vs drag disambiguation ─────────────────────────── */
  function handleClick() {
    if (!movedFarRef.current && !animatingRef.current) onTap();
  }

  return (
    <div className="relative mx-auto w-full max-w-3xl cursor-pointer transition-all duration-300 lg:hover:scale-[1.01] lg:hover:shadow-lg" style={{ minHeight: 420 }}>
      {/* ───── Ghost card behind ───── */}
      <div
        ref={ghostRef}
        aria-hidden
        className="absolute left-0 right-0 pointer-events-none"
        style={{
          top: 0,
          height: "100%",
          borderRadius: "1.75rem",
          background: "#FFFFFF",
          border: "1px solid rgba(200,195,230,0.5)",
          boxShadow: "0 2px 16px rgba(108,92,231,0.07)",
          transform: "scale(0.93) translateY(8px)",
          transformOrigin: "bottom center",
          opacity: 0.55,
          zIndex: 0,
          willChange: "transform,opacity",
        }}
      />

      {/* ───── Foreground card ───── */}
        <div
          ref={cardRef}
          key={animKey}
        className="relative w-full select-none"
        style={{
          minHeight: 420,
          borderRadius: "1.75rem",
          background: level.cardBg,
          border: `1.5px solid ${level.cardBorder}`,
          boxShadow:
            "0 8px 40px rgba(108,92,231,0.10), 0 1px 4px rgba(0,0,0,0.04), " +
            "inset 0 1px 0 rgba(255,255,255,1)",
          transformOrigin: "bottom center",
          willChange: "transform, opacity",
          touchAction: "pan-y",
          cursor: "grab",
          zIndex: 1,
          WebkitUserSelect: "none",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onClick={handleClick}
      >
        {/* Directional swipe tints */}
        <div
          ref={tintLRef}
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            borderRadius: "1.75rem",
            background:
              "linear-gradient(90deg, transparent 50%, rgba(232,82,122,0.09) 100%)",
            opacity: 0,
          }}
        />
        <div
          ref={tintRRef}
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            borderRadius: "1.75rem",
            background:
              "linear-gradient(270deg, transparent 50%, rgba(108,82,227,0.09) 100%)",
            opacity: 0,
          }}
        />

        <div className="flex min-h-[420px] flex-col p-6 md:min-h-[460px] md:p-8 lg:min-h-[500px] lg:p-10">
          {/* Top row: level badge (left) + category badge (right) */}
          <div className="mb-2 flex items-center justify-between md:mb-3">
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                height: 30,
                padding: "0 12px",
                borderRadius: 100,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.04em",
                background: level.bg,
                color: level.color,
                border: `1px solid ${level.border}`,
                textTransform: "uppercase",
              }}
            >
              <span style={{ fontSize: 13, lineHeight: 1 }}>{level.emoji}</span>
              <span>{level.label}</span>
            </span>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                height: 30,
                padding: "0 12px",
                borderRadius: 100,
                fontSize: 13,
                fontWeight: 600,
                background: "rgba(240,238,250,0.8)",
                color: "#6B6890",
              }}
            >
              <span style={{ fontSize: 13, lineHeight: 1 }}>{question.categoryEmoji}</span>
              <span>{question.categoryLabel}</span>
            </span>
          </div>

          {/* Question text */}
          <div className="flex flex-1 flex-col justify-center py-4 md:py-6 lg:py-7">
            <p
              className={`mx-auto max-w-2xl text-center ${showDeep ? "text-lg lg:text-xl" : "text-xl lg:text-2xl"}`}
              style={{
                fontFamily: "var(--font-playfair), Georgia, serif",
                fontWeight: 700,
                lineHeight: 1.4,
                color: "#1A1730",
                opacity: showDeep ? 0.55 : 1,
                transition: "font-size 0.24s ease, opacity 0.24s ease",
              }}
            >
              {question.hook}
            </p>

            {showDeep && question.deepDive && (
              <div
                className="deep-reveal"
                style={{
                  marginTop: 20,
                  padding: 16,
                  borderRadius: "0 16px 16px 0",
                  background: "rgba(232,82,122,0.06)",
                  borderLeft: `3px solid ${level.color}`,
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    color: level.color,
                    marginBottom: 6,
                    textTransform: "uppercase",
                  }}
                >
                  Deep Dive
                </p>
                <p className="md:text-[17px]" style={{ fontSize: 16, lineHeight: 1.6, color: "#1A1730" }}>
                  {question.deepDive}
                </p>
              </div>
            )}
          </div>

          {/* Dots indicator */}
          <div
            className="flex items-center justify-center"
            style={{ gap: 6, paddingBottom: 2 }}
          >
            {[0, 1, 2].map(i => (
              <span
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  background: i === 1 ? "#6C52E3" : "rgba(108,92,231,0.2)",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

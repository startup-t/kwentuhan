"use client";

import { useEffect, useRef } from "react";
import type { Question } from "@/lib/types";
import { LEVEL_CONFIG } from "@/lib/types";

interface Props {
  question: Question | null;
}

export default function DesktopQuestionPreview({ question }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !question) return;

    el.style.transition = "none";
    el.style.opacity = "0";
    el.style.transform = "translateY(14px)";
    void el.offsetHeight;

    const raf = requestAnimationFrame(() => {
      el.style.transition = "opacity 300ms ease, transform 300ms cubic-bezier(0.34,1.4,0.64,1)";
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    });

    return () => cancelAnimationFrame(raf);
  }, [question?.id]);

  if (!question) return null;

  const level = LEVEL_CONFIG[question.level] ?? LEVEL_CONFIG.light;

  return (
    <div
      ref={wrapRef}
      className="hidden lg:block"
      style={{ willChange: "transform, opacity" }}
    >
      {/* Eyebrow label */}
      <p
        style={{
          fontFamily: "'DM Sans',sans-serif",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#9B97BB",
          marginBottom: 12,
        }}
      >
        Question Preview
      </p>

      {/* Card */}
      <div
        style={{
          borderRadius: "1.75rem",
          background: level.cardBg,
          border: `1.5px solid ${level.cardBorder}`,
          boxShadow:
            "0 8px 40px rgba(108,92,231,0.10), 0 1px 4px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,1)",
          padding: "2.5rem",
          minHeight: 340,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Level + category badges */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
              textTransform: "uppercase",
              background: level.bg,
              color: level.color,
              border: `1px solid ${level.border}`,
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
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem 0 1.5rem",
          }}
        >
          <p
            style={{
              fontFamily: "'Playfair Display',Georgia,serif",
              fontWeight: 700,
              fontSize: "1.3rem",
              lineHeight: 1.5,
              color: "#1A1730",
              textAlign: "center",
              maxWidth: "34ch",
            }}
          >
            {question.hook}
          </p>
        </div>

        {/* Footer hint */}
        <p
          style={{
            textAlign: "center",
            fontSize: 13,
            color: "#B0ABC8",
            fontFamily: "'DM Sans',sans-serif",
          }}
        >
          Start a conversation to see your full deck
        </p>
      </div>
    </div>
  );
}

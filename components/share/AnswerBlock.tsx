"use client";

import type { CSSProperties } from "react";
import { autoStackChat } from "@/lib/shareAnswer/autoStack";
import type { AnswerStyle } from "@/lib/shareAnswer/types";

const QUOTE_TRUNCATE_AT = 180;

interface Props {
  text:         string;
  style:        AnswerStyle;
  attribution?: string;
  /** Multiplier for export (1.0) vs preview (smaller). Defaults to 1. */
  scale?:       number;
}

export default function AnswerBlock({
  text, style, attribution = "you", scale = 1,
}: Props) {
  if (style === "chat")  return <ChatVariant  text={text} scale={scale} />;
  if (style === "quote") return <QuoteVariant text={text} attribution={attribution} scale={scale} />;
  return <NoteVariant text={text} scale={scale} />;
}

/* ───────────────────────── Chat ───────────────────────── */

function ChatVariant({ text, scale }: { text: string; scale: number }) {
  const bubbles = autoStackChat(text);
  if (bubbles.length === 0) return null;

  const fontSize = 18 * scale;
  const padX     = 16 * scale;
  const padY     = 12 * scale;
  const radius   = 18 * scale;
  const tailSize = 8  * scale;
  const gap      = 6  * scale;

  return (
    <div
      style={{
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "flex-end",
        gap,
        width:          "100%",
      }}
    >
      {bubbles.map((bubble, i) => {
        const isLast = i === bubbles.length - 1;
        return (
          <div
            key={i}
            style={{
              position:    "relative",
              maxWidth:    "75%",
              padding:     `${padY}px ${padX}px`,
              borderRadius: radius,
              background:  "var(--kw-chat-peach)",
              color:       "var(--kw-note-ink)",
              fontFamily:  "var(--font-dm-sans), system-ui, sans-serif",
              fontSize,
              fontWeight:  500,
              lineHeight:  1.4,
              whiteSpace:  "pre-wrap",
              wordBreak:   "break-word",
            }}
          >
            {bubble}
            {isLast && (
              <span
                aria-hidden
                style={{
                  position:  "absolute",
                  left:      -tailSize / 2,
                  bottom:    tailSize / 2,
                  width:     tailSize,
                  height:    tailSize,
                  background: "var(--kw-chat-peach)",
                  transform: "rotate(45deg)",
                  borderBottomLeftRadius: 2,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ───────────────────────── Quote ───────────────────────── */

function QuoteVariant({
  text, attribution, scale,
}: { text: string; attribution: string; scale: number }) {
  const truncated = text.length > QUOTE_TRUNCATE_AT
    ? text.slice(0, QUOTE_TRUNCATE_AT).trim() + "…"
    : text;

  const bodyFont   = 20 * scale;
  const glyphFont  = 80 * scale;
  const attribFont = 12 * scale;
  const padTop     = 32 * scale;
  const padLeft    = 24 * scale;

  return (
    <div style={{ position: "relative", paddingTop: padTop, paddingLeft: padLeft }}>
      <span
        aria-hidden
        style={{
          position:    "absolute",
          top:         -glyphFont * 0.18,
          left:        0,
          fontFamily:  "var(--font-playfair), Georgia, serif",
          fontSize:    glyphFont,
          lineHeight:  0.8,
          opacity:     0.12,
          color:       "var(--kw-text)",
          userSelect:  "none",
        }}
      >
        ❝
      </span>
      <p
        style={{
          fontFamily:  "var(--font-playfair), Georgia, serif",
          fontSize:    bodyFont,
          fontWeight:  400,
          lineHeight:  1.5,
          color:       "var(--kw-text)",
          whiteSpace:  "pre-wrap",
          wordBreak:   "break-word",
          margin:      0,
        }}
      >
        {truncated}
      </p>
      <p
        style={{
          marginTop:      14 * scale,
          fontFamily:     "var(--font-dm-sans), system-ui, sans-serif",
          fontSize:       attribFont,
          fontWeight:     600,
          letterSpacing:  "0.08em",
          textTransform:  "uppercase",
          color:          "var(--kw-subtext)",
        }}
      >
        — {attribution}
      </p>
    </div>
  );
}

/* ───────────────────────── Note ───────────────────────── */

function NoteVariant({ text, scale }: { text: string; scale: number }) {
  const bodyFont = 22 * scale;

  const wrapStyle: CSSProperties = {
    transform:       "rotate(-1.5deg)",
    transformOrigin: "center center",
    width:           "100%",
  };

  return (
    <div style={wrapStyle}>
      <p
        style={{
          fontFamily:  "var(--font-kalam), cursive",
          fontWeight:  400,
          fontSize:    bodyFont,
          lineHeight:  1.3,
          color:       "var(--kw-note-ink)",
          whiteSpace:  "pre-wrap",
          wordBreak:   "break-word",
          margin:      0,
        }}
      >
        {text}
      </p>
    </div>
  );
}

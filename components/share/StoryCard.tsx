"use client";

import { forwardRef, useEffect, useState } from "react";
import Image from "next/image";
import type { Question } from "@/lib/types";
import { LEVEL_CONFIG, CLUSTER_COLOR } from "@/lib/types";
import type { AnswerStyle } from "@/lib/shareAnswer/types";
import { getCachedQRCodeDataUrl } from "@/lib/qr";
import AnswerBlock from "./AnswerBlock";

const CARD_W      = 1080;
const CARD_H      = 1920;
const SAFE_TOP    = 250;
const SAFE_BOTTOM = 250;
const SIDE_PAD    = 80;

interface Props {
  question:        Question;
  answer:          string;
  style:           AnswerStyle;
  teaser:          boolean;
  qrUrl:           string;
  qrCacheKey:      string;
  onEditAnswer?:   () => void;
}

const StoryCard = forwardRef<HTMLDivElement, Props>(function StoryCard(
  { question, answer, style, teaser, qrUrl, qrCacheKey, onEditAnswer },
  forwardedRef,
) {
  const level = LEVEL_CONFIG[question.level] ?? LEVEL_CONFIG.light;
  const clr   = CLUSTER_COLOR[question.cluster] ?? CLUSTER_COLOR.other;

  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    getCachedQRCodeDataUrl(qrCacheKey, qrUrl, 420)
      .then((url) => { if (mounted) setQrDataUrl(url); })
      .catch(() => { if (mounted) setQrDataUrl(""); });
    return () => { mounted = false; };
  }, [qrCacheKey, qrUrl]);

  // Truncated indicator copy when Quote style cuts at 180 chars
  const showQuoteTruncationHint = style === "quote" && answer.length > 180;

  return (
    <div
      ref={forwardedRef}
      style={{
        position: "relative",
        width:    CARD_W,
        height:   CARD_H,
        background: "linear-gradient(160deg,#F8F6FF 0%,#FFF4F7 100%)",
        overflow: "hidden",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      {/* Background blobs */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: -160, left: -160,
          width: 700, height: 700,
          background: "radial-gradient(circle, rgba(108,92,231,0.10) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          bottom: -200, right: -200,
          width: 700, height: 700,
          background: "radial-gradient(circle, rgba(232,82,122,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Header: logo + tagline (within / just below the top safe zone) */}
      <div
        style={{
          position: "absolute",
          top:      SAFE_TOP - 130,
          left:     SIDE_PAD,
          right:    SIDE_PAD,
          display:  "flex",
          alignItems: "center",
          gap:      20,
        }}
      >
        <Image src="/logo.png" alt="" width={72} height={72} unoptimized />
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontWeight: 700,
            fontSize:   44,
            color:      "var(--kw-text)",
            lineHeight: 1,
          }}>
            kwentuhan
          </span>
          <span style={{
            fontSize: 22,
            fontWeight: 500,
            color: "var(--kw-subtext)",
          }}>
            usapang totoo, kasama mo.
          </span>
        </div>
      </div>

      {/* Badges row, just below header */}
      <div
        style={{
          position: "absolute",
          top:      SAFE_TOP + 110,
          left:     SIDE_PAD,
          display:  "flex",
          alignItems: "center",
          gap:      14,
        }}
      >
        <span style={{
          display:    "inline-flex",
          alignItems: "center",
          gap:        8,
          height:     46,
          padding:    "0 18px",
          borderRadius: 100,
          fontSize:   18,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          background: level.bg,
          color:      level.color,
          border:     `1.5px solid ${level.border}`,
        }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>{level.emoji}</span>
          <span>{level.label}</span>
        </span>
        <span style={{
          display:    "inline-flex",
          alignItems: "center",
          gap:        8,
          height:     46,
          padding:    "0 18px",
          borderRadius: 100,
          fontSize:   18,
          fontWeight: 600,
          background: clr.bg,
          color:      clr.accent,
        }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>{question.categoryEmoji}</span>
          <span>{question.categoryLabel}</span>
        </span>
      </div>

      {/* Question — top third of active band */}
      <div
        style={{
          position: "absolute",
          top:      SAFE_TOP + 210,
          left:     SIDE_PAD,
          right:    SIDE_PAD,
        }}
      >
        <p style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontWeight: 700,
          fontSize:   58,
          lineHeight: 1.25,
          color:      "var(--kw-text)",
          margin:     0,
        }}>
          {question.hook}
        </p>
      </div>

      {/* Answer — middle ~40% */}
      <div
        role={onEditAnswer ? "button" : undefined}
        tabIndex={onEditAnswer ? 0 : undefined}
        onClick={onEditAnswer}
        onKeyDown={onEditAnswer ? (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onEditAnswer();
          }
        } : undefined}
        aria-label={onEditAnswer ? "Edit answer" : undefined}
        style={{
          position: "absolute",
          top:      SAFE_TOP + 560,
          left:     SIDE_PAD,
          right:    SIDE_PAD,
          minHeight: 360,
          display:  "flex",
          alignItems: "flex-start",
          cursor:   onEditAnswer ? "pointer" : "default",
          outline:  "none",
        }}
      >
        <div
          style={{
            width:  "100%",
            filter: teaser ? "blur(14px)" : "none",
          }}
        >
          {answer.trim().length > 0 ? (
            <AnswerBlock text={answer} style={style} scale={1} />
          ) : (
            <div style={{
              fontSize: 22,
              color:    "var(--kw-muted)",
              fontStyle: "italic",
            }}>
              {/* Empty state — only visible if user lands here without an answer */}
              Kwento mo naman…
            </div>
          )}
        </div>
      </div>

      {/* Quote-style "read on" hint when truncation kicks in */}
      {showQuoteTruncationHint && !teaser && (
        <div style={{
          position: "absolute",
          left:     SIDE_PAD,
          right:    SIDE_PAD,
          top:      CARD_H - SAFE_BOTTOM - 230,
          fontSize: 18,
          fontWeight: 600,
          color:    "var(--kw-subtext)",
        }}>
          Read on kwentuhan.cards
        </div>
      )}

      {/* QR block — bottom-right, above the bottom safe zone */}
      <div
        style={{
          position: "absolute",
          right:    SIDE_PAD,
          bottom:   SAFE_BOTTOM + 30,
          padding:  20,
          borderRadius: 24,
          background: "rgba(255,255,255,0.95)",
          border:   "1px solid rgba(232,230,240,0.95)",
          boxShadow:"0 8px 24px rgba(26,23,48,0.10)",
        }}
      >
        {qrDataUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={qrDataUrl}
            alt=""
            width={220}
            height={220}
            style={{ display: "block", borderRadius: 8 }}
          />
        ) : (
          <div style={{ width: 220, height: 220, background: "#F0EFF6", borderRadius: 8 }} />
        )}
        <p style={{
          marginTop: 10,
          textAlign: "center",
          fontSize: 18,
          fontWeight: 600,
          color: "var(--kw-subtext)",
        }}>
          {teaser ? "Scan to reveal" : "Scan to play"}
        </p>
      </div>

      {/* Domain watermark — bottom-left, above bottom safe zone */}
      <div style={{
        position: "absolute",
        left:     SIDE_PAD,
        bottom:   SAFE_BOTTOM + 30,
        fontSize: 24,
        fontWeight: 500,
        color:    "rgba(139,135,168,0.65)",
      }}>
        kwentuhan.cards
      </div>
    </div>
  );
});

export default StoryCard;

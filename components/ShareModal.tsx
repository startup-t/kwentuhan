"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Question } from "@/lib/types";
import { LEVEL_CONFIG, CLUSTER_COLOR } from "@/lib/types";

interface Props {
  question:  Question;
  onClose:   () => void;
  onNext:    () => void;
}

const SITE_URL = "https://kwentuhan.com";

function buildShareText(q: Question): string {
  return `${q.hook}\n\n— kwentuhan`;
}
function encodedShareUrl(): string {
  return encodeURIComponent(SITE_URL);
}
function encodedShareText(q: Question): string {
  return encodeURIComponent(buildShareText(q));
}

/** Facebook sharer (web) — opens in new tab, works on desktop & mobile. */
function fbShareUrl(): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodedShareUrl()}`;
}
/** Messenger share — tries the native deep link, falls back to web dialog. */
function messengerShareUrl(): string {
  return `fb-messenger://share?link=${encodedShareUrl()}`;
}
function messengerWebShareUrl(): string {
  return `https://www.facebook.com/dialog/send?link=${encodedShareUrl()}&app_id=291494419107518&redirect_uri=${encodedShareUrl()}`;
}

export default function ShareModal({ question, onClose, onNext }: Props) {
  const [copied, setCopied]   = useState(false);
  const [igHint, setIgHint]   = useState(false);
  const previewRef            = useRef<HTMLDivElement>(null);
  const level                 = LEVEL_CONFIG[question.level] ?? LEVEL_CONFIG.light;
  const clr                   = CLUSTER_COLOR[question.cluster] ?? CLUSTER_COLOR.other;

  /* Close on Escape */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  /* Primary — native share if available, otherwise clipboard fallback */
  const handleShareOnline = useCallback(async () => {
    const text = buildShareText(question);
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Kwentuhan", text, url: SITE_URL });
        return;
      } catch { /* user cancelled — fall through to clipboard */ }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${SITE_URL}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }, [question]);

  /* Draw next — instantly advance, parent handles transition */
  const handleDraw = useCallback(() => {
    onClose();
    onNext();
  }, [onClose, onNext]);

  /* Facebook Story — FB sharer */
  const handleFacebook = useCallback(() => {
    window.open(fbShareUrl(), "_blank", "noopener,noreferrer");
  }, []);

  /* Messenger — try deep link, fall back to web */
  const handleMessenger = useCallback(() => {
    const deep = messengerShareUrl();
    const win  = window.open(deep, "_blank", "noopener,noreferrer");
    window.setTimeout(() => {
      if (!win || win.closed) {
        window.open(messengerWebShareUrl(), "_blank", "noopener,noreferrer");
      }
    }, 450);
  }, []);

  /* Instagram Story — no public web intent; copy text and hint user */
  const handleInstagram = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(`${buildShareText(question)}\n${SITE_URL}`);
    } catch { /* ignore */ }
    setIgHint(true);
    setTimeout(() => setIgHint(false), 2600);
  }, [question]);

  const canNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <div
      className="kw-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Share question"
    >
      <div
        className="kw-sheet w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background:"var(--kw-border)" }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3">
          <h3 className="font-bold text-base" style={{ color:"var(--kw-text)" }}>
            Share Question
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center btn-secondary text-xs"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* ── Card preview ── */}
        <div className="px-6 pb-4">
          <div
            ref={previewRef}
            className="rounded-3xl p-5 select-none"
            style={{
              background: "linear-gradient(135deg,#F9F8FF 0%,#FFF4F7 100%)",
              border:     "1px solid var(--kw-border)",
              boxShadow:  "0 4px 24px rgba(108,92,231,0.10)",
            }}
          >
            {/* Brand row */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Image
                  src="/logo.png"
                  alt="Kwentuhan Logo"
                  width={24}
                  height={24}
                  className="h-auto w-auto"
                />
                <span className="text-xs font-bold" style={{ color:"var(--kw-text)" }}>
                  kwentuhan
                </span>
              </div>
              <span className="level-badge text-[0.6rem] px-2 py-0.5"
                    style={{ color:level.color, background:level.bg, border:`1px solid ${level.border}` }}>
                {level.label}
              </span>
            </div>

            {/* Category */}
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ color:clr.accent, background:clr.bg }}>
                {question.categoryEmoji} {question.categoryLabel}
              </span>
            </div>

            {/* Question */}
            <p className="font-bold leading-snug"
               style={{
                 fontFamily:"'Playfair Display',Georgia,serif",
                 fontSize:"1rem",
                 color:"var(--kw-text)",
                 lineHeight:1.4,
               }}>
              {question.hook}
            </p>
          </div>
        </div>

        {/* ── Social quick row ── */}
        <div className="px-6 pb-3">
          <div className="flex items-center justify-center gap-3">
            <SocialIcon label="Facebook"  onClick={handleFacebook}  bg="#1877F2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M13.5 21v-7h2.4l.4-3h-2.8V9.2c0-.9.25-1.5 1.55-1.5H16.5V5.1c-.3 0-1.3-.1-2.45-.1-2.45 0-4.1 1.5-4.1 4.2V11H7.5v3h2.45v7h3.55z"/>
              </svg>
            </SocialIcon>
            <SocialIcon label="Instagram" onClick={handleInstagram}
                        bg="linear-gradient(135deg,#F58529,#DD2A7B 45%,#8134AF 75%,#515BD4)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" stroke="white" strokeWidth="1.8"/>
                <circle cx="12" cy="12" r="3.8" stroke="white" strokeWidth="1.8"/>
                <circle cx="17.2" cy="6.8" r="1.05" fill="white"/>
              </svg>
            </SocialIcon>
            <SocialIcon label="Messenger" onClick={handleMessenger}
                        bg="linear-gradient(135deg,#00B2FF,#006AFF 60%,#8E33FF)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M12 2.25C6.48 2.25 2.25 6.36 2.25 11.5c0 2.86 1.33 5.4 3.43 7.08V22l3.14-1.72c.84.23 1.73.36 2.66.36 5.52 0 9.75-4.11 9.75-9.25 0-5.14-4.23-9.14-9.23-9.14zm1.02 12.39l-2.52-2.69-4.87 2.69 5.37-5.7 2.57 2.69 4.8-2.69-5.35 5.7z"/>
              </svg>
            </SocialIcon>
          </div>

          {/* Inline micro-hints for IG/copy fallback */}
          <p
            className="text-center text-[0.6875rem] mt-2.5 transition-opacity duration-200"
            style={{ color: "var(--kw-muted)", opacity: igHint || copied ? 1 : 0, minHeight: 14 }}
          >
            {igHint
              ? "Question copied — open Instagram to paste in your Story"
              : copied
                ? "Copied to clipboard — paste anywhere to share"
                : "\u00A0"}
          </p>
        </div>

        {/* ── Primary + Secondary actions ── */}
        <div className="px-6 pb-6 flex flex-col gap-2.5">
          <button
            onClick={handleShareOnline}
            className="btn-primary w-full py-[1.0625rem] text-[0.9375rem] flex items-center justify-center gap-2.5"
            aria-label="Share it online"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
              <circle cx="13" cy="3"  r="1.8" stroke="white" strokeWidth="1.6"/>
              <circle cx="13" cy="15" r="1.8" stroke="white" strokeWidth="1.6"/>
              <circle cx="3"  cy="9"  r="1.8" stroke="white" strokeWidth="1.6"/>
              <path d="M5 8l6-3.5M5 10l6 3.5" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            <span>{canNativeShare ? "Share it online" : "Share it online"}</span>
          </button>

          <button
            onClick={handleDraw}
            className="btn-secondary w-full py-3.5 text-sm flex items-center justify-center gap-2"
            aria-label="Draw new question"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M2 5h9M8 2L11 5 8 8" stroke="currentColor" strokeWidth="1.6"
                    strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 11H5M8 14L5 11l3-3" stroke="currentColor" strokeWidth="1.6"
                    strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Draw new question</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── local helper ───────────────────────── */

function SocialIcon({
  label, onClick, bg, children,
}: {
  label: string; onClick: () => void; bg: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Share on ${label}`}
      className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform duration-150"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <span
        className="flex items-center justify-center"
        style={{
          width: 48, height: 48, borderRadius: 16,
          background: bg,
          boxShadow: "0 4px 14px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.2)",
        }}
      >
        {children}
      </span>
      <span className="text-[0.6875rem] font-medium" style={{ color: "var(--kw-subtext)" }}>
        {label}
      </span>
    </button>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Question } from "@/lib/types";
import type { AnswerStyle } from "@/lib/shareAnswer/types";
import { buildQuestionShareUrl } from "@/lib/qr";
import { buildAnswerRevealUrl } from "@/lib/shareAnswer/reveal";
import { downloadCardFromNode } from "@/lib/shareCard";
import StoryCard from "./StoryCard";
import StyleChips from "./StyleChips";
import TeaserToggle from "./TeaserToggle";
import SmartDefaultToast, { suggestionForLength } from "./SmartDefaultToast";

const PREVIEW_W = 270;
const SCALE     = PREVIEW_W / 1080;
const PREVIEW_H = 1920 * SCALE;

const SITE_URL = "https://kwentuhan.com";

interface Props {
  question:        Question;
  answer:          string;
  style:           AnswerStyle;
  setStyle:        (next: AnswerStyle) => void;
  teaser:          boolean;
  setTeaser:       (next: boolean) => void;
  onClose:         () => void;
  onEditAnswer:    () => void;
}

export default function SharePreview({
  question, answer, style, setStyle, teaser, setTeaser, onClose, onEditAnswer,
}: Props) {
  const cardRef           = useRef<HTMLDivElement>(null);
  const toastShownRef     = useRef(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastInfo, setToastInfo]       = useState(() => suggestionForLength(answer.length));
  const [saveHint, setSaveHint]         = useState<null | "success" | "error" | "saving">(null);

  // QR target swaps based on teaser mode.
  const qrUrl = useMemo(() => (
    teaser
      ? buildAnswerRevealUrl(question.id, answer)
      // TODO: replace with the proper "next question" landing URL once that ticket lands.
      : buildQuestionShareUrl(question.id)
  ), [teaser, question.id, answer]);

  const qrCacheKey = useMemo(() => (
    `${teaser ? "reveal" : "play"}-${question.id}`
  ), [teaser, question.id]);

  // First entry into preview → consider the smart-default toast (one-shot per session).
  useEffect(() => {
    if (toastShownRef.current) return;
    toastShownRef.current = true;
    const info = suggestionForLength(answer.length);
    if (info.suggest) {
      setToastInfo(info);
      setToastVisible(true);
    }
  }, [answer.length]);

  const handleStyleChange = useCallback((next: AnswerStyle) => {
    setStyle(next);
    if (toastInfo.suggest && next === toastInfo.suggest) setToastVisible(false);
  }, [setStyle, toastInfo.suggest]);

  const handleSave = useCallback(async () => {
    if (!cardRef.current) return;
    setSaveHint("saving");
    try {
      await downloadCardFromNode(cardRef.current, `kwentuhan-${question.id}.png`);
      setSaveHint("success");
    } catch {
      setSaveHint("error");
    } finally {
      window.setTimeout(() => setSaveHint(null), 2200);
    }
  }, [question.id]);

  const handleFacebook = useCallback(() => {
    const u = encodeURIComponent(SITE_URL);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${u}`, "_blank", "noopener,noreferrer");
  }, []);

  const handleMessenger = useCallback(() => {
    const u    = encodeURIComponent(SITE_URL);
    const deep = `fb-messenger://share?link=${u}`;
    const win  = window.open(deep, "_blank", "noopener,noreferrer");
    window.setTimeout(() => {
      if (!win || win.closed) {
        window.open(
          `https://www.facebook.com/dialog/send?link=${u}&app_id=291494419107518&redirect_uri=${u}`,
          "_blank", "noopener,noreferrer",
        );
      }
    }, 450);
  }, []);

  const handleInstagram = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(`${question.hook}\n\n— kwentuhan\n${SITE_URL}`);
    } catch { /* ignore */ }
  }, [question.hook]);

  const isEmpty = answer.trim().length === 0;

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3">
        <h3 className="font-bold text-base" style={{ color: "var(--kw-text)" }}>
          Preview
        </h3>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-xl flex items-center justify-center btn-secondary text-xs"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Smart-default toast, one-shot per session */}
      {toastVisible && (
        <div className="px-6 mb-2">
          <SmartDefaultToast
            suggest={toastInfo.suggest}
            message={toastInfo.message}
            onDismiss={() => setToastVisible(false)}
          />
        </div>
      )}

      {/* Live StoryCard preview, scaled */}
      <div className="px-6 pb-3 flex justify-center">
        <div
          style={{
            width:    PREVIEW_W,
            height:   PREVIEW_H,
            overflow: "hidden",
            borderRadius: 16,
            border:   "1px solid var(--kw-border)",
            boxShadow:"0 8px 32px rgba(108,92,231,0.14)",
            background: "white",
          }}
        >
          <div
            key={style}
            style={{
              transform:       `scale(${SCALE})`,
              transformOrigin: "top left",
              animation:       "fadeIn 0.3s ease both",
              width:           1080,
              height:          1920,
            }}
          >
            <StoryCard
              ref={cardRef}
              question={question}
              answer={answer}
              style={style}
              teaser={teaser}
              qrUrl={qrUrl}
              qrCacheKey={qrCacheKey}
              onEditAnswer={onEditAnswer}
            />
          </div>
        </div>
      </div>

      {/* Style chips */}
      <div className="px-6 pb-4">
        <StyleChips value={style} onChange={handleStyleChange} />
      </div>

      {/* Divider */}
      <div className="mx-6 h-px" style={{ background: "var(--kw-border)" }} />

      {/* Teaser toggle */}
      <div className="px-6 py-4">
        <TeaserToggle value={teaser} onChange={setTeaser} />
      </div>

      {/* Save + secondary share */}
      <div className="px-6 pb-6 flex flex-col gap-3">
        <button
          onClick={handleSave}
          disabled={isEmpty || saveHint === "saving"}
          className="btn-primary w-full py-[1.0625rem] text-[0.9375rem] flex items-center justify-center gap-2"
          style={{
            opacity: isEmpty ? 0.55 : 1,
            cursor:  isEmpty ? "not-allowed" : "pointer",
          }}
          aria-label={isEmpty ? "Add your answer first" : "Save card"}
        >
          {saveHint === "saving"
            ? "Saving…"
            : isEmpty
              ? "Add your answer first"
              : "Save"}
        </button>

        <p
          className="text-center text-[0.6875rem] transition-opacity duration-200"
          style={{
            color:     "var(--kw-muted)",
            opacity:   saveHint === "success" || saveHint === "error" ? 1 : 0,
            minHeight: 14,
          }}
        >
          {saveHint === "success" ? "Card saved!"
            : saveHint === "error" ? "Failed to save image"
            : " "}
        </p>

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
      </div>
    </>
  );
}

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
          width: 44, height: 44, borderRadius: 14,
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

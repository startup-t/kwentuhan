"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Question } from "@/lib/types";
import type { AnswerStyle } from "@/lib/shareAnswer/types";
import { getLastStyle, setLastStyle } from "@/lib/shareAnswer/persist";
import { buildQuestionShareUrl } from "@/lib/qr";
import { createAnswerRevealUrl } from "@/lib/shareAnswer/reveal";
import { downloadCardFromNode } from "@/lib/shareCard";
import StoryCard from "./StoryCard";
import StyleChips from "./StyleChips";
import TeaserToggle from "./TeaserToggle";
import SmartDefaultToast, { suggestionForLength } from "./SmartDefaultToast";

const PREVIEW_W = 270;
const SCALE = PREVIEW_W / 1080;
const PREVIEW_H = 1920 * SCALE;
const SITE_URL = "https://kwentuhan.cards";

export interface KwentoExportPanelProps {
  /** The question this card shows. Carries level / category / cluster for the
   *  StoryCard rendering. */
  question: Question;
  /** The respondent's answer text. */
  answer: string;
  /**
   * Pre-minted reveal URL.
   *
   * - User 1 flow: omitted → the panel mints one on demand via /api/teaser
   *   when teaser mode is toggled on.
   * - User 2 flow: provided (the URL is already minted at submit time) → the
   *   panel skips the mint step and uses it directly as the QR target.
   */
  initialRevealUrl?: string;
  /** Teaser toggle starts here. Default off (matches User 1's existing UX);
   *  User 2 typically passes `true` since they came in via a teaser link. */
  initialTeaser?: boolean;
  /** Render the editable answer affordance (pencil click on the card body)? */
  onEditAnswer?: () => void;
  /** Footer slot — used by the modal flow to render its Close, or by the page
   *  flow to render a "Done"/return CTA. Optional. */
  footer?: React.ReactNode;
}

/**
 * Shared "final state" UI for both kwento publishing paths:
 *   - User 1 (in-app creator) via ShareModal → SharePreview → this panel
 *   - User 2 (Scan-to-Play respondent) via KwentoForm post-submit → this panel
 *
 * Both render the identical StoryCard preview, style chips, teaser toggle,
 * PNG download, and social-share row. The only difference is how the reveal
 * URL is acquired (minted vs. provided). The export pipeline (StoryCard +
 * `downloadCardFromNode`) is byte-for-byte identical between the two flows.
 */
export default function KwentoExportPanel({
  question,
  answer,
  initialRevealUrl,
  initialTeaser = false,
  onEditAnswer,
  footer,
}: KwentoExportPanelProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const [style, setStyleState] = useState<AnswerStyle>("chat");
  const [teaser, setTeaser] = useState<boolean>(initialTeaser);

  // teaserUrl seeded from initialRevealUrl (User 2 path). User 1 path mints
  // it lazily when teaser flips to true.
  const [teaserUrl, setTeaserUrl] = useState<string>(initialRevealUrl ?? "");
  const [teaserLoading, setTeaserLoading] = useState<boolean>(false);
  const [teaserError, setTeaserError] = useState<boolean>(false);

  const [saveHint, setSaveHint] = useState<null | "saving" | "success" | "error">(null);
  const [toastVisible, setToastVisible] = useState<boolean>(false);
  const [toastInfo, setToastInfo] = useState(() => suggestionForLength(answer.length));
  const toastShownRef = useRef<boolean>(false);

  // Hydrate the user's last-used style from localStorage. Defaults to "chat".
  useEffect(() => {
    setStyleState(getLastStyle());
  }, []);

  // First entry → smart-default toast (one-shot per session)
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
    setStyleState(next);
    setLastStyle(next);
    if (toastInfo.suggest && next === toastInfo.suggest) setToastVisible(false);
  }, [toastInfo.suggest]);

  // ── Reveal URL acquisition ───────────────────────────────────────────────
  // If we already have a pre-minted URL (User 2 path), skip minting entirely.
  // Otherwise (User 1), mint via /api/teaser when teaser is on and we have
  // an answer.
  useEffect(() => {
    if (initialRevealUrl) return; // pre-minted, no work to do
    let mounted = true;

    if (!teaser || answer.trim().length === 0) {
      setTeaserUrl("");
      setTeaserLoading(false);
      setTeaserError(false);
      return () => { mounted = false; };
    }

    setTeaserLoading(true);
    setTeaserError(false);
    setTeaserUrl("");

    createAnswerRevealUrl(question.id, question.hook, answer)
      .then((url) => {
        if (!mounted) return;
        setTeaserUrl(url);
        setTeaserLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setTeaserUrl("");
        setTeaserLoading(false);
        setTeaserError(true);
      });

    return () => { mounted = false; };
  }, [teaser, question.id, question.hook, answer, initialRevealUrl]);

  const qrUrl = useMemo(() => (
    teaser ? teaserUrl : buildQuestionShareUrl(Number(question.id))
  ), [teaser, teaserUrl, question.id]);

  const qrCacheKey = useMemo(() => (
    `${teaser ? "reveal" : "play"}-${question.id}`
  ), [teaser, question.id]);

  const shareTarget = qrUrl || SITE_URL;

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
    const u = encodeURIComponent(shareTarget);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${u}`, "_blank", "noopener,noreferrer");
  }, [shareTarget]);

  const handleMessenger = useCallback(() => {
    const u = encodeURIComponent(shareTarget);
    const deep = `fb-messenger://share?link=${u}`;
    const win = window.open(deep, "_blank", "noopener,noreferrer");
    window.setTimeout(() => {
      if (!win || win.closed) {
        window.open(
          `https://www.facebook.com/dialog/send?link=${u}&app_id=291494419107518&redirect_uri=${u}`,
          "_blank", "noopener,noreferrer",
        );
      }
    }, 450);
  }, [shareTarget]);

  const handleInstagram = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(`${question.hook}\n\n— kwentuhan\n${shareTarget}`);
    } catch { /* ignore */ }
  }, [question.hook, shareTarget]);

  const handleRetryTeaser = useCallback(() => {
    if (initialRevealUrl) {
      // Pre-minted URLs don't need retry — re-seed and clear error.
      setTeaserUrl(initialRevealUrl);
      setTeaserError(false);
      return;
    }
    setTeaserError(false);
    setTeaserLoading(true);
    setTeaserUrl("");
    createAnswerRevealUrl(question.id, question.hook, answer)
      .then((url) => { setTeaserUrl(url); setTeaserLoading(false); })
      .catch(() => { setTeaserLoading(false); setTeaserError(true); });
  }, [initialRevealUrl, question.id, question.hook, answer]);

  const isEmpty = answer.trim().length === 0;
  // Block Save while a teaser link is still being minted — capturing the
  // card with a gray QR placeholder produces a useless export.
  const saveLocked = teaser && (teaserLoading || !teaserUrl);
  const saveDisabled = isEmpty || saveHint === "saving" || saveLocked;
  const saveLabel = saveHint === "saving"
    ? "Saving…"
    : isEmpty
      ? "Add your answer first"
      : teaser && teaserLoading
        ? "Generating link…"
        : teaser && !teaserUrl
          ? "Retry after generating link"
          : "Download card";

  return (
    <div className="flex flex-col">
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

      {/* Live StoryCard preview, scaled to fit the sheet */}
      <div className="px-6 pb-3 flex justify-center">
        <div
          style={{
            width: PREVIEW_W,
            height: PREVIEW_H,
            overflow: "hidden",
            borderRadius: 16,
            border: "1px solid var(--kw-border)",
            boxShadow: "0 8px 32px rgba(108,92,231,0.14)",
            background: "white",
          }}
        >
          <div
            key={style}
            style={{
              transform: `scale(${SCALE})`,
              transformOrigin: "top left",
              animation: "fadeIn 0.3s ease both",
              width: 1080,
              height: 1920,
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
              teaserLoading={teaserLoading}
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

      {/* Save + share */}
      <div className="px-6 pb-6 flex flex-col gap-3">
        {/* Reveal link strip (visible only when teaser is on + url ready) */}
        {teaser && teaserUrl && (
          <div
            className="rounded-xl border px-3 py-2 text-[0.75rem]"
            style={{ borderColor: "var(--kw-border)", color: "var(--kw-subtext)" }}
          >
            Reveal link:{" "}
            <a href={teaserUrl} className="underline break-all">
              {teaserUrl}
            </a>
          </div>
        )}

        {/* Loading state */}
        {teaser && teaserLoading && !teaserUrl && (
          <div
            className="rounded-xl border px-3 py-2 flex items-center gap-2 text-[0.75rem]"
            style={{ borderColor: "var(--kw-border)", color: "var(--kw-subtext)" }}
          >
            <span
              style={{
                display: "inline-block",
                width: 12, height: 12,
                borderRadius: "50%",
                border: "2px solid var(--kw-accent)",
                borderTopColor: "transparent",
                animation: "spin 0.7s linear infinite",
                flexShrink: 0,
              }}
              aria-hidden
            />
            Generating reveal link…
          </div>
        )}

        {/* Error + retry */}
        {teaser && teaserError && !teaserUrl && (
          <div
            className="rounded-xl border px-3 py-2 flex items-center justify-between gap-2 text-[0.75rem]"
            style={{
              borderColor: "rgba(232,82,122,0.35)",
              backgroundColor: "#FFECE8",
              color: "#b5294e",
            }}
          >
            <span>Couldn&#39;t generate reveal link.</span>
            <button
              onClick={handleRetryTeaser}
              className="font-semibold underline shrink-0"
              style={{ color: "#b5294e" }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Download button */}
        <button
          onClick={handleSave}
          disabled={saveDisabled}
          className="btn-primary w-full py-[1.0625rem] text-[0.9375rem] flex items-center justify-center gap-2"
          style={{
            opacity: saveDisabled ? 0.55 : 1,
            cursor: saveDisabled ? "not-allowed" : "pointer",
          }}
          aria-label={saveLabel}
        >
          {saveLabel}
        </button>

        <p
          className="text-center text-[0.6875rem] transition-opacity duration-200"
          style={{
            color: "var(--kw-muted)",
            opacity: saveHint === "success" || saveHint === "error" ? 1 : 0,
            minHeight: 14,
          }}
        >
          {saveHint === "success"
            ? "Card saved!"
            : saveHint === "error"
              ? "Failed to save image"
              : " "}
        </p>

        {/* Social row */}
        <div className="flex items-center justify-center gap-3">
          <SocialIcon label="Facebook" onClick={handleFacebook} bg="#1877F2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M13.5 21v-7h2.4l.4-3h-2.8V9.2c0-.9.25-1.5 1.55-1.5H16.5V5.1c-.3 0-1.3-.1-2.45-.1-2.45 0-4.1 1.5-4.1 4.2V11H7.5v3h2.45v7h3.55z" />
            </svg>
          </SocialIcon>
          <SocialIcon
            label="Instagram"
            onClick={handleInstagram}
            bg="linear-gradient(135deg,#F58529,#DD2A7B 45%,#8134AF 75%,#515BD4)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" stroke="white" strokeWidth="1.8" />
              <circle cx="12" cy="12" r="3.8" stroke="white" strokeWidth="1.8" />
              <circle cx="17.2" cy="6.8" r="1.05" fill="white" />
            </svg>
          </SocialIcon>
          <SocialIcon
            label="Messenger"
            onClick={handleMessenger}
            bg="linear-gradient(135deg,#00B2FF,#006AFF 60%,#8E33FF)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M12 2.25C6.48 2.25 2.25 6.36 2.25 11.5c0 2.86 1.33 5.4 3.43 7.08V22l3.14-1.72c.84.23 1.73.36 2.66.36 5.52 0 9.75-4.11 9.75-9.25 0-5.14-4.23-9.14-9.23-9.14zm1.02 12.39l-2.52-2.69-4.87 2.69 5.37-5.7 2.57 2.69 4.8-2.69-5.35 5.7z" />
            </svg>
          </SocialIcon>
        </div>

        {footer && <div className="pt-1">{footer}</div>}
      </div>
    </div>
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

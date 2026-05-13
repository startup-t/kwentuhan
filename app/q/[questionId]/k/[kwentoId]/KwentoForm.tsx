"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { getCachedQRCodeDataUrl } from "@/lib/qr";

type KwentoFormProps = {
  questionId: string;
  questionText: string;
  heading?: string;
  subheading?: string;
};

type Stage = "idle" | "loading" | "success" | "error";

const MAX_CHARS = 500;

export function KwentoForm({
  questionId,
  questionText,
  heading = "Your turn",
  subheading = "Write your answer and we'll spin up a shareable link for you.",
}: KwentoFormProps) {
  const [text, setText] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [revealUrl, setRevealUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Render the QR for the freshly-minted reveal URL once we have it.
  useEffect(() => {
    if (!revealUrl) {
      setQrDataUrl("");
      return;
    }
    let alive = true;
    getCachedQRCodeDataUrl(`form-success:${revealUrl}`, revealUrl, 320)
      .then((url) => { if (alive) setQrDataUrl(url); })
      .catch(() => { if (alive) setQrDataUrl(""); });
    return () => { alive = false; };
  }, [revealUrl]);

  const charsLeft = MAX_CHARS - text.length;
  const canSubmit = text.trim().length > 0 && stage !== "loading";

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimmed = text.trim();
      if (!trimmed || stage === "loading") return;

      setStage("loading");
      setErrorMsg("");

      try {
        const res = await fetch("/api/kwento", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionId,
            questionText,
            answerText: trimmed,
            isTeaser: true,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setErrorMsg(
            typeof data?.error === "string"
              ? data.error
              : "Something went wrong. Please try again."
          );
          setStage("error");
          return;
        }

        if (typeof data?.revealUrl === "string" && data.revealUrl.length > 0) {
          setRevealUrl(data.revealUrl);
          setStage("success");
          return;
        }

        setErrorMsg("Kwento saved, but couldn't generate the reveal link.");
        setStage("error");
      } catch {
        setErrorMsg("No internet connection. Please try again.");
        setStage("error");
      }
    },
    [text, stage, questionId, questionText]
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(revealUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* ignore */
    }
  }, [revealUrl]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "My kwento on Kwentuhan",
          text: "Sumagot ako ng isang tanong sa Kwentuhan — basahin mo ang sagot ko, tapos sagutin mo rin.",
          url: revealUrl,
        });
        return;
      } catch {
        /* fall through to copy */
      }
    }
    handleCopy();
  }, [revealUrl, handleCopy]);

  const handleReset = useCallback(() => {
    setStage("idle");
    setErrorMsg("");
    setRevealUrl("");
    setText("");
    setCopied(false);
    setTimeout(() => textareaRef.current?.focus(), 60);
  }, []);

  // ── Success state ──────────────────────────────────────────────────────────
  if (stage === "success") {
    return (
      <div className="w-full kw-card p-6 flex flex-col gap-5 relative overflow-hidden">
        {/* Soft gradient accent */}
        <div
          aria-hidden
          className="absolute -top-12 -left-12 w-36 h-36 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(108,92,231,0.20) 0%, transparent 70%)",
            filter: "blur(8px)",
          }}
        />

        {/* Icon + heading */}
        <div className="flex flex-col items-center text-center gap-1 relative">
          <span className="text-4xl mb-1">💫</span>
          <h3
            className="text-lg font-bold"
            style={{ fontFamily: "var(--font-playfair), serif", color: "var(--kw-text)" }}
          >
            Your kwento is live
          </h3>
          <p className="text-sm max-w-[20rem]" style={{ color: "var(--kw-subtext)" }}>
            Pass it forward — whoever opens this link will read your story, then have a chance to share theirs.
          </p>
        </div>

        {/* QR code — the centerpiece of the chain moment */}
        <div className="relative flex justify-center">
          <div
            className="rounded-2xl p-3 flex flex-col items-center gap-2"
            style={{
              background: "var(--kw-surface)",
              border: "1px solid var(--kw-border-solid)",
              boxShadow: "0 8px 32px rgba(108,92,231,0.14)",
            }}
          >
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt="QR code for your kwento"
                width={160}
                height={160}
                style={{ width: 160, height: 160, display: "block" }}
              />
            ) : (
              <div
                className="kw-shimmer rounded-md"
                style={{ width: 160, height: 160 }}
                aria-label="Loading QR code"
              />
            )}
            <p
              className="text-[0.625rem] font-semibold uppercase tracking-widest"
              style={{ color: "var(--kw-muted)" }}
            >
              scan to reveal
            </p>
          </div>
        </div>

        {/* Reveal URL pill */}
        <div
          className="flex items-center gap-2 rounded-2xl px-4 py-3 border relative"
          style={{ background: "var(--kw-surface-alt)", borderColor: "var(--kw-border-solid)" }}
        >
          <span
            className="flex-1 text-xs font-medium truncate"
            style={{ color: "var(--kw-accent)" }}
            title={revealUrl}
          >
            {revealUrl}
          </span>
          <button
            onClick={handleCopy}
            className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"
            style={{
              background: copied ? "var(--kw-success)" : "var(--kw-accent-soft)",
              color: copied ? "#fff" : "var(--kw-accent)",
            }}
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>

        {/* Primary share */}
        <button
          onClick={handleShare}
          className="btn-primary w-full py-4 text-[0.9375rem] flex items-center justify-center gap-2 relative"
        >
          <span>📤</span>
          <span>Share your kwento</span>
        </button>

        {/* Secondary: preview as the reader will see it */}
        <a
          href={revealUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-center text-sm font-medium underline transition-colors relative"
          style={{ color: "var(--kw-accent)" }}
        >
          Preview how others will see it ↗
        </a>

        {/* Tertiary: write another */}
        <button
          onClick={handleReset}
          className="text-xs font-medium text-center transition-colors relative"
          style={{ color: "var(--kw-subtext)" }}
        >
          Write another kwento →
        </button>
      </div>
    );
  }

  // ── Idle / loading / error state ──────────────────────────────────────────
  return (
    <div className="w-full kw-card p-6 flex flex-col gap-5">
      {/* Heading */}
      <div>
        <h3
          className="text-[1.05rem] font-bold mb-1 flex items-center gap-2"
          style={{ fontFamily: "var(--font-playfair), serif", color: "var(--kw-text)" }}
        >
          <span>{heading}</span>
          <span aria-hidden>✍️</span>
        </h3>
        <p className="text-sm" style={{ color: "var(--kw-subtext)" }}>
          {subheading}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Textarea */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            required
            minLength={1}
            maxLength={MAX_CHARS}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (stage === "error") setStage("idle");
            }}
            placeholder="Ikwento mo naman…"
            rows={5}
            className="w-full resize-none rounded-2xl px-4 py-3.5 text-[0.9375rem] leading-relaxed outline-none transition-shadow focus:ring-2"
            style={{
              fontFamily: "var(--font-kalam), cursive",
              background: "var(--kw-surface-alt)",
              color: "var(--kw-note-ink)",
              border: stage === "error"
                ? "1.5px solid var(--kw-wild)"
                : "1.5px solid var(--kw-border-solid)",
              // @ts-expect-error — custom property
              "--tw-ring-color": "var(--kw-accent)",
            }}
          />
          {/* Char counter */}
          <span
            className="absolute bottom-3 right-3 text-[0.6875rem] font-medium tabular-nums pointer-events-none"
            style={{ color: charsLeft < 40 ? "var(--kw-wild)" : "var(--kw-muted)" }}
          >
            {charsLeft}
          </span>
        </div>

        {/* Error message */}
        {stage === "error" && errorMsg && (
          <div
            className="flex items-start gap-2 rounded-xl px-4 py-3 text-sm"
            style={{ background: "var(--kw-wild-soft)", color: "var(--kw-wild-text)" }}
          >
            <span className="shrink-0 mt-px">⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={!canSubmit}
          className="btn-primary w-full py-4 text-[0.9375rem] flex items-center justify-center gap-2 transition-opacity"
          style={{ opacity: canSubmit ? 1 : 0.45, cursor: canSubmit ? "pointer" : "not-allowed" }}
        >
          {stage === "loading" ? (
            <>
              <Spinner />
              <span>Sharing…</span>
            </>
          ) : (
            <>
              <span>✨</span>
              <span>Share your kwento</span>
            </>
          )}
        </button>
      </form>

      {/* Fine print */}
      <p className="text-[0.6875rem] text-center" style={{ color: "var(--kw-muted)" }}>
        Your kwento is unlisted — only people you send the link to will see it.
      </p>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden
      className="kw-spin"
    >
      <circle cx="9" cy="9" r="7.5" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" />
      <path
        d="M9 1.5a7.5 7.5 0 0 1 7.5 7.5"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

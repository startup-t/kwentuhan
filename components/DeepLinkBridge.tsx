"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  deepLink: string;
  /** Visual variant.
   * "button"  — outlined secondary button (used on Scan-to-Play page)
   * "subtle"  — small text link (default, used on Scan-to-Reveal page)
   */
  variant?: "button" | "subtle";
}

const APP_STORE_URL = "https://apps.apple.com/app/kwentuhan";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.kwentuhan";

type Platform = "ios" | "android" | "other";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}

/**
 * Passive deep-link bridge — never auto-redirects on mount.
 *
 * iOS: launches via a hidden iframe so Safari does NOT show
 *      "Safari cannot open the page because the address is invalid"
 *      when the custom scheme isn't registered.
 * Android: uses an `intent://` URL with a Play-Store fallback baked in.
 * Desktop / other: falls straight through to the store nudge.
 *
 * If the page is still visible ~1.4 s after the launch attempt the app
 * isn't installed — we reveal an inline "get the app" row.
 */
export default function DeepLinkBridge({ deepLink, variant = "subtle" }: Props) {
  const [state, setState] = useState<"idle" | "trying" | "notInstalled">("idle");
  const [platform, setPlatform] = useState<Platform>("other");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    setPlatform(detectPlatform());
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (iframeRef.current) iframeRef.current.remove();
    };
  }, []);

  const handleOpen = useCallback(() => {
    if (state === "trying") return;
    setState("trying");

    if (platform === "ios") {
      // Hidden iframe avoids Safari's "address is invalid" alert.
      const f = document.createElement("iframe");
      f.style.display = "none";
      f.src = deepLink;
      document.body.appendChild(f);
      iframeRef.current = f;
    } else if (platform === "android") {
      // intent:// silently falls back to the Play Store via S.browser_fallback_url.
      const path = deepLink.replace(/^kwentuhan:\/\//, "");
      const intent =
        `intent://${path}#Intent;scheme=kwentuhan;package=com.kwentuhan;` +
        `S.browser_fallback_url=${encodeURIComponent(PLAY_STORE_URL)};end`;
      window.location.href = intent;
    } else {
      // Desktop — no app to open, just show the nudge.
      setState("notInstalled");
      return;
    }

    timerRef.current = setTimeout(() => {
      if (!document.hidden) setState("notInstalled");
    }, 1400);

    const onHide = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      document.removeEventListener("visibilitychange", onHide);
    };
    document.addEventListener("visibilitychange", onHide);
  }, [deepLink, state, platform]);

  if (variant === "button") {
    return (
      <div className="w-full flex flex-col gap-2">
        <button
          onClick={handleOpen}
          disabled={state === "trying"}
          className="w-full py-3.5 px-6 btn-secondary text-sm font-semibold flex items-center justify-center gap-2"
        >
          {state === "trying" ? (
            <span style={{ color: "var(--kw-subtext)" }}>Opening app…</span>
          ) : (
            <>
              <span>📱</span>
              <span style={{ color: "var(--kw-accent)" }}>Open in Kwentuhan app</span>
            </>
          )}
        </button>

        {state === "notInstalled" && <StoreRow />}
      </div>
    );
  }

  // variant === "subtle"
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleOpen}
        disabled={state === "trying"}
        className="text-xs font-medium transition-colors"
        style={{ color: state === "trying" ? "var(--kw-muted)" : "var(--kw-subtext)" }}
      >
        {state === "trying" ? "Opening app…" : "Already have the app? Open in Kwentuhan →"}
      </button>

      {state === "notInstalled" && (
        <div className="flex items-center gap-3 mt-1">
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold underline"
            style={{ color: "var(--kw-accent)" }}
          >
            App Store
          </a>
          <span style={{ color: "var(--kw-muted)" }}>·</span>
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold underline"
            style={{ color: "var(--kw-accent)" }}
          >
            Google Play
          </a>
        </div>
      )}
    </div>
  );
}

function StoreRow() {
  return (
    <div
      className="rounded-2xl px-4 py-3 text-sm flex flex-col gap-2"
      style={{ background: "var(--kw-surface-alt)", border: "1px solid var(--kw-border-solid)" }}
    >
      <p style={{ color: "var(--kw-text)" }} className="font-medium text-xs">
        App not installed yet?
      </p>
      <div className="flex gap-2">
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-center py-2 px-3 rounded-xl text-xs font-semibold"
          style={{ background: "var(--kw-accent)", color: "#fff" }}
        >
          App Store
        </a>
        <a
          href={PLAY_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-center py-2 px-3 rounded-xl text-xs font-semibold"
          style={{ background: "var(--kw-text)", color: "#fff" }}
        >
          Google Play
        </a>
      </div>
    </div>
  );
}

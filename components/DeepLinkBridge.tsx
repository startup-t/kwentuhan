"use client";

import { useEffect, useState, useCallback } from "react";

interface Props {
  deepLink: string;
}

export default function DeepLinkBridge({ deepLink }: Props) {
  const [showBanner, setShowBanner] = useState(false);

  const openApp = useCallback(() => {
    window.location.href = deepLink;
  }, [deepLink]);

  useEffect(() => {
    openApp();

    const timer = setTimeout(() => {
      if (!document.hidden) setShowBanner(true);
    }, 1500);

    const onVisibility = () => {
      if (document.hidden) clearTimeout(timer);
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [openApp]);

  return (
    <>
      <button
        onClick={openApp}
        className="w-full py-3.5 px-6 bg-[var(--kw-accent)] text-white font-semibold rounded-[var(--kw-r-btn)] text-sm tracking-wide hover:bg-[var(--kw-accent-deep)] active:scale-95 transition-all"
      >
        Open in App
      </button>

      {showBanner && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-[var(--kw-surface)] border-t border-[var(--kw-border-solid)] shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
          <div className="max-w-sm mx-auto">
            <p className="text-sm font-medium text-[var(--kw-text)] mb-1">
              App not installed?
            </p>
            <p className="text-xs text-[var(--kw-subtext)] mb-3">
              Get the full Kwentuhan experience on your phone.
            </p>
            <div className="flex gap-2">
              <a
                href="https://apps.apple.com/app/kwentuhan/id000000000"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center py-2.5 px-4 bg-[var(--kw-accent)] text-white rounded-[var(--kw-r-btn)] font-semibold text-sm hover:bg-[var(--kw-accent-deep)] transition-colors"
              >
                Download App
              </a>
              <button
                onClick={() => setShowBanner(false)}
                className="flex-1 py-2.5 px-4 border border-[var(--kw-border-solid)] text-[var(--kw-text)] rounded-[var(--kw-r-btn)] font-semibold text-sm hover:bg-[var(--kw-surface-alt)] transition-colors"
              >
                Continue on web
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

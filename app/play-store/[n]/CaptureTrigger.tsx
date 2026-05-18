"use client";

import { useEffect } from "react";
import { toPng } from "html-to-image";

/**
 * Mounts a global on `window` that captures the main element of the
 * /play-store/[n] page as a PNG dataURL and POSTs it to /api/save-play-store.
 *
 * Drive from eval with:
 *   await window.__capturePlayStore(1)
 *
 * Dev-only — paired with the dev-gated /api/save-play-store endpoint.
 */
export default function CaptureTrigger() {
  useEffect(() => {
    type CapturePlayStore = (idx: number) => Promise<{ ok: boolean; bytes?: number; error?: string }>;
    type WindowWithCapture = Window & {
      __capturePlayStore?: CapturePlayStore;
    };
    const w = window as WindowWithCapture;

    w.__capturePlayStore = async (idx: number) => {
      const root = document.querySelector("main");
      if (!root) return { ok: false, error: "no main element" };

      // Give fonts + the radial-glow paints one extra frame to settle before
      // rasterizing. html-to-image otherwise sometimes captures pre-font-load.
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

      let dataUrl: string;
      try {
        dataUrl = await toPng(root as HTMLElement, {
          pixelRatio: 1, // page is already 1080×1920; no need to upscale
          cacheBust: true,
          width: 1080,
          height: 1920,
        });
      } catch (err) {
        return { ok: false, error: `toPng failed: ${(err as Error)?.message ?? err}` };
      }

      const res = await fetch("/api/save-play-store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ n: idx, dataUrl }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: json?.error ?? `HTTP ${res.status}` };
      return { ok: true, bytes: json?.bytes };
    };

    return () => {
      delete w.__capturePlayStore;
    };
  }, []);

  return null;
}

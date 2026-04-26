"use client";
// lib/shareCard.ts — exports the rendered StoryCard React tree to a PNG.
// Single source of truth: preview === export. Teaser blur is baked via
// CSS filter on the source node, which html-to-image preserves in the snapshot.

import { toBlob } from "html-to-image";

const CARD_W = 1080;
const CARD_H = 1920;

export async function exportCardFromNode(node: HTMLElement): Promise<Blob> {
  const blob = await toBlob(node, {
    width:      CARD_W,
    height:     CARD_H,
    pixelRatio: 1,
    cacheBust:  true,
    // Override any preview-side scale so the snapshot captures the full 1080×1920 layout.
    style: {
      transform:       "none",
      transformOrigin: "top left",
      width:           `${CARD_W}px`,
      height:          `${CARD_H}px`,
    },
  });
  if (!blob) throw new Error("Failed to render share card");
  return blob;
}

export async function downloadCardFromNode(
  node: HTMLElement,
  filename: string,
): Promise<void> {
  const blob = await exportCardFromNode(node);

  // Prefer native file share when available (mobile saves to camera roll / files).
  if (typeof navigator !== "undefined" && "share" in navigator) {
    try {
      const file = new File([blob], filename, { type: "image/png" });
      if ("canShare" in navigator && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: "Kwentuhan card", files: [file] });
        return;
      }
    } catch {
      // Continue to browser download fallback.
    }
  }

  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

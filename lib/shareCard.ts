"use client";
// lib/shareCard.ts — exports the rendered StoryCard React tree to a PNG.
// Single source of truth: preview === export. Teaser blur is baked via
// CSS filter on the source node, which html-to-image preserves in the snapshot.

import { toBlob } from "html-to-image";

const CARD_W = 1080;
const CARD_H = 1920;
const QR_READY_TIMEOUT_MS = 2500;
const QR_READY_POLL_MS = 50;

function isVisible(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function hasAllowedQrTarget(value: string): boolean {
  return value.startsWith("https://kwentuhan.cards/reveal/") ||
    value.startsWith("https://kwentuhan.cards/q/");
}

async function waitForQrReady(node: HTMLElement): Promise<void> {
  const started = Date.now();

  while (Date.now() - started < QR_READY_TIMEOUT_MS) {
    const qrCode = node.querySelector<HTMLElement>('[data-qr-role="code"]');
    const qrLabel = node.querySelector<HTMLElement>('[data-qr-role="label"]');
    const qrWrap = node.querySelector<HTMLElement>('[data-qr-role="wrapper"]');
    const qrValue = qrCode?.getAttribute("data-qr-value") ?? qrWrap?.getAttribute("data-qr-value") ?? "";
    const label = (qrLabel?.textContent ?? "").trim().toLowerCase();

    if (
      qrCode &&
      qrLabel &&
      isVisible(qrCode) &&
      isVisible(qrLabel) &&
      (label === "scan to play" || label === "scan to reveal") &&
      hasAllowedQrTarget(qrValue)
    ) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, QR_READY_POLL_MS));
  }

  throw new Error("QR not ready for export");
}

export async function exportCardFromNode(node: HTMLElement): Promise<Blob> {
  await waitForQrReady(node);

  const blob = await toBlob(node, {
    width:      CARD_W,
    height:     CARD_H,
    pixelRatio: 2,
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

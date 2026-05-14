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
  const allowedOrigins = ["https://kwentuhan.cards"];
  if (typeof window !== "undefined" && window.location?.origin) {
    allowedOrigins.unshift(window.location.origin);
  }

  return allowedOrigins.some((origin) =>
    value.startsWith(`${origin}/reveal/`) || value.startsWith(`${origin}/q/`)
  );
}

async function waitForQrReady(node: HTMLElement): Promise<void> {
  const started = Date.now();

  while (Date.now() - started < QR_READY_TIMEOUT_MS) {
    const qrCode = node.querySelector<HTMLElement>('[data-qr-role="code"]');
    const qrLabel = node.querySelector<HTMLElement>('[data-qr-role="label"]');
    const qrWrap = node.querySelector<HTMLElement>('[data-qr-role="wrapper"]');
    const qrValue = qrCode?.getAttribute("data-qr-value") ?? qrWrap?.getAttribute("data-qr-value") ?? "";
    const label = (qrLabel?.textContent ?? "").trim().toLowerCase();

    const codeVisible = qrCode && isVisible(qrCode);
    const labelVisible = qrLabel && isVisible(qrLabel);
    const labelValid = label === "scan to play" || label === "scan to reveal";
    const targetValid = hasAllowedQrTarget(qrValue);

    if (codeVisible && labelVisible && labelValid && targetValid) {
      console.debug("[shareCard] QR ready for export:", { mode: label, qrValue });
      return;
    }

    if (Date.now() - started < 500 || (Date.now() - started) % 1000 === 0) {
      console.debug("[shareCard] Waiting for QR readiness:", {
        codeVisible, labelVisible, labelValid, targetValid,
        label, qrValue, elapsed: Date.now() - started,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, QR_READY_POLL_MS));
  }

  console.error("[shareCard] QR not ready for export - timeout");
  throw new Error("QR not ready for export");
}

export async function exportCardFromNode(node: HTMLElement): Promise<Blob> {
  console.debug("[shareCard] Export starting - waiting for QR readiness...");
  await waitForQrReady(node);

  console.debug("[shareCard] QR ready, capturing blob...");
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
  if (!blob) {
    console.error("[shareCard] toBlob returned null");
    throw new Error("Failed to render share card");
  }
  console.debug("[shareCard] Export completed successfully:", { blobSize: blob.size, blobType: blob.type });
  return blob;
}

export async function downloadCardFromNode(
  node: HTMLElement,
  filename: string,
): Promise<void> {
  console.debug("[shareCard] Download starting:", { filename });
  try {
    const blob = await exportCardFromNode(node);

    // Prefer native file share when available (mobile saves to camera roll / files).
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        const file = new File([blob], filename, { type: "image/png" });
        if ("canShare" in navigator && navigator.canShare?.({ files: [file] })) {
          console.debug("[shareCard] Using native share API");
          await navigator.share({ title: "Kwentuhan card", files: [file] });
          console.debug("[shareCard] Native share completed");
          return;
        }
      } catch (e) {
        console.debug("[shareCard] Native share failed, falling back to download");
        // Continue to browser download fallback.
      }
    }

    console.debug("[shareCard] Using browser download fallback");
    const url = URL.createObjectURL(blob);
    const a   = document.createElement("a");
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.debug("[shareCard] Download completed");
  } catch (error) {
    console.error("[shareCard] Download failed:", error instanceof Error ? error.message : String(error));
    throw error;
  }
}

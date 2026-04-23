"use client";
// lib/shareCard.ts — generates a downloadable PNG share card with embedded QR

import type { Question } from "./types";
import { LEVEL_CONFIG } from "./types";
import { generateQR, drawQR } from "./qr";

const SHARE_URL = "https://kwentuhan.com";
const CARD_W    = 1080;
const CARD_H    = 1080;
const FONT_BODY = "'DM Sans', system-ui, sans-serif";
const FONT_DISP = "Georgia, serif";

export async function generateShareCard(question: Question): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width  = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d")!;
  const logo = await loadImage("/logo.png");

  const level = LEVEL_CONFIG[question.level] ?? LEVEL_CONFIG.light;

  /* ── Background ── */
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Subtle gradient wash
  const grad = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  grad.addColorStop(0, "rgba(108,92,231,0.04)");
  grad.addColorStop(1, "rgba(232,82,122,0.04)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  /* ── Decorative blobs ── */
  drawBlob(ctx, -80, -80, 500, "rgba(108,92,231,0.06)");
  drawBlob(ctx, CARD_W - 200, CARD_H - 200, 400, "rgba(232,82,122,0.05)");

  /* ── Card border ── */
  ctx.strokeStyle = "rgba(232,230,240,1)";
  ctx.lineWidth = 3;
  roundRectPath(ctx, 40, 40, CARD_W - 80, CARD_H - 80, 48);
  ctx.stroke();

  /* ── Top: branding ── */
  ctx.drawImage(logo, 72, 60, 56, 56);

  // App name
  ctx.fillStyle = "#1A1730";
  ctx.font = `bold 36px ${FONT_DISP}`;
  ctx.textAlign = "left";
  ctx.fillText("kwentuhan", 148, 96);
  ctx.fillStyle = "#8B87A8";
  ctx.font = `500 20px ${FONT_BODY}`;
  ctx.fillText("usapang totoo, kasama mo.", 148, 124);

  /* ── Level + category badges ── */
  const badgeY = 164;
  // Level badge
  ctx.fillStyle = level.bg;
  roundRectPath(ctx, 72, badgeY, 110, 36, 18);
  ctx.fill();
  ctx.fillStyle = level.color;
  ctx.font = `bold 16px ${FONT_BODY}`;
  ctx.textAlign = "center";
  ctx.fillText(level.label.toUpperCase(), 127, badgeY + 23);

  // Category badge
  ctx.fillStyle = "rgba(232,230,240,0.7)";
  roundRectPath(ctx, 198, badgeY, 240, 36, 18);
  ctx.fill();
  ctx.fillStyle = "#8B87A8";
  ctx.font = `600 16px ${FONT_BODY}`;
  ctx.textAlign = "center";
  ctx.fillText(`${question.categoryEmoji}  ${question.categoryLabel}`, 318, badgeY + 23);

  /* ── Main question text ── */
  ctx.fillStyle = "#1A1730";
  ctx.textAlign = "left";
  const textX = 72, textY = 260, textW = CARD_W - 144;
  wrapText(ctx, question.hook, textX, textY, textW, {
    font:     `bold 52px ${FONT_DISP}`,
    lineH:    68,
    maxLines: 7,
    color:    "#1A1730",
  });

  /* ── Deep dive (if short enough) ── */
  if (question.deepDive && question.deepDive.length < 120) {
    const ddY = CARD_H - 260;
    // Left accent bar
    ctx.fillStyle = level.color;
    ctx.fillRect(72, ddY, 4, 90);

    ctx.fillStyle = level.color;
    ctx.font = `700 14px ${FONT_BODY}`;
    ctx.textAlign = "left";
    ctx.fillText("DEEP DIVE", 88, ddY + 18);

    ctx.fillStyle = "#8B87A8";
    ctx.font = `500 22px ${FONT_BODY}`;
    wrapText(ctx, question.deepDive, 88, ddY + 38, CARD_W - 260, {
      lineH:    30,
      maxLines: 3,
      color:    "#8B87A8",
    });
  }

  /* ── QR code ── */
  const qrMatrix = generateQR(SHARE_URL);
  const qrSize   = 160;
  const qrX      = CARD_W - qrSize - 72;
  const qrY      = CARD_H - qrSize - 72;

  // QR background pill
  ctx.fillStyle = "rgba(247,247,250,0.9)";
  roundRectPath(ctx, qrX - 16, qrY - 16, qrSize + 32, qrSize + 50, 20);
  ctx.fill();
  ctx.strokeStyle = "rgba(232,230,240,0.8)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  drawQR(ctx, qrMatrix, qrX, qrY, qrSize, { fg: "#1A1730", bg: "transparent" });

  ctx.fillStyle = "#8B87A8";
  ctx.font      = `500 13px ${FONT_BODY}`;
  ctx.textAlign = "center";
  ctx.fillText("kwentuhan.com", qrX + qrSize / 2, qrY + qrSize + 24);

  /* ── Bottom domain watermark ── */
  ctx.fillStyle = "rgba(139,135,168,0.45)";
  ctx.font      = `500 18px ${FONT_BODY}`;
  ctx.textAlign = "left";
  ctx.fillText("kwentuhan.com", 72, CARD_H - 56);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/png", 1.0));
}

export async function downloadShareCard(question: Question): Promise<void> {
  const blob = await generateShareCard(question);
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `kwentuhan-${question.id}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ── Canvas helpers ── */

function drawBlob(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number, color: string
) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "transparent");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

interface WrapOptions {
  font?:     string;
  lineH:     number;
  maxLines:  number;
  color:     string;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  opts: WrapOptions
) {
  const { font, lineH, maxLines, color } = opts;
  if (font) ctx.font = font;
  ctx.fillStyle = color;

  const words = text.split(" ");
  let line  = "";
  let lineN = 0;
  let curY  = y;

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      if (lineN >= maxLines - 1) {
        ctx.fillText(line + "…", x, curY);
        return;
      }
      ctx.fillText(line, x, curY);
      line  = word;
      curY += lineH;
      lineN++;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, curY);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    image.src = src;
  });
}

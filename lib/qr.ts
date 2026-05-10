import QRCode from "qrcode";

const DEFAULT_APP_URL = "https://kwentuhan.cards";
const qrPromiseCache = new Map<string, Promise<string>>();

export function buildQuestionShareUrl(questionId: number): string {
  const baseUrl =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : DEFAULT_APP_URL;
  // /q/{id} matches the Expo Router route and the web page route.
  // The old /?qid=... format is retired.
  return `${baseUrl.replace(/\/$/, "")}/q/${questionId}`;
}

export async function getCachedQRCodeDataUrl(
  cacheKey: string,
  value: string,
  size = 288
): Promise<string> {
  const cacheId = `${cacheKey}:${value}:${size}`;
  const existing = qrPromiseCache.get(cacheId);
  if (existing) return existing;

  const pending = QRCode.toDataURL(value, {
    width: size,
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#161327", light: "#FFFFFF" },
  }).catch((error) => {
    qrPromiseCache.delete(cacheId);
    throw error;
  });

  qrPromiseCache.set(cacheId, pending);
  return pending;
}

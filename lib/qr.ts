import QRCode from "qrcode";

const DEFAULT_APP_URL = "https://kwentuhan.com";
const qrPromiseCache = new Map<string, Promise<string>>();

export function buildQuestionShareUrl(questionId: number): string {
  const baseUrl =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : DEFAULT_APP_URL;
  const url = new URL("/", baseUrl);
  url.searchParams.set("qid", String(questionId));
  url.searchParams.set("source", "qr");
  return url.toString();
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

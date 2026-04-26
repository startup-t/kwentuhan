const DEFAULT_APP_URL = "https://kwentuhan.com";

function originUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return DEFAULT_APP_URL;
}

/**
 * Build the teaser-reveal URL. Encodes the {questionId, answer} payload directly
 * into a base64url path segment so the reveal page is self-contained — no backend
 * write required. Reveal page (separate ticket) decodes and renders.
 */
export function buildAnswerRevealUrl(questionId: number, answer: string): string {
  const payload = JSON.stringify({ q: questionId, a: answer });
  const code    = base64UrlEncode(payload);
  return `${originUrl()}/c/${code}`;
}

function base64UrlEncode(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

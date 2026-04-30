const DEFAULT_APP_URL = "https://kwentuhan.com";

function getPublicBaseUrl(): string {
  const envBase = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (envBase && !envBase.includes("localhost")) {
    return envBase.replace(/\/$/, "");
  }

  if (typeof window !== "undefined" && window.location?.origin && !window.location.origin.includes("localhost")) {
    return window.location.origin;
  }

  return DEFAULT_APP_URL;
}

export async function createAnswerRevealUrl(questionId: number, question: string, answer: string): Promise<string> {
  const res = await fetch("/api/teaser", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questionId, question, answer }),
  });

  if (!res.ok) {
    throw new Error("Failed to create teaser share");
  }

  const data = (await res.json()) as { shareId?: string };
  if (!data.shareId) {
    throw new Error("Missing shareId");
  }

  return `${getPublicBaseUrl()}/reveal/${data.shareId}`;
}

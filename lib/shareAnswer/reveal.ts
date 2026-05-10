export async function createAnswerRevealUrl(questionId: number, question: string, answer: string): Promise<string> {
  const res = await fetch("/api/teaser", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questionId, question, answer }),
  });

  if (!res.ok) {
    throw new Error("Failed to create teaser share");
  }

  const data = (await res.json()) as { revealUrl?: string };
  if (!data.revealUrl) {
    throw new Error("Missing revealUrl");
  }

  return data.revealUrl;
}

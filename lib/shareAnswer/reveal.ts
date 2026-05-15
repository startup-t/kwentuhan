export async function createAnswerRevealUrl(questionId: number | string, question: string, answer: string): Promise<string> {
  console.debug("[TEASER] Creating reveal URL:", { questionId, questionLength: question.length, answerLength: answer.length });
  
  const res = await fetch("/api/teaser", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questionId, question, answer }),
  });

  if (!res.ok) {
    console.error("[TEASER] API failed:", { status: res.status, statusText: res.statusText });
    throw new Error("Failed to create teaser share");
  }

  const data = (await res.json()) as { revealUrl?: string };
  if (!data.revealUrl) {
    console.error("[TEASER] Missing revealUrl in response:", { data });
    throw new Error("Missing revealUrl");
  }

  console.debug("[TEASER] Reveal URL created:", { revealUrl: data.revealUrl, questionId });
  return data.revealUrl;
}

"use client";

import { useState } from "react";

type KwentoFormProps = {
  questionId: string;
  questionText: string;
};

export function KwentoForm({ questionId, questionText }: KwentoFormProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmed = text.trim();
    if (!trimmed || loading) {
      return;
    }

    setLoading(true);
    setError(null);
    setResultUrl(null);

    try {
      const res = await fetch("/api/kwento", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionId,
          questionText,
          answerText: trimmed,
          isTeaser: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Unable to share kwento");
        return;
      }

      if (typeof data?.revealUrl === "string" && data.revealUrl.length > 0) {
        setResultUrl(data.revealUrl);
        setText("");
        return;
      }

      setError("Unable to generate reveal URL");
    } catch {
      setError("Unable to share kwento right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 40 }}>
      <h3>Now it&apos;s your turn</h3>

      <form onSubmit={handleSubmit}>
        <textarea
          required
          minLength={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write your kwento..."
          style={{ width: "100%", height: 100 }}
        />

        <button type="submit" disabled={loading || text.trim().length === 0}>
          {loading ? "Sharing..." : "Share your kwento"}
        </button>
      </form>

      {error && (
        <div style={{ marginTop: 12 }}>
          <p>{error}</p>
        </div>
      )}

      {resultUrl && (
        <div style={{ marginTop: 20 }}>
          <p>Kwento shared!</p>
          <a href={resultUrl}>{resultUrl}</a>
        </div>
      )}
    </div>
  );
}

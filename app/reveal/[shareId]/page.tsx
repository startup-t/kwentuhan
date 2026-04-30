"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type RevealData = {
  answers: {
    questionId: number;
    question: string;
    answer: string;
  } | null;
  mode: "teaser";
  fallback?: boolean;
};

export default function RevealPage() {
  const router = useRouter();
  const params = useParams<{ shareId: string }>();
  const shareId = params?.shareId;

  const [isLoading, setIsLoading] = useState(true);
  const [isRevealed, setIsRevealed] = useState(false);
  const [data, setData] = useState<RevealData | null>(null);

  const baseUrl = useMemo(() => {
    const envBase = process.env.NEXT_PUBLIC_BASE_URL?.trim();
    if (envBase && !envBase.includes("localhost")) return envBase.replace(/\/$/, "");
    if (typeof window !== "undefined" && !window.location.origin.includes("localhost")) {
      return window.location.origin;
    }
    return "https://kwentuhan.com";
  }, []);

  const shareUrl = useMemo(() => {
    if (!shareId) return "";
    return `${baseUrl}/reveal/${shareId}`;
  }, [baseUrl, shareId]);

  useEffect(() => {
    let mounted = true;

    async function loadReveal() {
      if (!shareId) return;

      setIsLoading(true);
      try {
        const res = await fetch(`/api/reveal/${shareId}`, { cache: "no-store" });
        const payload = (await res.json()) as RevealData;
        if (mounted) setData(payload);
      } catch {
        if (mounted) {
          setData({ answers: null, mode: "teaser", fallback: true });
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadReveal();
    return () => {
      mounted = false;
    };
  }, [shareId]);

  const handleShare = useCallback(async () => {
    if (!shareUrl) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Kwentuhan Teaser",
          text: "Check out this teaser on Kwentuhan",
          url: shareUrl,
        });
        return;
      } catch {
        // fall back to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // ignore silently for lightweight UX
    }
  }, [shareUrl]);

  if (isLoading) {
    return <main className="mx-auto max-w-xl px-5 py-10">Loading reveal...</main>;
  }

  const answer = data?.answers;

  return (
    <main className="mx-auto max-w-xl px-5 py-8">
      <section className="kw-card p-5">
        <p className="text-xs mb-2" style={{ color: "var(--kw-muted)" }}>Teaser</p>
        {answer ? (
          <>
            <h1 className="font-semibold text-lg mb-3" style={{ color: "var(--kw-text)" }}>{answer.question}</h1>
            {!isRevealed ? (
              <p className="text-[0.95rem] leading-relaxed blur-sm select-none" style={{ color: "var(--kw-subtext)" }}>
                {answer.answer}
              </p>
            ) : (
              <p className="text-[0.95rem] leading-relaxed" style={{ color: "var(--kw-text)" }}>{answer.answer}</p>
            )}

            {!isRevealed && (
              <button className="btn-primary mt-5 w-full" onClick={() => setIsRevealed(true)}>
                Reveal
              </button>
            )}
          </>
        ) : (
          <p className="text-sm" style={{ color: "var(--kw-subtext)" }}>
            This reveal link is no longer available.
          </p>
        )}
      </section>

      {isRevealed && answer && (
        <section className="kw-card p-5 mt-4">
          <h2 className="font-semibold text-base" style={{ color: "var(--kw-text)" }}>Now it&apos;s your turn 👀</h2>
          <p className="text-sm mt-1 mb-4" style={{ color: "var(--kw-subtext)" }}>
            Share your own answers with your friends
          </p>
          <button className="btn-primary w-full mb-2" onClick={() => router.push(`/create?from=teaser&qid=${answer.questionId}`)}>
            Create your own teaser
          </button>
          <button className="btn-secondary w-full" onClick={handleShare}>
            Share this with a friend
          </button>
        </section>
      )}
    </main>
  );
}

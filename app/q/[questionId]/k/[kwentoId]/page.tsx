"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type KwentoData = {
  questionId: string;
  questionText: string;
  answerText: string;
  isTeaser: boolean;
};

export default function KwentoRevealPage() {
  const router = useRouter();
  const params = useParams<{ questionId: string; kwentoId: string }>();
  const questionIdParam = params?.questionId;
  const kwentoId = params?.kwentoId;

  const [isLoading, setIsLoading] = useState(true);
  const [isRevealed, setIsRevealed] = useState(false);
  const [data, setData] = useState<KwentoData | null>(null);

  const baseUrl = useMemo(() => {
    const envBase = process.env.NEXT_PUBLIC_BASE_URL?.trim();
    if (envBase && !envBase.includes("localhost")) return envBase.replace(/\/$/, "");
    if (typeof window !== "undefined" && !window.location.origin.includes("localhost")) {
      return window.location.origin;
    }
    return "https://kwentuhan.cards";
  }, []);

  const shareUrl = useMemo(() => {
    if (!kwentoId || !questionIdParam) return "";
    return `${baseUrl}/q/${questionIdParam}/k/${kwentoId}`;
  }, [baseUrl, kwentoId, questionIdParam]);

  useEffect(() => {
    let mounted = true;

    async function loadKwento() {
      if (!kwentoId) return;

      setIsLoading(true);
      try {
        const res = await fetch(`/api/kwento/${kwentoId}`, { cache: "no-store" });
        if (!res.ok) {
          if (mounted) setData(null);
          return;
        }

        const payload = (await res.json()) as KwentoData;

        if (!payload.questionId) {
          if (mounted) setData(null);
          return;
        }

        if (mounted) {
          setData(payload);
          if (questionIdParam !== payload.questionId) {
            router.replace(`/q/${payload.questionId}/k/${kwentoId}`);
          }
        }
      } catch {
        if (mounted) setData(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadKwento();
    return () => {
      mounted = false;
    };
  }, [kwentoId, questionIdParam, router]);

  if (isLoading) {
    return <main className="mx-auto max-w-xl px-5 py-10">Loading kwento...</main>;
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-xl px-5 py-8">
        <section className="kw-card p-5">
          <h1 className="font-semibold text-lg mb-3" style={{ color: "var(--kw-text)" }}>
            Kwento not found or deleted
          </h1>
          <p className="text-sm mb-5" style={{ color: "var(--kw-subtext)" }}>
            This shared kwento might be expired or unavailable.
          </p>
          <button className="btn-primary w-full mb-2" disabled>
            Open app (future feature)
          </button>
          <button className="btn-secondary w-full" onClick={() => router.push("/")}>
            Go to home
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-5 py-8">
      <section className="kw-card p-5">
        <p className="text-xs mb-2" style={{ color: "var(--kw-muted)" }}>Teaser</p>
        <h1 className="font-semibold text-lg mb-3" style={{ color: "var(--kw-text)" }}>
          {data.questionText}
        </h1>
        {!isRevealed && data.isTeaser ? (
          <p className="text-[0.95rem] leading-relaxed blur-sm select-none" style={{ color: "var(--kw-subtext)" }}>
            {data.answerText}
          </p>
        ) : (
          <p className="text-[0.95rem] leading-relaxed" style={{ color: "var(--kw-text)" }}>
            {data.answerText}
          </p>
        )}

        {!isRevealed && data.isTeaser && (
          <button className="btn-primary mt-5 w-full" onClick={() => setIsRevealed(true)}>
            Reveal
          </button>
        )}
      </section>

      {isRevealed && (
        <section className="kw-card p-5 mt-4">
          <h2 className="font-semibold text-base" style={{ color: "var(--kw-text)" }}>
            Now it&apos;s your turn
          </h2>
          <p className="text-sm mt-1 mb-4" style={{ color: "var(--kw-subtext)" }}>
            Share this kwento with a friend.
          </p>
          <button
            className="btn-secondary w-full"
            onClick={async () => {
              if (!shareUrl) return;

              if (navigator.share) {
                try {
                  await navigator.share({
                    title: "Kwentuhan",
                    text: "Check out this kwento on Kwentuhan",
                    url: shareUrl,
                  });
                  return;
                } catch {
                  // fallback to clipboard
                }
              }

              try {
                await navigator.clipboard.writeText(shareUrl);
              } catch {
                // ignore
              }
            }}
          >
            Share this with a friend
          </button>
        </section>
      )}
    </main>
  );
}

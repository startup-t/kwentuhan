import type { Metadata } from "next";
import { getPersistedKwento } from "@/lib/kwento/postgresStore";
import { getQuestionById } from "@/lib/questions";
import { LEVEL_CONFIG } from "@/lib/types";
import { KwentoForm } from "./KwentoForm";
import RevealAnswer from "@/components/RevealAnswer";
import DeepLinkBridge from "@/components/DeepLinkBridge";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ questionId: string; kwentoId: string }>;
};

// Isolated helper — never throws, always returns null on any DB error.
async function safeGetKwento(kwentoId: string) {
  try {
    return await getPersistedKwento(kwentoId);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { kwentoId } = await params;
  // Must not throw — metadata errors produce a 500 that bypasses error.tsx.
  const kwento = await safeGetKwento(kwentoId);
  const description = kwento?.isTeaser
    ? "Someone shared a kwento — tap to reveal."
    : kwento?.answerText?.slice(0, 80) ?? "Someone shared a kwento on Kwentuhan.";
  return {
    title: "Kwento Reveal — Kwentuhan",
    description,
    openGraph: {
      title: "Someone shared their kwento on Kwentuhan",
      description,
      siteName: "Kwentuhan",
    },
  };
}

export default async function ScanToRevealPage({ params }: Props) {
  const { questionId, kwentoId } = await params;

  // Both fetches are safe — DB errors show the question + form, never a crash.
  const kwento = await safeGetKwento(kwentoId);
  const question = getQuestionById(Number(questionId));

  const questionText = question?.hook ?? kwento?.questionText ?? "A question worth answering";
  const level = question ? LEVEL_CONFIG[question.level] : LEVEL_CONFIG.light;
  const deepLink = `kwentuhan://q/${questionId}/k/${kwentoId}`;

  return (
    <main className="min-h-dvh flex flex-col items-center px-5 py-8 max-w-md mx-auto w-full">

      {/* Header */}
      <div className="w-full flex items-center justify-between mb-8">
        <span
          className="font-bold text-xl tracking-tight"
          style={{ fontFamily: "'Playfair Display', serif", color: "var(--kw-accent)" }}
        >
          kwentuhan
        </span>
        {question && (
          <span
            className="text-xs font-semibold px-3 py-1 rounded-full"
            style={{ background: level.bg, color: level.color }}
          >
            {level.emoji} {level.label}
          </span>
        )}
      </div>

      {/* Question card */}
      <div
        className="w-full rounded-[var(--kw-r-card)] p-6 mb-4 border"
        style={{ background: level.cardBg, borderColor: level.cardBorder }}
      >
        {question && (
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: "var(--kw-subtext)" }}
          >
            {question.categoryEmoji} {question.categoryLabel}
          </p>
        )}
        <p
          className="text-[1.35rem] font-bold leading-snug"
          style={{ fontFamily: "'Playfair Display', serif", color: "var(--kw-text)" }}
        >
          {questionText}
        </p>
      </div>

      {/* Kwento reveal — or graceful fallback when not in DB */}
      <div className="w-full mb-6">
        {kwento ? (
          <RevealAnswer answerText={kwento.answerText} isTeaser={kwento.isTeaser} />
        ) : (
          <div
            className="w-full rounded-[var(--kw-r-card)] p-6 border text-center"
            style={{
              background: "var(--kw-surface-alt)",
              borderColor: "var(--kw-border-solid)",
            }}
          >
            <p className="text-2xl mb-2">🔒</p>
            <p
              className="text-sm font-semibold mb-1"
              style={{ color: "var(--kw-text)" }}
            >
              This kwento was shared from the app
            </p>
            <p className="text-xs" style={{ color: "var(--kw-subtext)" }}>
              Open in the Kwentuhan app to see it, or share your own answer below.
            </p>
          </div>
        )}
      </div>

      {/* Open in app */}
      <div className="w-full mb-3">
        <DeepLinkBridge deepLink={deepLink} />
      </div>

      {/* Divider */}
      <div className="w-full flex items-center gap-3 my-6">
        <div className="flex-1 h-px" style={{ background: "var(--kw-border-solid)" }} />
        <span className="text-xs font-medium" style={{ color: "var(--kw-subtext)" }}>
          share your own kwento
        </span>
        <div className="flex-1 h-px" style={{ background: "var(--kw-border-solid)" }} />
      </div>

      {/* Form — always shown so the viral loop always works */}
      <div className="w-full">
        <KwentoForm
          questionId={kwento?.questionId ?? questionId}
          questionText={questionText}
        />
      </div>

      <p className="mt-10 text-xs text-center" style={{ color: "var(--kw-muted)" }}>
        Scan QR · share your story · spark a real conversation
      </p>

    </main>
  );
}

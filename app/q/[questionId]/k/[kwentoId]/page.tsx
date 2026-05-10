import { notFound } from "next/navigation";
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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { kwentoId } = await params;
  const kwento = await getPersistedKwento(kwentoId);
  const preview = kwento?.isTeaser
    ? "Someone shared a kwento — tap to reveal."
    : kwento?.answerText?.slice(0, 80) ?? "Someone shared a kwento.";
  return {
    title: `Kwento Reveal — Kwentuhan`,
    description: preview,
    openGraph: {
      title: "Someone shared their kwento on Kwentuhan",
      description: preview,
      siteName: "Kwentuhan",
    },
  };
}

export default async function ScanToRevealPage({ params }: Props) {
  const { questionId, kwentoId } = await params;

  const [kwento, question] = await Promise.all([
    getPersistedKwento(kwentoId),
    Promise.resolve(getQuestionById(Number(questionId))),
  ]);

  if (!kwento) notFound();

  // Prefer the question from the bundled JSON; fall back to stored questionText.
  const questionText = question?.hook ?? kwento.questionText;
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

      {/* Reveal card */}
      <div className="w-full mb-6">
        <RevealAnswer answerText={kwento.answerText} isTeaser={kwento.isTeaser} />
      </div>

      {/* Open in app CTA */}
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

      {/* Kwento form */}
      <div className="w-full">
        <KwentoForm questionId={String(kwento.questionId)} questionText={questionText} />
      </div>

      {/* Footer */}
      <p
        className="mt-10 text-xs text-center"
        style={{ color: "var(--kw-muted)" }}
      >
        Scan QR · share your story · spark a real conversation
      </p>
    </main>
  );
}

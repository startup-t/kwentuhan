import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getQuestionById } from "@/lib/questions";
import { LEVEL_CONFIG } from "@/lib/types";
import { KwentoForm } from "@/app/q/[questionId]/k/[kwentoId]/KwentoForm";
import DeepLinkBridge from "@/components/DeepLinkBridge";

type Props = { params: Promise<{ questionId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { questionId } = await params;
  const question = getQuestionById(Number(questionId));
  const text = question?.hook ?? "A question worth answering.";
  return {
    title: `${text.slice(0, 60)}… — Kwentuhan`,
    description: "Share your kwento. Real conversations, real connections.",
    openGraph: {
      title: "Kwentuhan — Answer this question",
      description: text,
      siteName: "Kwentuhan",
    },
  };
}

export default async function ScanToPlayPage({ params }: Props) {
  const { questionId } = await params;
  const question = getQuestionById(Number(questionId));

  if (!question) notFound();

  const level = LEVEL_CONFIG[question.level];
  const deepLink = `kwentuhan://q/${questionId}`;

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
        <span
          className="text-xs font-semibold px-3 py-1 rounded-full"
          style={{ background: level.bg, color: level.color }}
        >
          {level.emoji} {level.label}
        </span>
      </div>

      {/* Question card */}
      <div
        className="w-full rounded-[var(--kw-r-card)] p-6 mb-3 border"
        style={{
          background: level.cardBg,
          borderColor: level.cardBorder,
        }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: "var(--kw-subtext)" }}
        >
          {question.categoryEmoji} {question.categoryLabel}
        </p>
        <p
          className="text-[1.35rem] font-bold leading-snug"
          style={{ fontFamily: "'Playfair Display', serif", color: "var(--kw-text)" }}
        >
          {question.hook}
        </p>
      </div>

      {/* Deep dive teaser */}
      <div
        className="w-full rounded-2xl px-5 py-4 mb-6 border"
        style={{
          background: "var(--kw-surface-alt)",
          borderColor: "var(--kw-border-solid)",
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--kw-subtext)" }}>
          Deep dive
        </p>
        <p className="text-sm" style={{ color: "var(--kw-text)" }}>
          {question.deepDive}
        </p>
      </div>

      {/* Open in app CTA */}
      <div className="w-full mb-3">
        <DeepLinkBridge deepLink={deepLink} />
      </div>

      {/* Divider */}
      <div className="w-full flex items-center gap-3 my-6">
        <div className="flex-1 h-px" style={{ background: "var(--kw-border-solid)" }} />
        <span className="text-xs font-medium" style={{ color: "var(--kw-subtext)" }}>
          or share your kwento from here
        </span>
        <div className="flex-1 h-px" style={{ background: "var(--kw-border-solid)" }} />
      </div>

      {/* Kwento form */}
      <div className="w-full">
        <KwentoForm questionId={String(question.id)} questionText={question.hook} />
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

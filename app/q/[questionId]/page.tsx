import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getQuestionById } from "@/lib/questionsServer";
import { LEVEL_CONFIG } from "@/lib/types";
import { KwentoForm } from "@/app/q/[questionId]/k/[kwentoId]/KwentoForm";
import DeepLinkBridge from "@/components/DeepLinkBridge";

type Props = { params: Promise<{ questionId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { questionId } = await params;
  const question = await getQuestionById(questionId);
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
  const question = await getQuestionById(questionId);

  if (!question) notFound();

  const level = LEVEL_CONFIG[question.level];
  const deepLink = `kwentuhan://q/${questionId}`;

  return (
    <main className="kw-bg min-h-dvh">
      <div className="relative z-10 mx-auto w-full max-w-lg px-5 pt-6 pb-10 flex flex-col gap-5">

        {/* ── Brand header ─────────────────────────────────────────── */}
        <header className="flex items-center justify-between">
          <span
            className="font-bold text-xl tracking-tight"
            style={{ fontFamily: "var(--font-playfair), serif", color: "var(--kw-accent)" }}
          >
            kwentuhan
          </span>
          <span
            className="text-xs font-semibold px-3 py-1 rounded-full"
            style={{ background: level.bg, color: level.color }}
          >
            {level.emoji} {level.label}
          </span>
        </header>

        {/* ── 1. Question card ──────────────────────────────────────── */}
        <section
          className="kw-card p-6"
          style={{ borderColor: level.cardBorder, background: level.cardBg }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: "var(--kw-subtext)" }}
          >
            {question.categoryEmoji} {question.categoryLabel}
          </p>
          <p
            className="text-[1.3rem] font-bold leading-snug"
            style={{ fontFamily: "var(--font-playfair), serif", color: "var(--kw-text)" }}
          >
            {question.hook}
          </p>
        </section>

        {/* ── 2. Deep dive ──────────────────────────────────────────── */}
        <section
          className="rounded-2xl px-5 py-4 border"
          style={{
            background: "var(--kw-surface-alt)",
            borderColor: "var(--kw-border-solid)",
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-1"
            style={{ color: "var(--kw-subtext)" }}
          >
            Deep dive
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--kw-text)" }}>
            {question.deepDive}
          </p>
        </section>

        {/* ── 3. Share prompt ───────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: "var(--kw-border-solid)" }} />
          <span
            className="text-[0.6875rem] font-semibold uppercase tracking-widest whitespace-nowrap"
            style={{ color: "var(--kw-muted)" }}
          >
            share your kwento
          </span>
          <div className="flex-1 h-px" style={{ background: "var(--kw-border-solid)" }} />
        </div>

        {/* ── 4. Write + share form ────────────────────────────────── */}
        <KwentoForm questionId={String(question.id)} questionText={question.hook} />

        {/* ── 5. App CTA — subtle, non-blocking footer ─────────────── */}
        <div
          className="flex flex-col items-center gap-4 pt-2"
          style={{ borderTop: "1px solid var(--kw-border-solid)" }}
        >
          <DeepLinkBridge deepLink={deepLink} variant="button" />
          <p className="text-[0.625rem] text-center" style={{ color: "var(--kw-muted)" }}>
            Scan QR · share your story · spark a real conversation
          </p>
        </div>

      </div>
    </main>
  );
}

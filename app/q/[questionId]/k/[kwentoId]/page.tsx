import type { Metadata } from "next";
import { getPersistedKwento } from "@/lib/kwento/postgresStore";
import { getQuestionById } from "@/lib/questionsServer";
import { LEVEL_CONFIG } from "@/lib/types";
import { KwentoForm } from "./KwentoForm";
import RevealAnswer from "@/components/RevealAnswer";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ questionId: string; kwentoId: string }>;
};

async function safeGetKwento(kwentoId: string) {
  try {
    return await getPersistedKwento(kwentoId);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { kwentoId } = await params;
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

  const kwento = await safeGetKwento(kwentoId);
  const question = await getQuestionById(questionId);

  const questionText = question?.hook ?? kwento?.questionText ?? "A question worth answering";
  const level = question ? LEVEL_CONFIG[question.level] : LEVEL_CONFIG.light;
  const effectiveQuestionId = kwento?.questionId ?? questionId;
  const hasKwento = !!kwento;
  const shareUrl = `${process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ?? "https://kwentuhan.cards"}/reveal/${kwentoId}?teaser=true`;

  return (
    <main className="kw-bg min-h-dvh">
      <div className="relative z-10 mx-auto w-full max-w-lg px-5 pt-6 pb-10 flex flex-col gap-5">

        {/* ── Brand header ─────────────────────────────────────────── */}
        <header className="kw-fade-in flex items-center justify-between">
          <span
            className="font-bold text-xl tracking-tight"
            style={{ fontFamily: "var(--font-playfair), serif", color: "var(--kw-accent)" }}
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
        </header>

        {/* ── 1. Question — always visible immediately ──────────────── */}
        <section
          className="kw-card kw-slide-up kw-d1 p-6"
          style={{ borderColor: level.cardBorder, background: level.cardBg }}
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
            className="text-[1.3rem] font-bold leading-snug"
            style={{ fontFamily: "var(--font-playfair), serif", color: "var(--kw-text)" }}
          >
            {questionText}
          </p>
          {question?.contributor && (
            <p
              className="text-[0.6875rem] font-medium mt-2.5"
              style={{ color: "var(--kw-subtext)" }}
            >
              Question by{" "}
              <span style={{ color: "var(--kw-accent)", fontWeight: 600 }}>
                {question.contributor}
              </span>
            </p>
          )}
        </section>

        {/* ── 2. Reveal — instant, content-first ───────────────────── */}
        {hasKwento ? (
          <div className="kw-slide-up kw-d2 flex flex-col gap-4">
            <div
              className="kw-card p-4"
              style={{ borderColor: "var(--kw-border-solid)", background: "var(--kw-surface)" }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--kw-accent)" }}>
                This kwento was revealed just for you
              </p>
            </div>
            <RevealAnswer answerText={kwento.answerText} />
            <div
              className="kw-card p-5 flex flex-col gap-3"
              style={{ borderColor: "var(--kw-border-solid)", background: "var(--kw-surface)" }}
            >
              <a
                href="/create"
                className="btn-primary w-full py-3 text-sm font-semibold text-center"
              >
                Make your own kwento
              </a>
              <p className="text-xs text-center" style={{ color: "var(--kw-subtext)" }}>
                Scan others to unlock more stories.
              </p>
              <div className="flex items-center justify-center gap-3 text-xs font-semibold">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--kw-accent)" }}
                >
                  WhatsApp
                </a>
                <span style={{ color: "var(--kw-muted)" }}>·</span>
                <a
                  href={`https://www.facebook.com/dialog/send?link=${encodeURIComponent(shareUrl)}&app_id=291494419107518&redirect_uri=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--kw-accent)" }}
                >
                  Messenger
                </a>
                <span style={{ color: "var(--kw-muted)" }}>·</span>
                <a
                  href={`https://x.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent("This kwento was revealed just for you")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--kw-accent)" }}
                >
                  X
                </a>
              </div>
            </div>
          </div>
        ) : (
          <NoKwentoNote />
        )}

        {/* ── 3. Form — adapts to context ──────────────────────────── */}
        <div className="kw-slide-up kw-d3 pt-2">
          <KwentoForm
            questionId={effectiveQuestionId}
            questionText={questionText}
            question={question ?? undefined}
            heading={hasKwento ? "Your turn" : "Your turn"}
            subheading={
              hasKwento
                ? "Share your own answer and pass the kwento forward."
                : "Answer the question and we'll spin up a shareable link for you."
            }
          />
        </div>
        <p className="kw-slide-up kw-d4 text-[0.625rem] text-center pt-2" style={{ color: "var(--kw-muted)" }}>
          kwentuhan.cards
        </p>

      </div>
    </main>
  );
}

/**
 * Honest, low-key fallback when the kwento token can't be resolved
 * (stale link, or a share that didn't make it to the server).
 * Deliberately small and warm — it acknowledges the gap, then hands
 * the user straight to the question without making the page feel broken.
 */
function NoKwentoNote() {
  return (
    <div
      className="kw-slide-up kw-d2 flex items-start gap-3 px-4 py-3 rounded-2xl"
      style={{
        background: "var(--kw-surface-alt)",
        border: "1px solid var(--kw-border-solid)",
      }}
    >
      <span aria-hidden className="text-base leading-none mt-px">💭</span>
      <p
        className="text-[0.8125rem] leading-relaxed"
        style={{ color: "var(--kw-subtext)" }}
      >
        We couldn&apos;t load this particular kwento — but the question above is
        still wide open. Be the storyteller this time.
      </p>
    </div>
  );
}

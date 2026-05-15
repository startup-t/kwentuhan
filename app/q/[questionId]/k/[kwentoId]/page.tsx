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

        {/* ── 2. Reveal — instant, with reactions row baked in ─────── */}
        {hasKwento ? (
          <div className="kw-slide-up kw-d2">
            <RevealAnswer
              answerText={kwento.answerText}
              questionId={effectiveQuestionId}
            />
          </div>
        ) : (
          <NoKwentoNote />
        )}

        {/* ── 3. Your turn — the one primary action ─────────────────── */}
        <div className="kw-slide-up kw-d3 pt-1">
          <KwentoForm
            questionId={effectiveQuestionId}
            questionText={questionText}
            question={question ?? undefined}
            heading={hasKwento ? "Sagutin mo rin" : "Your turn"}
            subheading={
              hasKwento
                ? "Pass it on. Walang nakakaalam, walang husga."
                : "Answer the question and we'll spin up a shareable link for you."
            }
          />
        </div>

        {/* ── 4. Tiny share row — only when there's a kwento worth passing ── */}
        {hasKwento && (
          <div
            className="kw-slide-up kw-d4 flex items-center justify-center gap-4 pt-1"
            aria-label="Share this reveal"
          >
            <span className="text-[0.6875rem]" style={{ color: "var(--kw-muted)" }}>
              or pass along →
            </span>
            <ShareLink
              href={`https://wa.me/?text=${encodeURIComponent(shareUrl)}`}
              label="WhatsApp"
              icon={<WhatsAppIcon />}
            />
            <ShareLink
              href={`https://www.facebook.com/dialog/send?link=${encodeURIComponent(shareUrl)}&app_id=291494419107518&redirect_uri=${encodeURIComponent(shareUrl)}`}
              label="Messenger"
              icon={<MessengerIcon />}
            />
            <ShareLink
              href={`https://x.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent("This kwento was revealed just for you")}`}
              label="X"
              icon={<XIcon />}
            />
          </div>
        )}

        <p className="kw-slide-up kw-d4 text-[0.625rem] text-center pt-2" style={{ color: "var(--kw-muted)" }}>
          kwentuhan.cards
        </p>

      </div>
    </main>
  );
}

/**
 * Compact icon-only share link. Replaces the previous trio of purple text
 * links ("WhatsApp · Messenger · X") with a single quiet row of glyphs —
 * smaller visual weight, fits with party-game tone where sharing is a
 * secondary action behind "answer it yourself".
 */
function ShareLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Share via ${label}`}
      className="w-9 h-9 rounded-full inline-flex items-center justify-center transition-all active:scale-90"
      style={{
        background: "var(--kw-surface)",
        border: "1px solid var(--kw-border)",
        color: "var(--kw-subtext)",
      }}
    >
      {icon}
    </a>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.5 3.5A11 11 0 0 0 3.4 17.2L2 22l4.9-1.3a11 11 0 0 0 5.3 1.4 11 11 0 0 0 7.8-18.6Zm-8.3 17h-.1a9 9 0 0 1-4.6-1.3l-.3-.2-2.9.8.8-2.8-.2-.3a9 9 0 1 1 7.3 3.8Zm5-6.7c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4a8.6 8.6 0 0 1-1.6-2c-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.1c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1 2.9 1.2 3.1c.1.2 2 3 4.8 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3Z" />
    </svg>
  );
}

function MessengerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.25C6.48 2.25 2.25 6.36 2.25 11.5c0 2.86 1.33 5.4 3.43 7.08V22l3.14-1.72c.84.23 1.73.36 2.66.36 5.52 0 9.75-4.11 9.75-9.25 0-5.14-4.23-9.14-9.23-9.14zm1.02 12.39l-2.52-2.69-4.87 2.69 5.37-5.7 2.57 2.69 4.8-2.69-5.35 5.7z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
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

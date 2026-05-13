"use client";

interface Props {
  answerText: string;
}

export default function RevealAnswer({ answerText }: Props) {
  return (
    <div className="kw-card p-6 flex flex-col gap-5 relative overflow-hidden">
      {/* Subtle gradient accent on the corner */}
      <div
        aria-hidden
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(108,92,231,0.18) 0%, transparent 70%)",
          filter: "blur(8px)",
        }}
      />

      {/* Label row */}
      <div className="flex items-center justify-between relative">
        <p
          className="text-[0.6875rem] font-bold uppercase tracking-[0.18em]"
          style={{ color: "var(--kw-accent)" }}
        >
          ✨ a kwento for you
        </p>
        <span
          className="text-[0.625rem] font-medium"
          style={{ color: "var(--kw-muted)" }}
        >
          shared via kwentuhan
        </span>
      </div>

      {/* Answer body — instant entrance, no gate */}
      <div
        className="relative"
        style={{
          animation: "deepReveal 0.55s cubic-bezier(0.34,1.4,0.64,1) both",
          animationDelay: "0.08s",
        }}
      >
        {/* Decorative opening quote glyph */}
        <span
          aria-hidden
          className="absolute -left-1 -top-3 select-none pointer-events-none"
          style={{
            fontFamily: "var(--font-playfair), Georgia, serif",
            fontSize: 56,
            lineHeight: 0.8,
            opacity: 0.1,
            color: "var(--kw-accent)",
          }}
        >
          ❝
        </span>
        <p
          className="text-[1.0625rem] leading-relaxed pl-1 whitespace-pre-wrap"
          style={{
            fontFamily: "var(--font-kalam), cursive",
            color: "var(--kw-note-ink)",
          }}
        >
          {answerText}
        </p>
      </div>

      {/* Anonymous attribution — warm, not transactional */}
      <p
        className="text-xs italic text-right relative"
        style={{ color: "var(--kw-subtext)", fontFamily: "var(--font-playfair), serif" }}
      >
        — someone, anonymously
      </p>
    </div>
  );
}

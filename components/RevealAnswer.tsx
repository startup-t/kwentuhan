"use client";

import { useState } from "react";

interface Props {
  answerText: string;
  isTeaser: boolean;
}

export default function RevealAnswer({ answerText, isTeaser }: Props) {
  const [revealed, setRevealed] = useState(!isTeaser);

  return (
    <div
      className="w-full rounded-[var(--kw-r-card)] p-6 border relative overflow-hidden"
      style={{
        background: "var(--kw-surface)",
        borderColor: "var(--kw-border-solid)",
      }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-widest mb-3"
        style={{ color: "var(--kw-subtext)" }}
      >
        their kwento
      </p>

      <div
        className={`relative transition-all duration-500 ${!revealed ? "cursor-pointer select-none" : ""}`}
        onClick={() => !revealed && setRevealed(true)}
        style={{ filter: revealed ? "none" : "blur(7px)" }}
        aria-label={!revealed ? "Tap to reveal kwento" : undefined}
      >
        <p
          className="text-base leading-relaxed"
          style={{
            fontFamily: "'Kalam', cursive",
            color: "var(--kw-note-ink)",
          }}
        >
          {answerText}
        </p>
      </div>

      {!revealed && (
        <button
          onClick={() => setRevealed(true)}
          className="mt-4 w-full py-2.5 rounded-xl text-sm font-semibold transition-colors"
          style={{
            background: "var(--kw-accent-soft)",
            color: "var(--kw-accent)",
          }}
        >
          Tap to reveal ✨
        </button>
      )}
    </div>
  );
}

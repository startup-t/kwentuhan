"use client";

import Image from "next/image";
import { useCallback, useRef } from "react";
import type { Question } from "@/lib/types";
import { LEVEL_CONFIG, CLUSTER_COLOR } from "@/lib/types";
import AnswerInput, { type AnswerInputHandle } from "./AnswerInput";

interface Props {
  question:    Question;
  answer:      string;
  setAnswer:   (next: string) => void;
  isFocused:   boolean;
  setFocused:  (focused: boolean) => void;
  onDone:      () => void;
}

export default function ShareInput({
  question, answer, setAnswer, isFocused, setFocused, onDone,
}: Props) {
  const answerRef = useRef<AnswerInputHandle>(null);
  const level     = LEVEL_CONFIG[question.level] ?? LEVEL_CONFIG.light;
  const clr       = CLUSTER_COLOR[question.cluster] ?? CLUSTER_COLOR.other;

  const handleDone = useCallback(() => {
    answerRef.current?.blur();
    onDone();
  }, [onDone]);

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3">
        <h3 className="font-bold text-base" style={{ color: "var(--kw-text)" }}>
          {isFocused ? "Add your answer" : "Your answer"}
        </h3>
        <button
          onClick={handleDone}
          className="btn-primary h-8 px-4 text-xs flex items-center justify-center"
          style={{ borderRadius: 12 }}
          aria-label="Done"
        >
          Done
        </button>
      </div>

      {/* Card preview with inline editable Chat bubble */}
      <div className="px-6 pb-6">
        <div
          className="rounded-3xl p-5 pb-[5.25rem] select-none relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg,#F9F8FF 0%,#FFF4F7 100%)",
            border:     "1px solid var(--kw-border)",
            boxShadow:  "0 4px 24px rgba(108,92,231,0.10)",
          }}
        >
          {/* Brand row */}
          <div className="flex items-start justify-between mb-3">
            <div
              className="origin-top-left"
              style={{
                transform:  isFocused ? "scale(0.7)" : "scale(1)",
                transition: "transform 0.22s ease",
              }}
            >
              <div className="flex items-center gap-2">
                <Image src="/logo.png" alt="Kwentuhan Logo" width={24} height={24} className="h-auto w-auto" />
                <span className="text-xs font-bold" style={{ color: "var(--kw-text)" }}>
                  kwentuhan
                </span>
              </div>
              {!isFocused && (
                <p className="mt-0.5 text-[0.625rem]" style={{ color: "var(--kw-subtext)" }}>
                  usapang totoo, kasama mo.
                </p>
              )}
            </div>
            <span
              className="level-badge text-[0.6rem] px-2 py-0.5"
              style={{ color: level.color, background: level.bg, border: `1px solid ${level.border}` }}
            >
              {level.label}
            </span>
          </div>

          {/* Category */}
          <div className="flex items-center gap-1.5 mb-3">
            <span
              className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ color: clr.accent, background: clr.bg }}
            >
              {question.categoryEmoji} {question.categoryLabel}
            </span>
          </div>

          {/* Question */}
          <p
            className="font-bold leading-snug pr-[5.5rem]"
            style={{
              fontFamily: "'Playfair Display',Georgia,serif",
              fontSize:   "1rem",
              color:      "var(--kw-text)",
              lineHeight: 1.4,
            }}
          >
            {question.hook}
          </p>

          {/* Inline answer */}
          <AnswerInput
            ref={answerRef}
            value={answer}
            onChange={setAnswer}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        </div>
      </div>
    </>
  );
}

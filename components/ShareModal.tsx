"use client";

import { useCallback, useEffect, useState } from "react";
import type { Question } from "@/lib/types";
import type { AnswerStyle } from "@/lib/shareAnswer/types";
import { getLastStyle, setLastStyle } from "@/lib/shareAnswer/persist";
import ShareInput from "./share/ShareInput";
import SharePreview from "./share/SharePreview";

interface Props {
  question:  Question;
  onClose:   () => void;
  /** Reserved — not used in the new flow but kept for caller compatibility. */
  onNext:    () => void;
}

type Mode = "input" | "preview";

export default function ShareModal({ question, onClose }: Props) {
  const [mode,    setMode]    = useState<Mode>("input");
  const [answer,  setAnswer]  = useState("");
  const [isFocused, setFocused] = useState(false);
  // Style hydrates from localStorage; default chat for first-time users.
  const [style,   setStyleState] = useState<AnswerStyle>("chat");
  // Teaser does NOT persist — always starts off per share session.
  const [teaser,  setTeaser]  = useState(false);

  useEffect(() => { setStyleState(getLastStyle()); }, []);

  const setStyle = useCallback((next: AnswerStyle) => {
    setStyleState(next);
    setLastStyle(next);
  }, []);

  /* Close on Escape (only when not focused — let textarea handle Esc itself) */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !isFocused) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, isFocused]);

  const handleDone = useCallback(() => {
    if (answer.trim().length > 0) setMode("preview");
  }, [answer]);

  const handleEditAnswer = useCallback(() => {
    setMode("input");
  }, []);

  return (
    <div
      className="kw-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Share question"
    >
      <div
        className="kw-sheet w-full max-w-sm overflow-y-auto"
        style={{ maxHeight: "calc(100dvh - 24px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: "var(--kw-border)" }} />
        </div>

        {mode === "input" ? (
          <ShareInput
            question={question}
            answer={answer}
            setAnswer={setAnswer}
            isFocused={isFocused}
            setFocused={setFocused}
            onDone={handleDone}
          />
        ) : (
          <SharePreview
            question={question}
            answer={answer}
            style={style}
            setStyle={setStyle}
            teaser={teaser}
            setTeaser={setTeaser}
            onClose={onClose}
            onEditAnswer={handleEditAnswer}
          />
        )}
      </div>
    </div>
  );
}

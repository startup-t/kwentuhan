"use client";

import type { Question } from "@/lib/types";
import type { AnswerStyle } from "@/lib/shareAnswer/types";
import KwentoExportPanel from "./KwentoExportPanel";

/**
 * SharePreview is the in-app creator (User 1) completion screen.
 *
 * As of the shared-lifecycle refactor the actual export-ready body lives in
 * `<KwentoExportPanel />`, which is the same component User 2 renders after
 * answering. This wrapper just adds the modal-specific header chrome (Preview
 * title + close X) and forwards props.
 *
 * Props are kept for backwards compatibility with `ShareModal` even though a
 * couple are now ignored (the panel owns its own internal style/teaser state).
 */
interface Props {
  question: Question;
  answer: string;
  /** @deprecated The panel owns its own style state now. Kept for caller compat. */
  style?: AnswerStyle;
  /** @deprecated See `style`. */
  setStyle?: (next: AnswerStyle) => void;
  /** @deprecated The panel owns its own teaser state now. */
  teaser?: boolean;
  /** @deprecated See `teaser`. */
  setTeaser?: (next: boolean) => void;
  onClose: () => void;
  onEditAnswer: () => void;
}

export default function SharePreview({
  question,
  answer,
  teaser,
  onClose,
  onEditAnswer,
}: Props) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3">
        <h3 className="font-bold text-base" style={{ color: "var(--kw-text)" }}>
          Preview
        </h3>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-xl flex items-center justify-center btn-secondary text-xs"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <KwentoExportPanel
        question={question}
        answer={answer}
        initialTeaser={teaser ?? false}
        onEditAnswer={onEditAnswer}
      />
    </>
  );
}

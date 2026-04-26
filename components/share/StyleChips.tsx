"use client";

import type { AnswerStyle } from "@/lib/shareAnswer/types";
import { ANSWER_STYLES, STYLE_LABEL } from "@/lib/shareAnswer/types";

interface Props {
  value:    AnswerStyle;
  onChange: (next: AnswerStyle) => void;
}

export default function StyleChips({ value, onChange }: Props) {
  return (
    <div className="flex items-center justify-center gap-2" role="tablist" aria-label="Answer style">
      {ANSWER_STYLES.map((style) => {
        const active = style === value;
        return (
          <button
            key={style}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(style)}
            className="kw-chip"
            style={{
              background:    active ? "var(--kw-accent)" : "var(--kw-surface)",
              borderColor:   active ? "var(--kw-accent)" : "var(--kw-border)",
              color:         active ? "white" : "var(--kw-subtext)",
              boxShadow:     active ? "0 4px 16px rgba(108,92,231,0.30)" : "none",
              padding:       "0.5rem 1rem",
              fontSize:      "0.8125rem",
            }}
          >
            {STYLE_LABEL[style]}
          </button>
        );
      })}
    </div>
  );
}

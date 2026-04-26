"use client";

import { useEffect, useState } from "react";
import type { AnswerStyle } from "@/lib/shareAnswer/types";

const TOAST_MS = 4000;

interface Props {
  /** Length-derived suggestion. null = no toast for this length range. */
  suggest:  AnswerStyle | null;
  message:  string;
  onDismiss: () => void;
}

export default function SmartDefaultToast({ suggest, message, onDismiss }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setVisible(false);
      window.setTimeout(onDismiss, 200);
    }, TOAST_MS);
    return () => window.clearTimeout(t);
  }, [onDismiss]);

  if (!suggest) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        opacity:    visible ? 1 : 0,
        transform:  visible ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.2s ease, transform 0.2s ease",
        background: "var(--kw-surface)",
        border:     "1px solid var(--kw-border)",
        borderRadius: 12,
        padding:    "0.625rem 0.875rem",
        boxShadow:  "0 4px 16px rgba(108,92,231,0.10)",
        fontSize:   "0.8125rem",
        color:      "var(--kw-text)",
      }}
    >
      {message}
    </div>
  );
}

export function suggestionForLength(len: number): { suggest: AnswerStyle | null; message: string } {
  if (len <= 40) {
    return { suggest: "quote", message: "Quote style fits short answers beautifully — try it?" };
  }
  if (len > 120) {
    return { suggest: "note", message: "Note keeps long answers easy to read." };
  }
  return { suggest: null, message: "" };
}

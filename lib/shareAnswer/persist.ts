import type { AnswerStyle } from "./types";

const KEY = "kw:share:lastStyle";

export function getLastStyle(): AnswerStyle {
  if (typeof window === "undefined") return "chat";
  try {
    const v = window.localStorage.getItem(KEY);
    if (v === "chat" || v === "quote" || v === "note") return v;
  } catch { /* private mode / disabled — fall through */ }
  return "chat";
}

export function setLastStyle(s: AnswerStyle): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, s);
  } catch { /* ignore */ }
}

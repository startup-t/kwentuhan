// lib/questions.ts — Kwentuhan question utilities

import type { Question, Mode, Level } from "./types";
import questionsData from "@/data/questions.json";

const ALL: Question[] = questionsData as Question[];

/** Fisher-Yates shuffle with a numeric seed */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function getQuestions(
  mode: Mode,
  category: string | null,
  level?: Level,
): Question[] {
  let pool = ALL.filter(q => q.mode === mode);

  if (mode === "solo") {
    pool = pool.filter(q => q.isPersonal);
  }
  if (category) {
    pool = pool.filter(q => q.category === category);
  }
  if (level) {
    pool = pool.filter(q => q.level === level);
  }
  return pool;
}

export function buildSession(
  mode: Mode,
  category: string | null,
  seed?: number,
): Question[] {
  const pool = getQuestions(mode, category);
  return seededShuffle(pool, seed ?? Date.now());
}

export function getQuestionCount(mode: Mode, category: string | null): number {
  return getQuestions(mode, category).length;
}

export function getCategoryMeta(category: string) {
  const q = ALL.find(q => q.category === category);
  if (!q) return null;
  return {
    label:    q.categoryLabel,
    emoji:    q.categoryEmoji,
    mode:     q.mode,
    cluster:  q.cluster,
    ageGated: q.ageGated,
  };
}

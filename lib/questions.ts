// lib/questions.ts — Kwentuhan question utilities

import type { Question, Mode, Level } from "./types";
import questionsData from "@/data/questions.json";

const ALL_STATIC: Question[] = questionsData as Question[];

export async function getQuestions(
  mode: Mode,
  category: string | null,
  level?: Level,
): Promise<Question[]> {
  // In browser, call API to include contributed questions
  if (typeof window !== "undefined") {
    const params = new URLSearchParams();
    params.set("mode", mode);
    params.set("category", category ?? "null");
    if (level) params.set("level", level);
    const res = await fetch(`/api/questions?${params}`);
    if (res.ok) {
      const data = await res.json();
      return data.questions;
    }
    // Fallback to static
    console.warn("Failed to fetch questions from API, using static");
  }

  // Server-side: only static questions
  let pool = [...ALL_STATIC];
  pool = pool.filter(q => q.mode === mode);

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

export async function buildSession(
  mode: Mode,
  category: string | null,
  seed?: number,
): Promise<Question[]> {
  const pool = await getQuestions(mode, category);
  return seededShuffle(pool, seed ?? Date.now());
}

export async function getQuestionCount(mode: Mode, category: string | null): Promise<number> {
  const pool = await getQuestions(mode, category);
  return pool.length;
}

export function getQuestionById(id: number): Question | undefined {
  return ALL_STATIC.find(q => q.id === id);
}
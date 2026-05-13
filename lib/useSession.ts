"use client";
// lib/useSession.ts

import { useState, useCallback } from "react";
import type { Mode } from "./types";
import type { Question } from "./types";
import { buildSession } from "./questions";

export interface SessionState {
  mode: Mode;
  category: string | null;
  questions: Question[];
  currentIdx: number;
  showDeep: boolean;
  isFinished: boolean;
}

export function useSession() {
  const [session, setSession] = useState<SessionState | null>(null);

  const startSession = useCallback((mode: Mode, category: string | null) => {
    const questions = buildSession(mode, category);
    setSession({
      mode, category, questions,
      currentIdx: 0, showDeep: false,
      isFinished: questions.length === 0,
    });
  }, []);

  const next = useCallback(() => {
    setSession(prev => {
      if (!prev) return prev;
      const nextIdx = prev.currentIdx + 1;
      return { ...prev, currentIdx: nextIdx, showDeep: false, isFinished: nextIdx >= prev.questions.length };
    });
  }, []);

  const previous = useCallback(() => {
    setSession(prev => {
      if (!prev || prev.currentIdx <= 0) return prev;
      const prevIdx = prev.currentIdx - 1;
      return { ...prev, currentIdx: prevIdx, showDeep: false, isFinished: false };
    });
  }, []);

  const toggleDeep = useCallback(() => {
    setSession(prev => prev ? { ...prev, showDeep: !prev.showDeep } : prev);
  }, []);

  const restart = useCallback(() => {
    setSession(prev => prev
      ? { ...prev, questions: buildSession(prev.mode, prev.category), currentIdx: 0, showDeep: false, isFinished: false }
      : prev
    );
  }, []);

  const reset = useCallback(() => setSession(null), []);

  const current = session ? (session.questions[session.currentIdx] ?? null) : null;
  const progress = session ? { current: session.currentIdx + 1, total: session.questions.length } : null;

  return { session, current, progress, startSession, next, previous, toggleDeep, restart, reset };
}

import { randomUUID } from "crypto";

export type TeaserAnswerPayload = {
  questionId: number;
  question: string;
  answer: string;
};

export type TeaserShareRecord = {
  kwentoId: string;
  questionId: string;
  questionText: string;
  answerText: string;
  isTeaser: boolean;
  createdAt: string;
};

type Store = Map<string, TeaserShareRecord>;

const globalForStore = globalThis as typeof globalThis & {
  __kwentuhanTeaserStore__?: Store;
};

const teaserStore: Store = globalForStore.__kwentuhanTeaserStore__ ?? new Map();
if (!globalForStore.__kwentuhanTeaserStore__) {
  globalForStore.__kwentuhanTeaserStore__ = teaserStore;
}

export function createTeaserShare(answers: TeaserAnswerPayload): TeaserShareRecord {
  const kwentoId = randomUUID();
  const questionId = String(answers.questionId);
  const record: TeaserShareRecord = {
    kwentoId,
    questionId,
    questionText: answers.question,
    answerText: answers.answer,
    isTeaser: true,
    createdAt: new Date().toISOString(),
  };
  teaserStore.set(kwentoId, record);
  return record;
}

export function getTeaserShare(kwentoId: string): TeaserShareRecord | null {
  return teaserStore.get(kwentoId) ?? null;
}

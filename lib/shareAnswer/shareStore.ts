import { randomUUID } from "crypto";

export type TeaserAnswerPayload = {
  questionId: number;
  question: string;
  answer: string;
};

export type CreateKwentoFromRevealPayload = {
  questionId: string;
  questionText: string;
  answerText: string;
  isTeaser: boolean;
};

export type TeaserShareRecord = {
  kwentoId: string;
  questionId: string;
  questionText: string;
  answerText: string;
  isTeaser: boolean;
  createdAt: string;
};

export type CreateKwentoPayload = {
  questionId: string;
  questionText: string;
  answerText: string;
  isTeaser: boolean;
};

type Store = Map<string, TeaserShareRecord>;

const globalForStore = globalThis as typeof globalThis & {
  __kwentuhanTeaserStore__?: Store;
};

const teaserStore: Store = globalForStore.__kwentuhanTeaserStore__ ?? new Map();
if (!globalForStore.__kwentuhanTeaserStore__) {
  globalForStore.__kwentuhanTeaserStore__ = teaserStore;
}

function createRecord(payload: {
  kwentoId: string;
  questionId: string;
  questionText: string;
  answerText: string;
  isTeaser: boolean;
}): TeaserShareRecord {
  return {
    kwentoId: payload.kwentoId,
    questionId: payload.questionId,
    questionText: payload.questionText,
    answerText: payload.answerText,
    isTeaser: payload.isTeaser,
    createdAt: new Date().toISOString(),
  };
}

export function createTeaserShare(answers: TeaserAnswerPayload): TeaserShareRecord {
  const kwentoId = randomUUID();
  const questionId = String(answers.questionId);
  const record = createRecord({
    kwentoId,
    questionId,
    questionText: answers.question,
    answerText: answers.answer,
    isTeaser: true,
  });

  teaserStore.set(kwentoId, record);
  return record;
}

function generateRevealKwentoId(): string {
  // Keep retrying if a collision happens so we never overwrite an existing kwento.
  while (true) {
    const kwentoId = `k_${randomUUID().replace(/-/g, "").slice(0, 8)}`;
    if (!teaserStore.has(kwentoId)) return kwentoId;
  }
}

export function saveKwentoShare(payload: CreateKwentoPayload): TeaserShareRecord {
  const kwentoId = generateRevealKwentoId();
  const record = createRecord({
    kwentoId,
    questionId: payload.questionId,
    questionText: payload.questionText,
    answerText: payload.answerText,
    isTeaser: payload.isTeaser,
  });

  teaserStore.set(kwentoId, record);
  return record;
}

export function createKwentoShareFromReveal(payload: CreateKwentoFromRevealPayload): TeaserShareRecord {
  return saveKwentoShare(payload);
}

export function getKwentoShare(kwentoId: string): TeaserShareRecord | null {
  return teaserStore.get(kwentoId) ?? null;
}

export function getTeaserShare(kwentoId: string): TeaserShareRecord | null {
  return getKwentoShare(kwentoId);
}

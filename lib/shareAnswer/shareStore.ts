import { randomUUID } from "crypto";

export type TeaserAnswerPayload = {
  questionId: number;
  question: string;
  answer: string;
};

export type TeaserShareRecord = {
  shareId: string;
  answers: TeaserAnswerPayload;
  mode: "teaser";
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
  const shareId = randomUUID();
  const record: TeaserShareRecord = {
    shareId,
    answers,
    mode: "teaser",
    createdAt: new Date().toISOString(),
  };
  teaserStore.set(shareId, record);
  return record;
}

export function getTeaserShare(shareId: string): TeaserShareRecord | null {
  return teaserStore.get(shareId) ?? null;
}

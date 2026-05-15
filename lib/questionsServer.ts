import type { Question, Mode, Level } from "./types";
import type { ContributedQuestion } from "./kwento/postgresStore";
import questionsData from "@/data/questions.json";
import { getContributedQuestions, getContributedQuestionById } from "./kwento/postgresStore";

const ALL_STATIC: Question[] = (questionsData as Question[]).map((question) => ({
  ...question,
  contributor: undefined,
  language: undefined,
  isCommunity: false,
}));

function mapContributedQuestion(row: ContributedQuestion): Question {
  return {
    id: row.id,
    hook: row.hook,
    deepDive: row.deepDive,
    level: row.level as Level,
    levelLabel: row.level === "light" ? "Chill" : row.level === "deep" ? "Deep" : "Wild",
    levelColor: row.level === "light" ? "#6C5CE7" : row.level === "deep" ? "#E85C2B" : "#E84393",
    category: row.category,
    categoryLabel: row.category,
    categoryEmoji: "🤔",
    mode: row.mode as Mode,
    cluster: row.cluster,
    isPersonal: row.mode === "solo",
    ageGated: false,
    contributor: row.contributorUsername || "Community Contributor",
    language: row.language,
    isCommunity: true,
  };
}

function filterQuestions(
  questions: Question[],
  mode: Mode,
  category: string | null,
  level?: Level,
) {
  let pool = questions.filter((q) => q.mode === mode);
  if (mode === "solo") {
    pool = pool.filter((q) => q.isPersonal);
  }
  if (category) {
    pool = pool.filter((q) => q.category === category);
  }
  if (level) {
    pool = pool.filter((q) => q.level === level);
  }
  return pool;
}

export async function getPublishedQuestions(
  mode: Mode,
  category: string | null,
  level?: Level,
): Promise<Question[]> {
  const staticQuestions = filterQuestions(ALL_STATIC, mode, category, level);
  const contributedRows = await getContributedQuestions(mode, category ?? undefined, level);
  const contributedQuestions = contributedRows.map(mapContributedQuestion);
  return [...staticQuestions, ...contributedQuestions];
}

export async function getPublishedQuestionCount(mode: Mode, category: string | null): Promise<number> {
  return (await getPublishedQuestions(mode, category)).length;
}

export async function getQuestionById(questionId: string): Promise<Question | undefined> {
  const staticQuestion = ALL_STATIC.find((q) => String(q.id) === String(questionId));
  if (staticQuestion) {
    return staticQuestion;
  }

  const contributed = await getContributedQuestionById(questionId);
  if (!contributed) {
    return undefined;
  }

  return mapContributedQuestion(contributed);
}

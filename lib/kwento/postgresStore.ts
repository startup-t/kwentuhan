import { randomUUID } from "crypto";
import { Pool, type QueryResultRow } from "pg";

export type PersistedKwento = {
  kwentoId: string;
  questionId: string;
  questionText: string;
  answerText: string;
  isTeaser: boolean;
  createdAt: string;
};

export type ContributedQuestion = {
  id: string;
  hook: string;
  deepDive: string;
  level: string;
  category: string;
  mode: string;
  cluster: string;
  contributorUsername: string;
  language: string;
  isPublished: boolean;
  createdAt: string;
};

export type CreateKwentoInput = {
  questionId: string;
  questionText: string;
  answerText: string;
  isTeaser: boolean;
};

const globalForPostgres = globalThis as typeof globalThis & {
  __kwentuhanPostgresPool__?: Pool;
  __kwentuhanPostgresInit__?: Promise<void>;
};

function getConnectionString(): string {
  const connectionString = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Missing Postgres connection string");
  }
  return connectionString;
}

function getPool(): Pool {
  if (!globalForPostgres.__kwentuhanPostgresPool__) {
    globalForPostgres.__kwentuhanPostgresPool__ = new Pool({
      connectionString: getConnectionString(),
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }

  return globalForPostgres.__kwentuhanPostgresPool__;
}

async function ensureTable(): Promise<void> {
  if (!globalForPostgres.__kwentuhanPostgresInit__) {
    globalForPostgres.__kwentuhanPostgresInit__ = (async () => {
      const pool = getPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS kwento_shares (
          kwento_id TEXT PRIMARY KEY,
          question_id TEXT NOT NULL,
          question_text TEXT NOT NULL,
          answer_text TEXT NOT NULL,
          is_teaser BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_kwento_shares_question_id
        ON kwento_shares (question_id)
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS contributed_questions (
          id TEXT PRIMARY KEY,
          hook TEXT NOT NULL,
          deep_dive TEXT NOT NULL,
          level TEXT NOT NULL,
          category TEXT NOT NULL,
          mode TEXT NOT NULL,
          cluster TEXT NOT NULL,
          contributor_username TEXT NOT NULL DEFAULT 'Community Contributor',
          language TEXT NOT NULL DEFAULT 'en',
          is_published BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await pool.query(`
        ALTER TABLE contributed_questions
        ADD COLUMN IF NOT EXISTS contributor_username TEXT NOT NULL DEFAULT 'Community Contributor'
      `);
      await pool.query(`
        ALTER TABLE contributed_questions
        ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en'
      `);
      await pool.query(`
        ALTER TABLE contributed_questions
        ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT TRUE
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_contributed_questions_category
        ON contributed_questions (category)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_contributed_questions_mode
        ON contributed_questions (mode)
      `);
    })();
  }

  await globalForPostgres.__kwentuhanPostgresInit__;
}

function toPersistedKwento(row: QueryResultRow): PersistedKwento {
  return {
    kwentoId: String(row.kwento_id),
    questionId: String(row.question_id),
    questionText: String(row.question_text),
    answerText: String(row.answer_text),
    isTeaser: Boolean(row.is_teaser),
    createdAt:
      row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

function toContributedQuestion(row: QueryResultRow): ContributedQuestion {
  return {
    id: String(row.id),
    hook: String(row.hook),
    deepDive: String(row.deep_dive),
    level: String(row.level),
    category: String(row.category),
    mode: String(row.mode),
    cluster: String(row.cluster),
    contributorUsername: String(row.contributor_username ?? row.contributor ?? "Community Contributor"),
    language: String(row.language ?? "en"),
    isPublished: Boolean(row.is_published ?? true),
    createdAt:
      row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

function buildKwentoId(): string {
  return `k_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

function buildQuestionId(): string {
  return `q_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export async function createPersistedKwento(input: CreateKwentoInput): Promise<PersistedKwento> {
  await ensureTable();
  const pool = getPool();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const kwentoId = buildKwentoId();
    const result = await pool.query(
      `
        INSERT INTO kwento_shares (kwento_id, question_id, question_text, answer_text, is_teaser)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (kwento_id) DO NOTHING
        RETURNING kwento_id, question_id, question_text, answer_text, is_teaser, created_at
      `,
      [kwentoId, input.questionId, input.questionText, input.answerText, input.isTeaser]
    );

    if (result.rowCount && result.rows[0]) {
      return toPersistedKwento(result.rows[0]);
    }
  }

  throw new Error("Failed to allocate kwento ID");
}

export async function getPersistedKwento(kwentoId: string): Promise<PersistedKwento | null> {
  await ensureTable();
  const pool = getPool();
  const result = await pool.query(
    `
      SELECT kwento_id, question_id, question_text, answer_text, is_teaser, created_at
      FROM kwento_shares
      WHERE kwento_id = $1
      LIMIT 1
    `,
    [kwentoId]
  );

  if (!result.rowCount || !result.rows[0]) {
    return null;
  }

  return toPersistedKwento(result.rows[0]);
}

export type CreateContributedQuestionInput = {
  hook: string;
  deepDive: string;
  level: string;
  category: string;
  mode: string;
  cluster: string;
  contributorUsername: string;
  language: string;
  isPublished?: boolean;
};

export async function createContributedQuestion(input: CreateContributedQuestionInput): Promise<ContributedQuestion> {
  await ensureTable();
  const pool = getPool();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = buildQuestionId();
    const result = await pool.query(
      `
        INSERT INTO contributed_questions (id, hook, deep_dive, level, category, mode, cluster, contributor_username, language, is_published)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO NOTHING
        RETURNING id, hook, deep_dive, level, category, mode, cluster, contributor_username, language, is_published, created_at
      `,
      [
        id,
        input.hook,
        input.deepDive,
        input.level,
        input.category,
        input.mode,
        input.cluster,
        input.contributorUsername,
        input.language,
        input.isPublished !== false,
      ]
    );

    if (result.rowCount && result.rows[0]) {
      return toContributedQuestion(result.rows[0]);
    }
  }

  throw new Error("Failed to create contributed question");
}

export async function getContributedQuestions(mode?: string, category?: string, level?: string): Promise<ContributedQuestion[]> {
  await ensureTable();
  const pool = getPool();
  let query = `
    SELECT id, hook, deep_dive, level, category, mode, cluster, contributor_username, language, is_published, created_at
    FROM contributed_questions
    WHERE is_published = TRUE
  `;
  const params: any[] = [];
  if (mode) {
    query += ` AND mode = $${params.length + 1}`;
    params.push(mode);
  }
  if (category) {
    query += ` AND category = $${params.length + 1}`;
    params.push(category);
  }
  if (level) {
    query += ` AND level = $${params.length + 1}`;
    params.push(level);
  }
  query += ` ORDER BY created_at DESC`;

  const result = await pool.query(query, params);
  return result.rows.map(toContributedQuestion);
}

export async function getContributedQuestionById(id: string): Promise<ContributedQuestion | null> {
  await ensureTable();
  const pool = getPool();
  const result = await pool.query(
    `
      SELECT id, hook, deep_dive, level, category, mode, cluster, contributor_username, language, is_published, created_at
      FROM contributed_questions
      WHERE id = $1
      LIMIT 1
    `,
    [id]
  );

  if (!result.rowCount || !result.rows[0]) {
    return null;
  }

  return toContributedQuestion(result.rows[0]);
}

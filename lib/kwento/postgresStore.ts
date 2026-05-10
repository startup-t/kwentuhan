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

function buildKwentoId(): string {
  return `k_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
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

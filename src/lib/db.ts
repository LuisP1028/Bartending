import { Pool, QueryResult, QueryResultRow } from 'pg';

let _pool: Pool | null = null;
let _schemaEnsured = false;
let _schemaPromise: Promise<void> | null = null;

export function getDbPool(): Pool {
  if (_pool) return _pool;

  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  const isSslDisabled = process.env.PGSSLMODE === 'disable';

  if (connectionString) {
    _pool = new Pool({
      connectionString,
      ssl: isSslDisabled ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  } else {
    _pool = new Pool({
      host: process.env.PGHOST || '127.0.0.1',
      port: Number(process.env.PGPORT || 5432),
      database: process.env.PGDATABASE || 'bartending',
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || '',
      ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }

  _pool.on('error', (err) => {
    console.error('[PostgreSQL] Unexpected error on idle client:', err);
  });

  return _pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  await ensureSchema();
  const pool = getDbPool();
  return pool.query<T>(text, params);
}

export async function ensureSchema(): Promise<void> {
  if (_schemaEnsured) return;
  if (_schemaPromise) return _schemaPromise;

  _schemaPromise = (async () => {
    const pool = getDbPool();
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS patrons (
          id VARCHAR(255) PRIMARY KEY,
          display_name VARCHAR(255) NOT NULL,
          personality VARCHAR(255) NOT NULL,
          about_me TEXT,
          prompt_ready BOOLEAN NOT NULL DEFAULT FALSE,
          walk_frame_count INT NOT NULL DEFAULT 2,
          walk_frame_ms INT NOT NULL DEFAULT 120,
          sit_url TEXT NOT NULL,
          talk_url TEXT NOT NULL,
          walk_01_url TEXT NOT NULL,
          walk_02_url TEXT NOT NULL,
          source_url TEXT,
          is_ready BOOLEAN NOT NULL DEFAULT FALSE,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        ALTER TABLE patrons ADD COLUMN IF NOT EXISTS about_me TEXT;
        ALTER TABLE patrons ADD COLUMN IF NOT EXISTS prompt_ready BOOLEAN NOT NULL DEFAULT FALSE;

        CREATE INDEX IF NOT EXISTS idx_patrons_active_ready ON patrons(is_active, is_ready);
        CREATE INDEX IF NOT EXISTS idx_patrons_created_at ON patrons(created_at);

        CREATE TABLE IF NOT EXISTS generation_jobs (
          job_id VARCHAR(255) PRIMARY KEY,
          character_id VARCHAR(255) NOT NULL,
          display_name VARCHAR(255) NOT NULL,
          status VARCHAR(50) NOT NULL,
          current_stage VARCHAR(100),
          stage_index INT,
          total_stages INT,
          progress_pct INT,
          status_message TEXT,
          error TEXT,
          log_tail TEXT,
          photo_path TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_generation_jobs_character_id ON generation_jobs(character_id);
        CREATE INDEX IF NOT EXISTS idx_generation_jobs_status ON generation_jobs(status);

        CREATE TABLE IF NOT EXISTS patron_pii (
          id SERIAL PRIMARY KEY,
          character_id VARCHAR(255) NOT NULL,
          contact_hash VARCHAR(255) NOT NULL UNIQUE,
          name_enc TEXT NOT NULL,
          email_enc TEXT,
          phone_enc TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_patron_pii_contact_hash ON patron_pii(contact_hash);
        CREATE INDEX IF NOT EXISTS idx_patron_pii_character_id ON patron_pii(character_id);
      `);
      _schemaEnsured = true;
    } finally {
      client.release();
    }
  })();

  return _schemaPromise;
}

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const pool = getDbPool();
    const res = await pool.query('SELECT 1');
    return res.rowCount !== null && res.rowCount > 0;
  } catch {
    return false;
  }
}

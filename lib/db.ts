import { Pool, type QueryResult, type QueryResultRow } from 'pg';

let pool: Pool | undefined;

function getDatabaseUrl(): string {
  const url =
    process.env.DATABASE_URL?.trim() ||
    process.env.DATABASE_PUBLIC_URL?.trim() ||
    process.env.DATABASE_PRIVATE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim();

  if (!url) {
    throw new Error(
      'DATABASE_URL (o DATABASE_PUBLIC_URL / POSTGRES_URL) no está definida.',
    );
  }

  return url;
}

/** Supabase pooler (6543) requiere pgbouncer=true para serverless/Vercel. */
function normalizeConnectionString(connectionString: string): string {
  const isPooler =
    connectionString.includes('pooler.supabase.com') ||
    connectionString.includes(':6543/');

  if (!isPooler || connectionString.includes('pgbouncer=true')) {
    return connectionString;
  }

  const sep = connectionString.includes('?') ? '&' : '?';
  return `${connectionString}${sep}pgbouncer=true`;
}

/** Pool Postgres compartido (Supabase o Railway). */
export function getPool(): Pool {
  if (!pool) {
    const connectionString = normalizeConnectionString(getDatabaseUrl());
    const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);

    pool = new Pool({
      connectionString,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 15_000,
    });
  }

  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params);
}

/** Comprueba conexión sin lanzar si falta DATABASE_URL. */
export function isDatabaseConfigured(): boolean {
  return Boolean(
    process.env.DATABASE_URL?.trim() ||
      process.env.DATABASE_PUBLIC_URL?.trim() ||
      process.env.DATABASE_PRIVATE_URL?.trim() ||
      process.env.POSTGRES_URL?.trim(),
  );
}

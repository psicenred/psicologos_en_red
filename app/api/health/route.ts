import { NextResponse } from 'next/server';
import { isDatabaseConfigured, query } from '@/lib/db';
import { isSupabaseConfigured } from '@/lib/supabase';

function parseDatabaseUrlInfo(): {
  user: string;
  host: string;
  port: string;
} | null {
  const raw =
    process.env.DATABASE_URL?.trim() ||
    process.env.DATABASE_PUBLIC_URL?.trim() ||
    process.env.DATABASE_PRIVATE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw.replace(/^postgresql:/, 'https:'));
    return {
      user: parsed.username,
      host: parsed.hostname,
      port: parsed.port || '5432',
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const sessionSecret = Boolean(process.env.SESSION_SECRET?.trim());
  let databaseQuery = false;
  let psicologosCount: number | null = null;
  let databaseError: string | null = null;

  if (isDatabaseConfigured()) {
    try {
      const result = await query<{ n: number }>(
        'SELECT COUNT(*)::int AS n FROM psicologos',
      );
      psicologosCount = result.rows[0]?.n ?? 0;
      databaseQuery = true;
    } catch (error) {
      const err = error as { message?: string; code?: string };
      databaseError = [err.code, err.message].filter(Boolean).join(': ');
    }
  }

  const dbInfo = parseDatabaseUrlInfo();
  const ok = databaseQuery && sessionSecret;
  const body = {
    status: ok ? 'ok' : 'degraded',
    checks: {
      databaseUrl: isDatabaseConfigured(),
      databaseUser: dbInfo?.user ?? null,
      databaseHost: dbInfo?.host ?? null,
      databasePort: dbInfo?.port ?? null,
      databaseQuery,
      psicologosCount,
      databaseError,
      sessionSecret,
      supabaseStorage: isSupabaseConfigured(),
      stripe: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
      cron: Boolean(process.env.CRON_SECRET?.trim()),
    },
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(body, { status: ok ? 200 : 503 });
}

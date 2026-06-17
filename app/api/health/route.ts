import { NextResponse } from 'next/server';
import { isDatabaseConfigured, query } from '@/lib/db';
import { isSupabaseConfigured } from '@/lib/supabase';

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

  const ok = databaseQuery && sessionSecret;
  const body = {
    status: ok ? 'ok' : 'degraded',
    checks: {
      databaseUrl: isDatabaseConfigured(),
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

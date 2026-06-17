import { NextResponse } from 'next/server';
import { isDatabaseConfigured } from '@/lib/db';
import { isSupabaseConfigured } from '@/lib/supabase';

export async function GET() {
  const db = isDatabaseConfigured();
  const storage = isSupabaseConfigured();
  const sessionSecret = Boolean(process.env.SESSION_SECRET?.trim());

  const ok = db && sessionSecret;
  const body = {
    status: ok ? 'ok' : 'degraded',
    checks: {
      database: db,
      sessionSecret,
      supabaseStorage: storage,
      stripe: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
      cron: Boolean(process.env.CRON_SECRET?.trim()),
    },
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(body, { status: ok ? 200 : 503 });
}

import { NextResponse } from 'next/server';
import { isDatabaseConfigured, query } from '@/lib/db';
import { getBaseUrl, getBaseUrlSource } from '@/lib/config';
import { isBaileysWorkerConfigured } from '@/lib/whatsapp/providers/baileys-api';
import { isSupabaseConfigured } from '@/lib/supabase';

function isDetailedHealthAuthorized(request: Request): boolean {
  const secret =
    process.env.HEALTH_SECRET?.trim() || process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get('x-health-secret');
  return header === secret;
}

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

export async function GET(request: Request) {
  const detailed = isDetailedHealthAuthorized(request);
  const sessionSecret = Boolean(process.env.SESSION_SECRET?.trim());
  let databaseQuery = false;
  let psicologosCount: number | null = null;

  if (isDatabaseConfigured()) {
    try {
      const result = await query<{ n: number }>(
        'SELECT COUNT(*)::int AS n FROM psicologos',
      );
      psicologosCount = result.rows[0]?.n ?? 0;
      databaseQuery = true;
    } catch {
      databaseQuery = false;
    }
  }

  const ok = databaseQuery && sessionSecret;

  if (!detailed) {
    return NextResponse.json(
      {
        status: ok ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
      },
      { status: ok ? 200 : 503 },
    );
  }

  const dbInfo = parseDatabaseUrlInfo();
  const body = {
    status: ok ? 'ok' : 'degraded',
    checks: {
      databaseUrl: isDatabaseConfigured(),
      databaseUser: dbInfo?.user ?? null,
      databaseHost: dbInfo?.host ?? null,
      databasePort: dbInfo?.port ?? null,
      databaseQuery,
      psicologosCount,
      sessionSecret,
      mensajesEncryption: Boolean(
        process.env.MENSAJES_ENCRYPTION_KEY?.trim() &&
          process.env.MENSAJES_ENCRYPTION_KEY.trim().length >= 32,
      ),
      supabaseStorage: isSupabaseConfigured(),
      stripe: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
      cron: Boolean(process.env.CRON_SECRET?.trim()),
      whatsappProvider: process.env.WHATSAPP_PROVIDER?.trim() || 'auto',
      whatsappWorker: isBaileysWorkerConfigured(),
      publicBaseUrl: getBaseUrl(),
      publicBaseUrlSource: getBaseUrlSource(),
    },
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(body, { status: ok ? 200 : 503 });
}

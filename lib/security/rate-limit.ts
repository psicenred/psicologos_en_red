import { NextResponse } from 'next/server';
import { isDatabaseConfigured, query } from '@/lib/db';
import { logSecurityEvent } from '@/lib/security/logger';

export type RateLimitOptions = {
  /** Identificador lógico del endpoint, p.ej. "auth:login" */
  bucket: string;
  /** Máximo de peticiones por ventana */
  limit: number;
  /** Ventana en segundos */
  windowSec: number;
};

type MemoryEntry = { count: number; resetAt: number };

const memoryBuckets = new Map<string, MemoryEntry>();

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

function memoryRateLimit(key: string, limit: number, windowSec: number): boolean {
  const now = Date.now();
  const entry = memoryBuckets.get(key);
  if (!entry || entry.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}

async function dbRateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<boolean | null> {
  if (!isDatabaseConfigured()) return null;
  try {
    const countRes = await query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM rate_limit_events
       WHERE bucket_key = $1 AND created_at > NOW() - ($2 || ' seconds')::interval`,
      [key, String(windowSec)],
    );
    const count = countRes.rows[0]?.n ?? 0;
    if (count >= limit) return false;
    await query('INSERT INTO rate_limit_events (bucket_key) VALUES ($1)', [key]);
    return true;
  } catch {
    return null;
  }
}

/** Devuelve NextResponse 429 si se excede el límite; null si la petición puede continuar. */
export async function enforceRateLimit(
  request: Request,
  options: RateLimitOptions,
): Promise<NextResponse | null> {
  const ip = clientIp(request);
  const key = `${options.bucket}:${ip}`;
  const allowed =
    (await dbRateLimit(key, options.limit, options.windowSec)) ??
    memoryRateLimit(key, options.limit, options.windowSec);

  if (allowed) return null;

  logSecurityEvent('rate_limit', 'Rate limit exceeded', {
    bucket: options.bucket,
    ip,
  });

  return NextResponse.json(
    { error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.' },
    {
      status: 429,
      headers: { 'Retry-After': String(options.windowSec) },
    },
  );
}

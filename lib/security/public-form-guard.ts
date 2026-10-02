import { NextResponse } from 'next/server';
import { isDatabaseConfigured, query } from '@/lib/db';
import { isHoneypotTriggered } from '@/lib/security/honeypot';
import { logSecurityEvent } from '@/lib/security/logger';
import { normalizeEmailForRateLimit } from '@/lib/security/normalize-email';
import {
  getRequestClientIp,
  verifyTurnstileToken,
} from '@/lib/security/turnstile';

export type PublicFormKind = 'contacto' | 'aplicacion-trabajo';

const LIMIT = 2;
const WINDOW_SEC = 3600;

export type PublicFormGuardInput = {
  form: PublicFormKind;
  email: string;
  /** Valor del campo honeypot (company_url). */
  honeypot: unknown;
  turnstileToken: string | undefined | null;
  request: Request;
};

export type PublicFormGuardResult =
  | { ok: true }
  /** Honeypot: responder como éxito sin enviar correo. */
  | { ok: false; honeypot: true; response?: never }
  | { ok: false; honeypot?: never; response: NextResponse };

async function countBucket(bucketKey: string): Promise<number | null> {
  if (!isDatabaseConfigured()) return null;
  try {
    const res = await query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM rate_limit_events
       WHERE bucket_key = $1
         AND created_at > NOW() - ($2 || ' seconds')::interval`,
      [bucketKey, String(WINDOW_SEC)],
    );
    return res.rows[0]?.n ?? 0;
  } catch {
    return null;
  }
}

async function insertBucket(bucketKey: string): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;
  try {
    await query('INSERT INTO rate_limit_events (bucket_key) VALUES ($1)', [
      bucketKey,
    ]);
    return true;
  } catch {
    return false;
  }
}

type MemoryEntry = { count: number; resetAt: number };
const memoryBuckets = new Map<string, MemoryEntry>();

function memoryGetCount(key: string): number {
  const now = Date.now();
  const entry = memoryBuckets.get(key);
  if (!entry || entry.resetAt <= now) return 0;
  return entry.count;
}

function memoryBump(key: string): void {
  const now = Date.now();
  const entry = memoryBuckets.get(key);
  if (!entry || entry.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + WINDOW_SEC * 1000 });
    return;
  }
  entry.count += 1;
}

/**
 * Capas anti-spam compartidas: honeypot → Turnstile → rate limit IP + email (2/h).
 * Los formularios se cuentan por separado (buckets distintos).
 */
export async function enforcePublicFormGuard(
  input: PublicFormGuardInput,
): Promise<PublicFormGuardResult> {
  if (isHoneypotTriggered(input.honeypot)) {
    const ip = getRequestClientIp(input.request);
    logSecurityEvent('honeypot', 'Public form honeypot triggered', {
      form: input.form,
      ip,
    });
    return { ok: false, honeypot: true };
  }

  const ip = getRequestClientIp(input.request);
  const captcha = await verifyTurnstileToken(input.turnstileToken, ip);
  if (!captcha.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: captcha.error, code: 'CAPTCHA_FAILED' },
        { status: 400 },
      ),
    };
  }

  const emailNorm = normalizeEmailForRateLimit(input.email);
  if (!emailNorm || !emailNorm.includes('@')) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Email inválido', code: 'INVALID_EMAIL' },
        { status: 400 },
      ),
    };
  }

  const ipKey = `public:${input.form}:ip:${ip}`;
  const emailKey = `public:${input.form}:email:${emailNorm}`;

  const ipCount = await countBucket(ipKey);
  const emailCount = await countBucket(emailKey);

  if (ipCount != null && emailCount != null) {
    if (ipCount >= LIMIT || emailCount >= LIMIT) {
      logSecurityEvent('rate_limit', 'Public form rate limit exceeded', {
        form: input.form,
        ip,
        email: emailNorm,
        ipCount,
        emailCount,
      });
      return {
        ok: false,
        response: NextResponse.json(
          {
            error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.',
            code: 'RATE_LIMITED',
          },
          {
            status: 429,
            headers: { 'Retry-After': String(WINDOW_SEC) },
          },
        ),
      };
    }
    await insertBucket(ipKey);
    await insertBucket(emailKey);
    return { ok: true };
  }

  // Fallback en memoria si la tabla no está disponible
  if (memoryGetCount(ipKey) >= LIMIT || memoryGetCount(emailKey) >= LIMIT) {
    logSecurityEvent('rate_limit', 'Public form rate limit (memory)', {
      form: input.form,
      ip,
    });
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.',
          code: 'RATE_LIMITED',
        },
        {
          status: 429,
          headers: { 'Retry-After': String(WINDOW_SEC) },
        },
      ),
    };
  }
  memoryBump(ipKey);
  memoryBump(emailKey);
  return { ok: true };
}

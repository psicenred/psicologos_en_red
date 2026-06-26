import { NextResponse } from 'next/server';
import {
  databaseUnavailableJson,
  normalizeEmail,
  parseJsonBody,
} from '@/lib/auth/api';
import { ensureDb, requestPasswordReset } from '@/lib/auth/service';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, {
    bucket: 'auth:password-reset',
    limit: 5,
    windowSec: 3600,
  });
  if (limited) return limited;

  if (!ensureDb()) return databaseUnavailableJson();

  try {
    const body = await parseJsonBody<{ email?: string }>(request);
    const email = normalizeEmail(body.email);

    if (!email) {
      return NextResponse.json({ error: 'missing_email' }, { status: 400 });
    }

    const result = await requestPasswordReset(email);

    if (!result.ok) {
      if (result.code === 'not_found') {
        return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'mail_failed' }, { status: 503 });
    }

    return NextResponse.json({
      ok: true,
      message: 'reset_email_sent',
    });
  } catch (error) {
    console.error('POST /api/auth/olvide-password:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

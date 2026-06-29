import { NextResponse } from 'next/server';
import {
  databaseUnavailableJson,
  normalizeEmail,
  parseJsonBody,
} from '@/lib/auth/api';
import { ensureDb, requestVerificationResend } from '@/lib/auth/service';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, {
    bucket: 'auth:verification-resend',
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

    const result = await requestVerificationResend(email);

    if (!result.ok) {
      switch (result.code) {
        case 'not_found':
          return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
        case 'already_verified':
          return NextResponse.json({ error: 'already_verified' }, { status: 409 });
        case 'mail_failed':
          return NextResponse.json({ error: 'mail_failed' }, { status: 503 });
        default:
          return NextResponse.json({ error: 'missing_email' }, { status: 400 });
      }
    }

    return NextResponse.json({
      ok: true,
      email: result.email,
      message: 'verification_email_sent',
    });
  } catch (error) {
    console.error('POST /api/auth/reenviar-verificacion:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

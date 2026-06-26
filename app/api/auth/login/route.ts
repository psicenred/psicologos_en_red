import { NextResponse } from 'next/server';
import {
  databaseUnavailableJson,
  normalizeEmail,
  parseJsonBody,
  resolvePostLoginRedirect,
} from '@/lib/auth/api';
import { ensureDb, loginWithCredentials } from '@/lib/auth/service';
import { destroySessionOnResponse, saveSessionOnResponse } from '@/lib/session';
import { enforceRateLimit } from '@/lib/security/rate-limit';
import { logSecurityEvent } from '@/lib/security/logger';

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, {
    bucket: 'auth:login',
    limit: 10,
    windowSec: 900,
  });
  if (limited) return limited;

  if (!ensureDb()) return databaseUnavailableJson();

  try {
    const body = await parseJsonBody<{
      email?: string;
      password?: string;
      next?: string;
      redirect?: string;
    }>(request);
    const email = normalizeEmail(body.email);
    const password = body.password ?? '';
    const next = body.next || body.redirect;

    if (!email || !password) {
      return NextResponse.json({ error: 'missing_credentials' }, { status: 400 });
    }

    const result = await loginWithCredentials(email, password);

    if (!result.ok) {
      logSecurityEvent('auth_failure', 'Login fallido', {
        email,
        code: result.code,
      });
      const status = result.code === 'unverified' ? 403 : 401;
      return NextResponse.json(
        { error: result.code, email: result.email },
        { status },
      );
    }

    const response = NextResponse.json({
      ok: true,
      redirect: resolvePostLoginRedirect(next, result.rol),
    });
    await destroySessionOnResponse(request, response);
    await saveSessionOnResponse(request, response, result.usuario);

    return response;
  } catch (error) {
    console.error('POST /api/auth/login:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

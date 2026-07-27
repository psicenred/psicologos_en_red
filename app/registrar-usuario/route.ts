import { NextResponse } from 'next/server';
import {
  authMessageBox,
  databaseUnavailableResponse,
  parseFormBody,
  redirectGet,
} from '@/lib/auth/api';
import { ensureDb, registerUsuario } from '@/lib/auth/service';
import { enforceRateLimit } from '@/lib/security/rate-limit';
import { getRequestClientIp, verifyTurnstileToken } from '@/lib/security/turnstile';

function wantsJson(request: Request): boolean {
  return request.headers.get('accept')?.includes('application/json') ?? false;
}

export async function POST(request: Request) {
  const json = wantsJson(request);

  const limited = await enforceRateLimit(request, {
    bucket: 'auth:register',
    limit: 5,
    windowSec: 900,
  });
  if (limited) {
    if (json) {
      return NextResponse.json(
        {
          ok: false,
          code: 'RATE_LIMITED',
          error: 'Demasiados intentos de registro. Intenta de nuevo más tarde.',
        },
        {
          status: 429,
          headers: { 'Retry-After': '900' },
        },
      );
    }
    return limited;
  }

  if (!ensureDb()) {
    if (json) {
      return NextResponse.json(
        { ok: false, code: 'DB_UNAVAILABLE', error: 'Base de datos no configurada' },
        { status: 503 },
      );
    }
    return databaseUnavailableResponse();
  }

  try {
    const body = await parseFormBody(request);

    const captcha = await verifyTurnstileToken(
      typeof body.cf_turnstile_response === 'string'
        ? body.cf_turnstile_response
        : typeof body['cf-turnstile-response'] === 'string'
          ? body['cf-turnstile-response']
          : null,
      getRequestClientIp(request),
    );
    if (!captcha.ok) {
      if (json) {
        return NextResponse.json(
          { ok: false, code: 'CAPTCHA_FAILED', error: captcha.error },
          { status: 400 },
        );
      }
      return authMessageBox({
        variant: 'error',
        title: 'CAPTCHA',
        body: captcha.error,
        actionHtml: '<a href="/registro">Volver al registro</a>',
      });
    }

    const result = await registerUsuario(body);

    if ('redirect' in result) {
      if (json) {
        return NextResponse.json(
          { ok: true, redirect: result.redirect },
          {
            status: 200,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
          },
        );
      }
      return redirectGet(new URL(result.redirect, request.url));
    }

    if (json) {
      return NextResponse.json(
        {
          ok: false,
          code: result.error.code,
          error: result.error.body,
          title: result.error.title,
        },
        { status: result.error.status },
      );
    }

    return authMessageBox({
      variant: 'error',
      title: result.error.title,
      body: result.error.body,
      actionHtml: '<a href="/login">Ir al Login</a>',
    });
  } catch (error) {
    console.error('POST /registrar-usuario:', error);
    if (json) {
      return NextResponse.json(
        { ok: false, code: 'SERVER_ERROR', error: 'Error en el registro. Por favor intenta de nuevo.' },
        { status: 500 },
      );
    }
    return new Response('Error en el registro. Por favor intenta de nuevo.', {
      status: 500,
    });
  }
}

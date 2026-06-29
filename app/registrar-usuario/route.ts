import { NextResponse } from 'next/server';
import {
  authMessageBox,
  databaseUnavailableResponse,
  parseFormBody,
  redirectGet,
} from '@/lib/auth/api';
import { ensureDb, registerUsuario } from '@/lib/auth/service';

function wantsJson(request: Request): boolean {
  return request.headers.get('accept')?.includes('application/json') ?? false;
}

export async function POST(request: Request) {
  const json = wantsJson(request);

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

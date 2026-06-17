import { NextResponse } from 'next/server';
import {
  authHtmlResponse,
  databaseUnavailableResponse,
  loginUsuario,
  parseFormBody,
  redirectAfterLogin,
} from '@/lib/auth/api';
import { ensureDb, loginWithCredentials } from '@/lib/auth/service';

export async function POST(request: Request) {
  if (!ensureDb()) return databaseUnavailableResponse();

  try {
    const body = await parseFormBody(request);
    const email = body.email?.trim();
    const password = body.password ?? '';

    if (!email || !password) {
      return authHtmlResponse('Faltan credenciales. <a href="/login">Volver</a>', 400);
    }

    const result = await loginWithCredentials(email, password);

    if ('errorHtml' in result && result.errorHtml) {
      return authHtmlResponse(result.errorHtml, 401);
    }
    if ('unverifiedHtml' in result && result.unverifiedHtml) {
      return result.unverifiedHtml;
    }
    if (!('usuario' in result) || !result.usuario) {
      return authHtmlResponse('Error al iniciar sesión.', 500);
    }

    await loginUsuario(result.usuario);
    return redirectAfterLogin(result.rol, request.url);
  } catch (error) {
    console.error('POST /auth/login:', error);
    return authHtmlResponse('Error en el servidor', 500);
  }
}

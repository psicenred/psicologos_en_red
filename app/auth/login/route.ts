import {
  authHtmlResponse,
  databaseUnavailableResponse,
  parseFormBody,
  redirectAfterLogin,
} from '@/lib/auth/api';
import { ensureDb, loginWithCredentials } from '@/lib/auth/service';
import { getSessionOptions, type SessionData } from '@/lib/session';
import { getIronSession } from 'iron-session';

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

    const response = redirectAfterLogin(result.rol, request.url);
    const session = await getIronSession<SessionData>(
      request,
      response,
      getSessionOptions(),
    );
    session.usuario = result.usuario;
    await session.save();
    return response;
  } catch (error) {
    console.error('POST /auth/login:', error);
    return authHtmlResponse('Error en el servidor', 500);
  }
}

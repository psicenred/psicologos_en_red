import {
  databaseUnavailableResponse,
  parseFormBody,
  redirectGet,
} from '@/lib/auth/api';
import { ensureDb, registerUsuario } from '@/lib/auth/service';

export async function POST(request: Request) {
  if (!ensureDb()) return databaseUnavailableResponse();

  try {
    const body = await parseFormBody(request);
    const result = await registerUsuario(body);

    if ('redirect' in result && result.redirect) {
      return redirectGet(new URL(result.redirect, request.url));
    }

    return result as Response;
  } catch (error) {
    console.error('POST /registrar-usuario:', error);
    return new Response('Error en el registro. Por favor intenta de nuevo.', {
      status: 500,
    });
  }
}

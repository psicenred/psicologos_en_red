import {
  authHtmlResponse,
  authMessageBox,
  databaseUnavailableResponse,
  normalizeEmail,
  parseFormBody,
  redirectAfterLogin,
} from '@/lib/auth/api';
import { ensureDb, loginWithCredentials } from '@/lib/auth/service';
import { setSessionUsuario } from '@/lib/session';

export async function POST(request: Request) {
  if (!ensureDb()) return databaseUnavailableResponse();

  try {
    const body = await parseFormBody(request);
    const email = normalizeEmail(body.email);
    const password = body.password ?? '';

    if (!email || !password) {
      return authHtmlResponse('Faltan credenciales. <a href="/login">Volver</a>', 400);
    }

    const result = await loginWithCredentials(email, password);

    if (!result.ok) {
      if (result.code === 'unverified') {
        return authMessageBox({
          variant: 'warning',
          title: '⚠️ Correo no verificado',
          body: 'Necesitas verificar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada (y spam).',
          actionHtml: `
            <a href="/reenviar-verificacion?email=${encodeURIComponent(result.email || email)}" style="display: inline-block; margin-top: 15px; padding: 10px 25px; background: #ffc107; color: #856404; text-decoration: none; border-radius: 5px; font-weight: bold;">Reenviar correo de verificación</a>
            <br><br>
            <a href="/login" style="color: #856404;">Volver al login</a>
          `,
        });
      }
      if (result.code === 'user_not_found') {
        return authHtmlResponse(
          'Usuario no encontrado. <a href="/registro">Regístrate</a>',
          401,
        );
      }
      return authHtmlResponse('Contraseña incorrecta. <a href="/login">Volver</a>', 401);
    }

    await setSessionUsuario(result.usuario);
    return redirectAfterLogin(result.rol, request.url);
  } catch (error) {
    console.error('POST /auth/login:', error);
    return authHtmlResponse('Error en el servidor', 500);
  }
}

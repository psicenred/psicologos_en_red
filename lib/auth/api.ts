import { NextResponse } from 'next/server';
import {
  getSession,
  getSessionFromRequest,
  setSessionUsuario,
  updateSessionNombre,
  type SessionUsuario,
} from '@/lib/session';
import { getPsicologoIdFromUsuarioId } from '@/lib/psicologo/id';

export async function getAuthUsuario(request?: Request): Promise<SessionUsuario | null> {
  const session = request ? await getSessionFromRequest(request) : await getSession();
  return session.usuario ?? null;
}

export function unauthorizedJson() {
  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
}

/** Tras un POST, usar 303 para que el navegador haga GET (307 conservaría POST). */
export function redirectGet(url: URL) {
  return NextResponse.redirect(url, 303);
}

export function redirectToLogin(requestUrl: string) {
  return redirectGet(new URL('/login', requestUrl));
}

export async function requireAuthUsuario(
  request?: Request,
): Promise<SessionUsuario | NextResponse> {
  const usuario = await getAuthUsuario(request);
  if (!usuario) return unauthorizedJson();
  return usuario;
}

export async function loginUsuario(usuario: SessionUsuario) {
  await setSessionUsuario(usuario);
}

export async function touchSessionNombre(nombre: string) {
  await updateSessionNombre(nombre);
}

export function normalizeRol(rol: string | null | undefined): string {
  return (rol || '').trim().toLowerCase();
}

export function normalizeEmail(email: string | null | undefined): string {
  return (email || '').trim().toLowerCase();
}

export function redirectAfterLogin(rol: string, base: string) {
  if (rol === 'admin') return redirectGet(new URL('/panel-admin', base));
  if (rol === 'psicologo') {
    return redirectGet(new URL('/panel-doctor', base));
  }
  return redirectGet(new URL('/perfil', base));
}

export function loginRedirectPath(rol: string): string {
  if (rol === 'admin') return '/panel-admin';
  if (rol === 'psicologo') return '/panel-doctor';
  return '/perfil';
}

/** HTML inline (paridad con legacy) para respuestas de verificación / errores auth. */
export function authHtmlResponse(html: string, status = 200) {
  return new NextResponse(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export function authMessageBox(options: {
  title: string;
  body: string;
  variant: 'success' | 'warning' | 'error';
  actionHtml?: string;
}) {
  const styles = {
    success: { bg: '#d4edda', color: '#155724' },
    warning: { bg: '#fff3cd', color: '#856404' },
    error: { bg: '#f8d7da', color: '#721c24' },
  }[options.variant];

  return authHtmlResponse(`
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 50px auto; padding: 30px; text-align: center; background: ${styles.bg}; border-radius: 10px;">
      <h2 style="color: ${styles.color};">${options.title}</h2>
      <p style="color: ${styles.color};">${options.body}</p>
      ${options.actionHtml ?? ''}
    </div>
  `);
}

export async function parseFormBody(
  request: Request,
): Promise<Record<string, string>> {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const json = (await request.json()) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(json).map(([k, v]) => [k, v == null ? '' : String(v)]),
    );
  }
  const form = await request.formData();
  const out: Record<string, string> = {};
  form.forEach((value, key) => {
    out[key] = String(value);
  });
  return out;
}

export function databaseUnavailableResponse() {
  return authHtmlResponse(
    `<h1>Servicio temporalmente no disponible</h1><p>La base de datos aún no está configurada. Completa DATABASE_URL en .env (ver MIGRATION.md §11b).</p><a href="/">Volver al inicio</a>`,
    503,
  );
}

export function databaseUnavailableJson() {
  return NextResponse.json(
    { error: 'Base de datos no configurada' },
    { status: 503 },
  );
}

export function forbiddenJson(message = 'No autorizado') {
  return NextResponse.json({ error: message }, { status: 403 });
}

export async function requireAdmin(
  request?: Request,
): Promise<SessionUsuario | NextResponse> {
  const usuario = await getAuthUsuario(request);
  if (!usuario) return unauthorizedJson();
  if (normalizeRol(usuario.rol) !== 'admin') return forbiddenJson('Solo administradores');
  return usuario;
}

export async function requirePsicologo(
  request?: Request,
): Promise<SessionUsuario | NextResponse> {
  const usuario = await getAuthUsuario(request);
  if (!usuario) return unauthorizedJson();
  if (normalizeRol(usuario.rol) !== 'psicologo') return forbiddenJson('Acceso denegado');
  return usuario;
}

/** Psicólogo autenticado + id en tabla psicologos. */
export async function requirePsicologoId(
  request?: Request,
): Promise<
  { usuario: SessionUsuario; psicologoId: number } | NextResponse
> {
  const auth = await requirePsicologo(request);
  if (auth instanceof NextResponse) return auth;
  const psicologoId = await getPsicologoIdFromUsuarioId(auth.id);
  if (!psicologoId) {
    return NextResponse.json(
      { error: 'Perfil de psicólogo no encontrado' },
      { status: 404 },
    );
  }
  return { usuario: auth, psicologoId };
}

export async function parseJsonBody<T extends Record<string, unknown>>(
  request: Request,
): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    return {} as T;
  }
}

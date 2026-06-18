import 'server-only';

import { normalizeRol } from '@/lib/auth/api';
import { getSession, type SessionUsuario } from '@/lib/session';

export async function getSessionUsuario(): Promise<SessionUsuario | null> {
  const session = await getSession();
  return session.usuario ?? null;
}

export async function requireSessionUsuario(): Promise<SessionUsuario | null> {
  return getSessionUsuario();
}

export function isAdmin(usuario: SessionUsuario): boolean {
  return normalizeRol(usuario.rol) === 'admin';
}

export function isPsicologo(usuario: SessionUsuario): boolean {
  return normalizeRol(usuario.rol) === 'psicologo';
}

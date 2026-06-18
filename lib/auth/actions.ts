'use server';

import { redirect } from 'next/navigation';
import { loginRedirectPath, normalizeEmail } from '@/lib/auth/api';
import { ensureDb, loginWithCredentials } from '@/lib/auth/service';
import { destroySession, setSessionUsuario } from '@/lib/session';

function safeRedirectPath(next: string | null | undefined, fallback: string): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return fallback;
  return next;
}

export type LoginActionResult = {
  error?: string;
  email?: string;
};

export async function loginAction(formData: FormData): Promise<LoginActionResult> {
  if (!ensureDb()) return { error: 'db_unavailable' };

  const email = normalizeEmail(String(formData.get('email') ?? ''));
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '');

  if (!email || !password) {
    return { error: 'missing_credentials' };
  }

  const result = await loginWithCredentials(email, password);
  if (!result.ok) {
    return { error: result.code, email: result.email };
  }

  await destroySession();
  await setSessionUsuario(result.usuario);

  redirect(safeRedirectPath(next, loginRedirectPath(result.rol)));
}

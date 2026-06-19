'use server';

import { redirect } from 'next/navigation';
import { normalizeEmail, resolvePostLoginRedirect } from '@/lib/auth/api';
import { ensureDb, loginWithCredentials } from '@/lib/auth/service';
import { destroySession, setSessionUsuario } from '@/lib/session';

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

  redirect(resolvePostLoginRedirect(next, result.rol));
}

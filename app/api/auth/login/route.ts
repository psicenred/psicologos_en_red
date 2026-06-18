import { NextResponse } from 'next/server';
import {
  databaseUnavailableJson,
  loginRedirectPath,
  normalizeEmail,
  parseJsonBody,
} from '@/lib/auth/api';
import { ensureDb, loginWithCredentials } from '@/lib/auth/service';
import { setSessionUsuario } from '@/lib/session';

export async function POST(request: Request) {
  if (!ensureDb()) return databaseUnavailableJson();

  try {
    const body = await parseJsonBody<{ email?: string; password?: string }>(request);
    const email = normalizeEmail(body.email);
    const password = body.password ?? '';

    if (!email || !password) {
      return NextResponse.json({ error: 'missing_credentials' }, { status: 400 });
    }

    const result = await loginWithCredentials(email, password);

    if (!result.ok) {
      const status = result.code === 'unverified' ? 403 : 401;
      return NextResponse.json(
        { error: result.code, email: result.email },
        { status },
      );
    }

    await setSessionUsuario(result.usuario);

    return NextResponse.json({
      ok: true,
      redirect: loginRedirectPath(result.rol),
    });
  } catch (error) {
    console.error('POST /api/auth/login:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

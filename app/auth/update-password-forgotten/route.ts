import { NextResponse } from 'next/server';
import {
  databaseUnavailableJson,
  parseFormBody,
} from '@/lib/auth/api';
import { ensureDb, updatePasswordWithToken } from '@/lib/auth/service';

export async function POST(request: Request) {
  if (!ensureDb()) return databaseUnavailableJson();

  try {
    const body = await parseFormBody(request);
    const token = body.token?.trim();
    const password = body.password ?? '';

    if (!token || !password) {
      return NextResponse.json({ error: 'Faltan datos.' }, { status: 400 });
    }

    const result = await updatePasswordWithToken(token, password);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /auth/update-password-forgotten:', error);
    return NextResponse.json(
      { error: 'Error al actualizar la contraseña.' },
      { status: 500 },
    );
  }
}

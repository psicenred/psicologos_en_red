import { NextResponse } from 'next/server';
import {
  requireAuthUsuario,
  touchSessionNombre,
} from '@/lib/auth/api';
import { updateUsuarioProfile } from '@/lib/auth/service';
import { isDatabaseConfigured, query } from '@/lib/db';

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 503 });
  }
  const auth = await requireAuthUsuario(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as {
      nombre?: string;
      telefono?: string;
      contacto_emergencia?: string;
      password?: string;
    };

    const userRow = await query<{ nombre: string }>(
      'SELECT nombre FROM usuarios WHERE id = $1',
      [auth.id],
    );
    const currentNombre = userRow.rows[0]?.nombre ?? auth.nombre;

    const input: {
      nombre: string;
      telefono?: string | null;
      contacto_emergencia?: string | null;
      password?: string;
    } = {
      nombre: body.nombre ?? currentNombre,
      telefono: body.telefono ?? null,
      password: body.password,
    };

    if ('contacto_emergencia' in body) {
      input.contacto_emergencia = body.contacto_emergencia ?? null;
    }

    const result = await updateUsuarioProfile(auth.id, currentNombre, input);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await touchSessionNombre(input.nombre.trim() || currentNombre);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/update-profile:', error);
    return NextResponse.json(
      { error: 'Error interno: ' + (error as Error).message },
      { status: 500 },
    );
  }
}

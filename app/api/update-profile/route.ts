import { NextResponse } from 'next/server';
import {
  requireAuthUsuario,
  touchSessionNombre,
} from '@/lib/auth/api';
import { isDatabaseConfigured, query } from '@/lib/db';
import bcrypt from 'bcrypt';

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 503 });
  }
  const auth = await requireAuthUsuario();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as {
      nombre?: string;
      telefono?: string;
      contacto_emergencia?: string;
      password?: string;
    };

    const nombre = body.nombre ?? auth.nombre;
    const telefono = body.telefono ?? null;
    const contactoEmerg =
      body.contacto_emergencia != null &&
      String(body.contacto_emergencia).trim() !== ''
        ? String(body.contacto_emergencia).trim().slice(0, 255)
        : null;
    const password = body.password;

    if (password && password.trim() !== '' && password !== '********') {
      const hashedPassword = await bcrypt.hash(password, 10);
      await query(
        'UPDATE usuarios SET nombre = $1, telefono = $2, contacto_emergencia = $3, password = $4 WHERE id = $5',
        [nombre, telefono, contactoEmerg, hashedPassword, auth.id],
      );
    } else {
      await query(
        'UPDATE usuarios SET nombre = $1, telefono = $2, contacto_emergencia = $3 WHERE id = $4',
        [nombre, telefono, contactoEmerg, auth.id],
      );
    }

    await touchSessionNombre(nombre);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/update-profile:', error);
    return NextResponse.json(
      { error: 'Error interno: ' + (error as Error).message },
      { status: 500 },
    );
  }
}

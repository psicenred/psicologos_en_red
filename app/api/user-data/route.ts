import { NextResponse } from 'next/server';
import { requireAuthUsuario, unauthorizedJson } from '@/lib/auth/api';
import { isDatabaseConfigured, query } from '@/lib/db';

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) return unauthorizedJson();
  const auth = await requireAuthUsuario(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const result = await query(
      `SELECT u.id AS usuario_id, u.nombre, u.email, u.telefono, u.contacto_emergencia, u.rol, p.id AS psicologo_id
       FROM usuarios u
       LEFT JOIN psicologos p ON u.id = p.usuario_id
       WHERE u.id = $1`,
      [auth.id],
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const user = result.rows[0] as {
      usuario_id: number;
      psicologo_id: number | null;
      nombre: string;
      email: string;
      telefono: string | null;
      contacto_emergencia: string | null;
      rol: string;
    };

    return NextResponse.json({
      id: user.usuario_id,
      psicologo_id: user.psicologo_id,
      nombre: user.nombre,
      email: user.email,
      telefono: user.telefono,
      contacto_emergencia: user.contacto_emergencia || '',
      rol: user.rol,
    });
  } catch (error) {
    console.error('GET /api/user-data:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

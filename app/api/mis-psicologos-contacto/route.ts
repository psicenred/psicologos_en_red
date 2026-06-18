import { NextResponse } from 'next/server';
import { requireAuthUsuario } from '@/lib/auth/api';
import { isDatabaseConfigured, query } from '@/lib/db';

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json([]);
  }
  const auth = await requireAuthUsuario(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const result = await query(
      `SELECT DISTINCT p.id, p.nombre, p.usuario_id
       FROM psicologos p
       JOIN citas c ON p.id = c.psicologo_id
       WHERE c.paciente_id = $1`,
      [auth.id],
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('GET /api/mis-psicologos-contacto:', error);
    return NextResponse.json({ error: 'Error al obtener contactos' }, { status: 500 });
  }
}

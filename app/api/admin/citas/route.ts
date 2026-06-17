import { NextResponse } from 'next/server';
import { databaseUnavailableJson, requireAdmin } from '@/lib/auth/api';
import { marcarCitasNoRealizadas } from '@/lib/citas/no-show';
import { isDatabaseConfigured, query } from '@/lib/db';

export async function GET() {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    await marcarCitasNoRealizadas();
    const result = await query(`
      SELECT c.id, c.fecha, c.hora, c.estado,
             pac.nombre as paciente_nombre, pac.email as paciente_email,
             psi.nombre as psicologo_nombre
      FROM citas c
      JOIN usuarios pac ON c.paciente_id = pac.id
      JOIN psicologos psi ON c.psicologo_id = psi.id
      ORDER BY c.fecha DESC, c.hora DESC
      LIMIT 100
    `);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('GET /api/admin/citas:', error);
    return NextResponse.json(
      { error: 'Error al obtener citas' },
      { status: 500 },
    );
  }
}

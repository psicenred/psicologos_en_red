import { NextResponse } from 'next/server';
import { databaseUnavailableJson, requireAdmin } from '@/lib/auth/api';
import { isDatabaseConfigured, query } from '@/lib/db';

export async function GET() {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const result = await query(`
      SELECT p.id, p.nombre, p.especialidad, u.email, u.telefono, p.usuario_id,
             COALESCE(p.visible_mexico, true) as visible_mexico,
             COALESCE(p.visible_internacional, false) as visible_internacional,
             (SELECT COUNT(*) FROM citas WHERE psicologo_id = p.id) as total_citas,
             (SELECT COUNT(*) FROM citas WHERE psicologo_id = p.id AND fecha = CURRENT_DATE) as citas_hoy,
             COALESCE(p.rating, 0) as calificacion,
             (SELECT COUNT(*) FROM opiniones WHERE psicologo_id = p.id) as total_opiniones,
             (SELECT COUNT(*) FROM opiniones WHERE psicologo_id = p.id AND estrellas < 3) as opiniones_negativas
      FROM psicologos p
      JOIN usuarios u ON p.usuario_id = u.id
      ORDER BY p.nombre
    `);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('GET /api/admin/psicologos:', error);
    return NextResponse.json(
      { error: 'Error al obtener psicólogos' },
      { status: 500 },
    );
  }
}

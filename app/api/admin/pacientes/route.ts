import { NextResponse } from 'next/server';
import { databaseUnavailableJson, requireAdmin } from '@/lib/auth/api';
import { isDatabaseConfigured, query } from '@/lib/db';

export async function GET() {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const result = await query(`
      SELECT u.id, u.nombre, u.email, u.telefono, u.contacto_emergencia, u.acepto_publicidad,
             (SELECT COUNT(*) FROM citas WHERE paciente_id = u.id) as total_citas,
             (SELECT MAX(fecha) FROM citas WHERE paciente_id = u.id AND fecha < CURRENT_DATE) as ultima_cita,
             (SELECT COUNT(*) FROM citas WHERE paciente_id = u.id AND fecha >= CURRENT_DATE AND estado NOT IN ('cancelada')) as citas_futuras,
             (SELECT p.nombre FROM citas c JOIN psicologos p ON p.id = c.psicologo_id WHERE c.paciente_id = u.id ORDER BY c.fecha DESC, c.hora DESC NULLS LAST LIMIT 1) as psicologo,
             (SELECT c.motivo_de_consulta FROM citas c WHERE c.paciente_id = u.id ORDER BY c.fecha DESC, c.hora DESC NULLS LAST LIMIT 1) as motivo_consulta
      FROM usuarios u
      WHERE u.rol = 'paciente'
      ORDER BY u.nombre
      LIMIT 200
    `);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('GET /api/admin/pacientes:', error);
    return NextResponse.json(
      { error: 'Error al obtener pacientes' },
      { status: 500 },
    );
  }
}

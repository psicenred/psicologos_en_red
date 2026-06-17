import { NextResponse } from 'next/server';
import { databaseUnavailableJson, requirePsicologoId } from '@/lib/auth/api';
import { isDatabaseConfigured, query } from '@/lib/db';

export async function GET() {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const auth = await requirePsicologoId();
  if (auth instanceof NextResponse) return auth;

  try {
    const result = await query(
      `SELECT u.id, u.nombre, u.email, u.telefono, u.contacto_emergencia,
              (SELECT COUNT(*) FROM citas WHERE paciente_id = u.id AND psicologo_id = $1) as total_citas,
              (SELECT MAX(fecha) FROM citas WHERE paciente_id = u.id AND psicologo_id = $1 AND fecha < CURRENT_DATE) as ultima_cita,
              (SELECT COUNT(*) FROM citas WHERE paciente_id = u.id AND psicologo_id = $1 AND fecha >= CURRENT_DATE AND estado NOT IN ('cancelada')) as citas_futuras,
              (SELECT c.motivo_de_consulta FROM citas c WHERE c.paciente_id = u.id AND c.psicologo_id = $1 ORDER BY c.fecha DESC, c.hora DESC NULLS LAST LIMIT 1) as motivo_consulta
       FROM usuarios u
       WHERE u.rol = 'paciente'
         AND EXISTS (SELECT 1 FROM citas WHERE paciente_id = u.id AND psicologo_id = $1)
       ORDER BY u.nombre
       LIMIT 200`,
      [auth.psicologoId],
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('GET /api/doctor/pacientes:', error);
    return NextResponse.json(
      { error: 'Error al obtener pacientes' },
      { status: 500 },
    );
  }
}

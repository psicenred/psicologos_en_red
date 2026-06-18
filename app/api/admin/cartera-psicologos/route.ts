import { NextResponse } from 'next/server';
import { databaseUnavailableJson, requireAdmin } from '@/lib/auth/api';
import { isDatabaseConfigured, query } from '@/lib/db';

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const psicologos = await query(
      'SELECT id, nombre FROM psicologos ORDER BY nombre',
    );
    const resultado = [];

    for (const psi of psicologos.rows as { id: number; nombre: string }[]) {
      const conCita = await query(
        `SELECT COUNT(DISTINCT paciente_id) as total
         FROM citas
         WHERE psicologo_id = $1 AND fecha >= CURRENT_DATE AND estado NOT IN ('cancelada')`,
        [psi.id],
      );
      const enSeguimiento = await query(
        `SELECT COUNT(*) as total FROM (
           SELECT paciente_id, MAX(fecha) as ultima
           FROM citas WHERE psicologo_id = $1 AND fecha < CURRENT_DATE
           GROUP BY paciente_id
           HAVING MAX(fecha) >= CURRENT_DATE - INTERVAL '15 days'
         ) sub
         WHERE paciente_id NOT IN (
           SELECT DISTINCT paciente_id FROM citas
           WHERE psicologo_id = $1 AND fecha >= CURRENT_DATE AND estado NOT IN ('cancelada')
         )`,
        [psi.id],
      );
      const enRiesgo = await query(
        `SELECT COUNT(*) as total FROM (
           SELECT paciente_id, MAX(fecha) as ultima
           FROM citas WHERE psicologo_id = $1
           GROUP BY paciente_id
           HAVING MAX(fecha) < CURRENT_DATE - INTERVAL '30 days'
         ) sub
         WHERE paciente_id NOT IN (
           SELECT DISTINCT paciente_id FROM citas
           WHERE psicologo_id = $1 AND fecha >= CURRENT_DATE AND estado NOT IN ('cancelada')
         )`,
        [psi.id],
      );

      resultado.push({
        id: psi.id,
        nombre: psi.nombre,
        con_cita: parseInt(String(conCita.rows[0]?.total), 10) || 0,
        en_seguimiento:
          parseInt(String(enSeguimiento.rows[0]?.total), 10) || 0,
        en_riesgo: parseInt(String(enRiesgo.rows[0]?.total), 10) || 0,
      });
    }

    return NextResponse.json(resultado);
  } catch (error) {
    console.error('GET /api/admin/cartera-psicologos:', error);
    return NextResponse.json(
      { error: 'Error al obtener datos' },
      { status: 500 },
    );
  }
}

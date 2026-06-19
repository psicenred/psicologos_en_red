import { NextResponse } from 'next/server';
import { requireAuthUsuario } from '@/lib/auth/api';
import { SQL_CITA_INSTANT_ISO_C } from '@/lib/citas/cita-timing';
import { marcarCitasNoRealizadas } from '@/lib/citas/no-show';
import { isDatabaseConfigured, query } from '@/lib/db';

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 503 });
  }
  const auth = await requireAuthUsuario(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await marcarCitasNoRealizadas();

    let result;
    try {
      result = await query(
        `SELECT c.id, c.fecha, c.hora, c.estado, c.link_sesion, c.psicologo_id, p.nombre as psicologo_nombre,
                ${SQL_CITA_INSTANT_ISO_C} AS fecha_hora_utc, c.zona_horaria
         FROM citas c
         JOIN psicologos p ON c.psicologo_id = p.id
         WHERE c.paciente_id = $1
         ORDER BY c.fecha ASC, c.hora ASC`,
        [auth.id],
      );
    } catch (e) {
      const msg = (e as Error).message || '';
      if (msg.includes('zona_horaria') || msg.includes('fecha_hora_utc')) {
        result = await query(
          `SELECT c.id, c.fecha, c.hora, c.estado, c.link_sesion, c.psicologo_id, p.nombre as psicologo_nombre
           FROM citas c JOIN psicologos p ON c.psicologo_id = p.id
           WHERE c.paciente_id = $1 ORDER BY c.fecha ASC, c.hora ASC`,
          [auth.id],
        );
      } else {
        throw e;
      }
    }

    const rows = result.rows.map((r) => {
      const row = r as Record<string, unknown>;
      return {
        ...row,
        fecha_hora_utc: row.fecha_hora_utc
          ? row.fecha_hora_utc instanceof Date
            ? row.fecha_hora_utc.toISOString()
            : row.fecha_hora_utc
          : null,
      };
    });

    return NextResponse.json(rows);
  } catch (error) {
    console.error('GET /api/mis-citas-paciente:', error);
    return NextResponse.json({ error: 'Error al obtener citas' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { databaseUnavailableJson, requireAuthUsuario } from '@/lib/auth/api';
import { marcarCitasNoRealizadas } from '@/lib/citas/no-show';
import { SQL_CITA_INSTANT_ISO_C } from '@/lib/citas/cita-timing';
import { decryptMensajeContenido } from '@/lib/crypto/messages';
import { isDatabaseConfigured, query } from '@/lib/db';

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const auth = await requireAuthUsuario(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await marcarCitasNoRealizadas();

    const sqlConTz = `
      SELECT
        c.id AS cita_id,
        c.fecha,
        c.hora,
        c.estado,
        c.link_sesion,
        c.notas,
        c.motivo_de_consulta AS motivo,
        u.nombre AS paciente_nombre,
        u.id AS paciente_usuario_id,
        u.id AS id_para_chat,
        ${SQL_CITA_INSTANT_ISO_C} AS fecha_hora_utc,
        COALESCE(NULLIF(TRIM(p.zona_horaria), ''), 'America/Mexico_City') AS zona_horaria_psicologo
      FROM citas c
      JOIN vista_psicologos v ON c.psicologo_id = v.psicologo_id_tabla
      JOIN psicologos p ON c.psicologo_id = p.id
      JOIN usuarios u ON c.paciente_id = u.id
      WHERE v.usuario_id = $1
      ORDER BY c.fecha ASC, c.hora ASC`;

    let result;
    try {
      result = await query(sqlConTz, [auth.id]);
    } catch (e) {
      const msg = (e as Error).message || '';
      if (msg.includes('zona_horaria') || msg.includes('fecha_hora_utc')) {
        result = await query(
          `SELECT c.id AS cita_id, c.fecha, c.hora, c.estado, c.link_sesion, c.notas,
                  c.motivo_de_consulta AS motivo,
                  u.nombre AS paciente_nombre, u.id AS paciente_usuario_id, u.id AS id_para_chat
           FROM citas c
           JOIN vista_psicologos v ON c.psicologo_id = v.psicologo_id_tabla
           JOIN usuarios u ON c.paciente_id = u.id
           WHERE v.usuario_id = $1
           ORDER BY c.fecha ASC, c.hora ASC`,
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
        notas: decryptMensajeContenido(String(row.notas ?? '')),
        fecha_hora_utc: row.fecha_hora_utc
          ? row.fecha_hora_utc instanceof Date
            ? row.fecha_hora_utc.toISOString()
            : row.fecha_hora_utc
          : null,
      };
    });

    return NextResponse.json(rows);
  } catch (error) {
    console.error('GET /api/mis-citas-doctor:', error);
    return new NextResponse('Error', { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { databaseUnavailableJson, requireAdmin } from '@/lib/auth/api';
import { ZONA_HORARIA_DEFECTO } from '@/lib/citas/availability';
import { marcarCitasNoRealizadas } from '@/lib/citas/no-show';
import { isDatabaseConfigured, query } from '@/lib/db';

type CitaPendiente = {
  id: number;
  fecha: unknown;
  hora: unknown;
  zona_horaria: string;
  fecha_hora_utc: string | null;
  cita_utc?: string | null;
  minutos_desde_ahora: number | null;
  dispararia_ahora: boolean;
};

export async function GET() {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    await marcarCitasNoRealizadas();

    const nowUtc = await query('SELECT NOW() AS servidor_utc');
    const rawServidor = (nowUtc.rows[0] as { servidor_utc?: Date | string })
      ?.servidor_utc;
    const servidorIso =
      rawServidor instanceof Date
        ? rawServidor.toISOString()
        : String(rawServidor || '');

    let pendientes: CitaPendiente[] = [];
    let usaFechaHoraUtc = true;

    try {
      const r = await query(
        `
        SELECT c.id, c.fecha, c.hora, c.zona_horaria, c.fecha_hora_utc,
          COALESCE(
            EXTRACT(EPOCH FROM (NULLIF(TRIM(c.fecha_hora_utc), '')::timestamptz - NOW())) / 60,
            EXTRACT(EPOCH FROM (((c.fecha + c.hora) AT TIME ZONE COALESCE(NULLIF(TRIM(c.zona_horaria), ''), $1)) - NOW())) / 60
          ) AS minutos_desde_ahora
        FROM citas c
        WHERE c.estado IN ('pendiente', 'confirmada') AND c.recordatorio_enviado_at IS NULL
        ORDER BY c.fecha, c.hora
      `,
        [ZONA_HORARIA_DEFECTO],
      );

      pendientes = r.rows.map((row) => {
        const rRow = row as Record<string, unknown>;
        const min =
          rRow.minutos_desde_ahora != null
            ? Number(rRow.minutos_desde_ahora)
            : null;
        const fechaHoraUtc = rRow.fecha_hora_utc;
        return {
          id: rRow.id as number,
          fecha: rRow.fecha,
          hora: rRow.hora,
          zona_horaria: String(rRow.zona_horaria || '(null)'),
          fecha_hora_utc:
            fechaHoraUtc instanceof Date
              ? fechaHoraUtc.toISOString()
              : ((fechaHoraUtc as string | null) ?? null),
          minutos_desde_ahora: min != null ? Math.round(min) : null,
          dispararia_ahora: min != null && min >= 25 && min <= 35,
        };
      });
    } catch (e) {
      const msg = (e as Error).message || '';
      if (
        msg.includes('fecha_hora_utc') ||
        msg.includes('zona_horaria') ||
        msg.includes('does not exist')
      ) {
        usaFechaHoraUtc = false;
        try {
          const r = await query(
            `
            SELECT c.id, c.fecha, c.hora, c.zona_horaria,
              ((c.fecha + c.hora) AT TIME ZONE COALESCE(NULLIF(TRIM(c.zona_horaria), ''), $1)) AS cita_utc,
              EXTRACT(EPOCH FROM (((c.fecha + c.hora) AT TIME ZONE COALESCE(NULLIF(TRIM(c.zona_horaria), ''), $1)) - NOW())) / 60 AS minutos_desde_ahora
            FROM citas c
            WHERE c.estado IN ('pendiente', 'confirmada') AND c.recordatorio_enviado_at IS NULL
            ORDER BY c.fecha, c.hora
          `,
            [ZONA_HORARIA_DEFECTO],
          );

          pendientes = r.rows.map((row) => {
            const rRow = row as Record<string, unknown>;
            const min =
              rRow.minutos_desde_ahora != null
                ? Math.round(Number(rRow.minutos_desde_ahora))
                : null;
            const citaUtc = rRow.cita_utc;
            return {
              id: rRow.id as number,
              fecha: rRow.fecha,
              hora: rRow.hora,
              zona_horaria: String(rRow.zona_horaria || '(null)'),
              fecha_hora_utc: null,
              cita_utc:
                citaUtc instanceof Date
                  ? citaUtc.toISOString()
                  : ((citaUtc as string | null) ?? null),
              minutos_desde_ahora: min,
              dispararia_ahora: min != null && min >= 25 && min <= 35,
            };
          });
        } catch (e2) {
          const msg2 = (e2 as Error).message || '';
          if (
            msg2.includes('zona_horaria') ||
            msg2.includes('does not exist')
          ) {
            const r = await query(`
              SELECT c.id, c.fecha, c.hora,
                (c.fecha + c.hora) AS cita_sin_tz,
                EXTRACT(EPOCH FROM ((c.fecha + c.hora) - NOW())) / 60 AS minutos_desde_ahora
              FROM citas c
              WHERE c.estado IN ('pendiente', 'confirmada') AND c.recordatorio_enviado_at IS NULL
              ORDER BY c.fecha, c.hora
            `);

            pendientes = r.rows.map((row) => {
              const rRow = row as Record<string, unknown>;
              const min =
                rRow.minutos_desde_ahora != null
                  ? Math.round(Number(rRow.minutos_desde_ahora))
                  : null;
              return {
                id: rRow.id as number,
                fecha: rRow.fecha,
                hora: rRow.hora,
                zona_horaria: '(columna no existe)',
                fecha_hora_utc: null,
                cita_utc:
                  rRow.cita_sin_tz != null ? String(rRow.cita_sin_tz) : null,
                minutos_desde_ahora: min,
                dispararia_ahora: min != null && min >= 25 && min <= 35,
              };
            });
          } else {
            throw e2;
          }
        }
      } else {
        throw e;
      }
    }

    const soloFuturas = pendientes.filter(
      (c) => c.minutos_desde_ahora != null && c.minutos_desde_ahora > 0,
    );

    return NextResponse.json({
      servidor_utc_iso: servidorIso,
      usa_fecha_hora_utc: usaFechaHoraUtc,
      explicacion:
        'El job usa fecha_hora_utc (ventana 25-35 min). Candidatas = citas con fecha_hora_utc NOT NULL y minutos_desde_ahora > 0.',
      citas_pendientes_sin_recordatorio: pendientes,
      candidatas_futuras_log: soloFuturas,
      citas_que_dispararian_ahora: pendientes.filter((c) => c.dispararia_ahora),
    });
  } catch (error) {
    console.error('GET /api/debug/recordatorios:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Error interno' },
      { status: 500 },
    );
  }
}

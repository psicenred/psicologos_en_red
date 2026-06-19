import { DURACION_SESION_MINUTOS } from '@/lib/citas/cita-timing';
import { query } from '@/lib/db';

/** Marca no realizada solo después de terminar la hora de sesión (60 min desde inicio). */
export async function marcarCitasNoRealizadas(): Promise<void> {
  try {
    await query(
      `UPDATE citas c SET estado = 'no realizada'
       WHERE c.estado IN ('pendiente', 'confirmada')
         AND (
           (c.fecha_hora_utc IS NOT NULL AND c.fecha_hora_utc != ''
            AND (c.fecha_hora_utc::timestamptz) + INTERVAL '1 minute' * $1 < NOW())
           OR (
             (c.fecha_hora_utc IS NULL OR c.fecha_hora_utc = '')
             AND ((c.fecha + c.hora) AT TIME ZONE COALESCE(NULLIF(TRIM(c.zona_horaria), ''), $2))
                 + INTERVAL '1 minute' * $1 < NOW()
           )
         )`,
      [DURACION_SESION_MINUTOS, 'America/Mexico_City'],
    );
  } catch (e) {
    const msg = (e as Error).message || '';
    if (msg.includes('zona_horaria') || msg.includes('fecha_hora_utc') || msg.includes('does not exist')) {
      await query(
        `UPDATE citas SET estado = 'no realizada'
         WHERE estado IN ('pendiente', 'confirmada')
           AND (fecha + hora) + INTERVAL '1 minute' * $1 < NOW()`,
        [DURACION_SESION_MINUTOS],
      );
    }
  }
}

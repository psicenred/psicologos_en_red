import { query } from '@/lib/db';

export async function marcarCitasNoRealizadas(): Promise<void> {
  const MINUTOS_GRACIA = 15;
  try {
    await query(
      `UPDATE citas c SET estado = 'no realizada'
       WHERE c.estado IN ('pendiente', 'confirmada')
         AND ((c.fecha + c.hora) AT TIME ZONE COALESCE(NULLIF(TRIM(c.zona_horaria), ''), $1)) + INTERVAL '1 minute' * $2 < NOW()`,
      ['America/Mexico_City', MINUTOS_GRACIA],
    );
  } catch (e) {
    const msg = (e as Error).message || '';
    if (msg.includes('zona_horaria') || msg.includes('does not exist')) {
      await query(
        `UPDATE citas SET estado = 'no realizada'
         WHERE estado IN ('pendiente', 'confirmada')
           AND (fecha + hora) + INTERVAL '1 minute' * $1 < NOW()`,
        [MINUTOS_GRACIA],
      );
    }
  }
}

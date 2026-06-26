import { query } from '@/lib/db';
import { ZONA_HORARIA_DEFECTO } from '@/lib/citas/constants';

export { ZONA_HORARIA_DEFECTO };

export async function getDisponibilidadCalendario(psicologoId: number) {
  const horarioResult = await query(
    `SELECT DISTINCT dia_semana FROM horario_laboral WHERE psicologo_id = $1`,
    [psicologoId],
  );
  const diasLaborales = horarioResult.rows.map(
    (r) => (r as { dia_semana: number }).dia_semana,
  );
  const todosDias = [0, 1, 2, 3, 4, 5, 6];
  const diasNoLaborales = todosDias.filter((d) => !diasLaborales.includes(d));

  const vacacionesResult = await query(
    `SELECT fecha_inicio, fecha_fin FROM vacaciones
     WHERE psicologo_id = $1
     AND (fecha_fin >= CURRENT_DATE OR fecha_inicio >= CURRENT_DATE)`,
    [psicologoId],
  );

  const fechasBloqueadas: string[] = [];
  for (const vac of vacacionesResult.rows) {
    const row = vac as { fecha_inicio: Date | string; fecha_fin?: Date | string };
    let current = new Date(row.fecha_inicio);
    const end = new Date(row.fecha_fin || row.fecha_inicio);
    while (current <= end) {
      fechasBloqueadas.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
  }

  return { diasNoLaborales, fechasBloqueadas };
}

export async function getZonaHorariaPsicologo(
  psicologoId: number,
): Promise<string> {
  try {
    const tzRow = await query(
      'SELECT zona_horaria FROM psicologos WHERE id = $1',
      [psicologoId],
    );
    const z = (tzRow.rows[0] as { zona_horaria?: string } | undefined)
      ?.zona_horaria;
    if (z && String(z).trim()) return String(z).trim();
  } catch (e) {
    const msg = (e as Error).message || '';
    if (!msg.includes('zona_horaria')) console.error('Error zona horario:', msg);
  }
  return ZONA_HORARIA_DEFECTO;
}

export async function getHorariosDisponibles(
  psicologoId: number,
  fecha: string,
) {
  const zonaHoraria = await getZonaHorariaPsicologo(psicologoId);
  const fechaDate = new Date(fecha + 'T12:00:00');
  const diaSemana = fechaDate.getDay();

  const vacacionesResult = await query(
    `SELECT id FROM vacaciones
     WHERE psicologo_id = $1
     AND $2::date BETWEEN fecha_inicio AND COALESCE(fecha_fin, fecha_inicio)`,
    [psicologoId, fecha],
  );
  if (vacacionesResult.rows.length > 0) {
    return {
      disponible: false,
      horarios: [] as string[],
      horarios_iso: [] as string[],
      mensaje: 'El psicólogo no está disponible en esta fecha',
      zona_horaria: zonaHoraria,
    };
  }

  const horarioResult = await query(
    `SELECT hora_inicio, hora_fin FROM horario_laboral
     WHERE psicologo_id = $1 AND dia_semana = $2
     ORDER BY hora_inicio`,
    [psicologoId, diaSemana],
  );

  if (horarioResult.rows.length === 0) {
    return {
      disponible: false,
      horarios: [] as string[],
      horarios_iso: [] as string[],
      mensaje: 'El psicólogo no trabaja este día',
      zona_horaria: zonaHoraria,
    };
  }

  let horariosDisponibles: string[] = [];
  for (const bloque of horarioResult.rows) {
    const b = bloque as { hora_inicio: string; hora_fin: string };
    let horaActual = parseInt(b.hora_inicio.split(':')[0], 10);
    const horaFin = parseInt(b.hora_fin.split(':')[0], 10);
    while (horaActual < horaFin) {
      horariosDisponibles.push(`${String(horaActual).padStart(2, '0')}:00`);
      horaActual++;
    }
  }

  const citasResult = await query(
    `SELECT TO_CHAR(hora, 'HH24:MI') as hora_ocupada FROM citas
     WHERE psicologo_id = $1 AND fecha = $2 AND estado NOT IN ('cancelada')`,
    [psicologoId, fecha],
  );
  const horasOcupadas = citasResult.rows.map(
    (c) => (c as { hora_ocupada: string }).hora_ocupada,
  );
  horariosDisponibles = horariosDisponibles.filter(
    (h) => !horasOcupadas.includes(h),
  );

  let hoyPsi: string | null = null;
  try {
    const hoyRow = await query(
      `SELECT (NOW() AT TIME ZONE $1)::date AS hoy`,
      [zonaHoraria],
    );
    const d = (hoyRow.rows[0] as { hoy?: Date | string } | undefined)?.hoy;
    if (d) {
      hoyPsi =
        d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);
    }
  } catch {
    hoyPsi = new Date().toISOString().split('T')[0];
  }

  if (hoyPsi && fecha === hoyPsi && horariosDisponibles.length > 0) {
    try {
      const ahoraPsi = await query(
        `SELECT TO_CHAR(NOW() AT TIME ZONE $1, 'HH24:MI') AS ahora`,
        [zonaHoraria],
      );
      const ahora = (
        ahoraPsi.rows[0] as { ahora?: string } | undefined
      )?.ahora?.trim();
      if (ahora) {
        horariosDisponibles = horariosDisponibles.filter(
          (h) => String(h).trim() > ahora,
        );
      }
    } catch {
      const horaActual = new Date().getHours();
      const minActual = new Date().getMinutes();
      horariosDisponibles = horariosDisponibles.filter((h) => {
        const [hh, mm] = h.split(':').map(Number);
        return hh > horaActual || (hh === horaActual && (mm || 0) > minActual);
      });
    }
  }

  let horariosIso: string[] = [];
  if (horariosDisponibles.length > 0) {
    try {
      const isoResult = await query(
        `SELECT (($1::date + u.hora::time) AT TIME ZONE $2)::timestamptz AS t
         FROM unnest($3::text[]) AS u(hora)`,
        [fecha, zonaHoraria, horariosDisponibles],
      );
      horariosIso = isoResult.rows.map((r) => {
        const t = (r as { t: Date | string }).t;
        return t instanceof Date ? t.toISOString() : t ? new Date(t).toISOString() : '';
      });
    } catch {
      /* front puede usar hora del psicólogo */
    }
  }

  return {
    disponible: true,
    horarios: horariosDisponibles,
    horarios_iso: horariosIso,
    zona_horaria: zonaHoraria,
  };
}

export type SlotValidation =
  | { ok: true }
  | { ok: false; error: string; status: number };

export async function validateSlotAvailable(
  psicologoId: number,
  fecha: string,
  hora: string,
  excludeCitaId?: number,
): Promise<SlotValidation> {
  const fechaDate = new Date(fecha + 'T12:00:00');
  const diaSemana = fechaDate.getDay();

  const vacCheck = await query(
    `SELECT id FROM vacaciones
     WHERE psicologo_id = $1
     AND $2::date BETWEEN fecha_inicio AND COALESCE(fecha_fin, fecha_inicio)`,
    [psicologoId, fecha],
  );
  if (vacCheck.rows.length > 0) {
    return {
      ok: false,
      error: 'El psicólogo no está disponible en esta fecha',
      status: 400,
    };
  }

  const horarioCheck = await query(
    `SELECT id FROM horario_laboral
     WHERE psicologo_id = $1 AND dia_semana = $2
     AND $3::time >= hora_inicio AND $3::time < hora_fin`,
    [psicologoId, diaSemana, hora],
  );
  if (horarioCheck.rows.length === 0) {
    return {
      ok: false,
      error: 'El horario seleccionado no está disponible',
      status: 400,
    };
  }

  const citaCheck = excludeCitaId
    ? await query(
        `SELECT id FROM citas
         WHERE psicologo_id = $1 AND fecha = $2 AND hora = $3 AND id != $4 AND estado NOT IN ('cancelada')`,
        [psicologoId, fecha, hora, excludeCitaId],
      )
    : await query(
        `SELECT id FROM citas
         WHERE psicologo_id = $1 AND fecha = $2 AND hora = $3 AND estado NOT IN ('cancelada')`,
        [psicologoId, fecha, hora],
      );

  if (citaCheck.rows.length > 0) {
    return { ok: false, error: 'Este horario ya está ocupado', status: 400 };
  }

  return { ok: true };
}

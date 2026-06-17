import { getBaseUrl } from '@/lib/config';
import { query } from '@/lib/db';
import { sendMail } from '@/lib/email';
import { ZONA_HORARIA_DEFECTO } from '@/lib/citas/availability';
import { enviarCorreosRecordatorioCita } from '@/lib/citas/emails';

export async function ejecutarRecordatoriosCitas(): Promise<{
  enviados: number;
}> {
  const nowIso = new Date().toISOString();
  let enviados = 0;

  try {
    let res;
    let usoFechaHoraUtc = true;
    try {
      res = await query(`
        SELECT c.id, c.paciente_id, c.psicologo_id, c.fecha, c.hora
        FROM citas c
        WHERE c.estado IN ('pendiente', 'confirmada')
          AND c.recordatorio_enviado_at IS NULL
          AND c.fecha_hora_utc IS NOT NULL AND c.fecha_hora_utc != ''
          AND (c.fecha_hora_utc::timestamptz) > NOW()
          AND (c.fecha_hora_utc::timestamptz) - NOW() <= INTERVAL '35 minutes'
          AND (c.fecha_hora_utc::timestamptz) - NOW() >= INTERVAL '25 minutes'
      `);
    } catch (qErr) {
      const msg = (qErr as Error).message || '';
      if (
        msg.includes('fecha_hora_utc') ||
        msg.includes('does not exist')
      ) {
        usoFechaHoraUtc = false;
        res = await query(
          `
          SELECT c.id, c.paciente_id, c.psicologo_id, c.fecha, c.hora
          FROM citas c
          WHERE c.estado IN ('pendiente', 'confirmada')
            AND c.recordatorio_enviado_at IS NULL
            AND ((c.fecha + c.hora) AT TIME ZONE COALESCE(NULLIF(TRIM(c.zona_horaria), ''), $1)) > NOW()
            AND ((c.fecha + c.hora) AT TIME ZONE COALESCE(NULLIF(TRIM(c.zona_horaria), ''), $1)) - NOW() <= INTERVAL '35 minutes'
            AND ((c.fecha + c.hora) AT TIME ZONE COALESCE(NULLIF(TRIM(c.zona_horaria), ''), $1)) - NOW() >= INTERVAL '25 minutes'
        `,
          [ZONA_HORARIA_DEFECTO],
        );
      } else {
        throw qErr;
      }
    }

    console.log(
      '[Recordatorios]',
      nowIso,
      'fecha_hora_utc=',
      usoFechaHoraUtc,
      '→ citas=',
      res.rows.length,
    );

    for (const row of res.rows) {
      const r = row as {
        id: number;
        paciente_id: number;
        psicologo_id: number;
        fecha: unknown;
        hora: unknown;
      };
      try {
        await enviarCorreosRecordatorioCita(
          r.paciente_id,
          r.psicologo_id,
          r.fecha,
          r.hora,
        );
        await query(
          'UPDATE citas SET recordatorio_enviado_at = NOW() WHERE id = $1',
          [r.id],
        );
        enviados++;
      } catch (e) {
        console.error('Error recordatorio cita', r.id, (e as Error).message);
      }
    }
  } catch (e) {
    console.error('Error en job recordatorios:', (e as Error).message);
  }

  return { enviados };
}

async function asegurarSecuenciaRecordatorioPostCita(): Promise<void> {
  try {
    await query('CREATE SEQUENCE IF NOT EXISTS recordatorio_post_cita_id_seq');
    await query(
      `ALTER TABLE recordatorio_post_cita ALTER COLUMN id SET DEFAULT nextval('recordatorio_post_cita_id_seq'::regclass)`,
    );
  } catch (e) {
    const msg = (e as Error).message || '';
    if (!msg.includes('does not exist')) {
      console.error('Recordatorio post-cita init:', msg);
    }
  }
}

export async function ejecutarRecordatoriosPostCita(): Promise<{
  enviados: number;
}> {
  await asegurarSecuenciaRecordatorioPostCita();
  const baseUrl = getBaseUrl();
  const enlaceLogin = baseUrl + '/perfil';
  const botonHtml = `<p><a href="${enlaceLogin}">Iniciar sesión y agendar</a></p>`;
  let enviados = 0;

  try {
    const res = await query(`
      SELECT c.paciente_id, c.id AS cita_id, c.fecha
      FROM citas c
      INNER JOIN (
        SELECT paciente_id, MAX(id) AS max_id
        FROM citas WHERE estado = 'realizada'
        GROUP BY paciente_id
      ) u ON c.paciente_id = u.paciente_id AND c.id = u.max_id
      WHERE c.estado = 'realizada'
    `);

    for (const row of res.rows) {
      const r = row as {
        paciente_id: number;
        cita_id: number;
        fecha: Date | string;
      };
      const diasDesde = Math.floor(
        (Date.now() - new Date(r.fecha).getTime()) / (24 * 60 * 60 * 1000),
      );

      const userRow = await query(
        'SELECT nombre, email FROM usuarios WHERE id = $1',
        [r.paciente_id],
      );
      const usuario = userRow.rows[0] as
        | { nombre?: string; email?: string }
        | undefined;
      if (!usuario?.email) continue;

      const nombre = (usuario.nombre || '').trim() || 'querido paciente';
      const primerNombre = nombre.split(' ')[0] || nombre;

      let rec = await query(
        'SELECT enviado_dia_15_at, enviado_dia_30_at, enviado_dia_60_at FROM recordatorio_post_cita WHERE paciente_id = $1 AND cita_id = $2',
        [r.paciente_id, r.cita_id],
      );
      if (rec.rows.length === 0) {
        await query(
          `INSERT INTO recordatorio_post_cita (paciente_id, cita_id)
           SELECT $1, $2 WHERE NOT EXISTS (
             SELECT 1 FROM recordatorio_post_cita WHERE paciente_id = $1 AND cita_id = $2
           )`,
          [r.paciente_id, r.cita_id],
        );
        rec = await query(
          'SELECT enviado_dia_15_at, enviado_dia_30_at, enviado_dia_60_at FROM recordatorio_post_cita WHERE paciente_id = $1 AND cita_id = $2',
          [r.paciente_id, r.cita_id],
        );
      }

      const flags = rec.rows[0] as
        | {
            enviado_dia_15_at?: Date | null;
            enviado_dia_30_at?: Date | null;
            enviado_dia_60_at?: Date | null;
          }
        | undefined;
      if (!flags) continue;

      if (diasDesde >= 15 && !flags.enviado_dia_15_at) {
        try {
          await sendMail({
            to: usuario.email!,
            bcc: 'contacto@psicologosenred.com',
            subject: `¿Cómo te has sentido estos últimos días, ${primerNombre}?`,
            html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #c9a0dc;">Psicólogos en Red</h1>
              <p>Hola ${nombre}, han pasado un par de semanas desde tu última sesión.</p>
              ${botonHtml}
            </div>`,
          });
          await query(
            'UPDATE recordatorio_post_cita SET enviado_dia_15_at = NOW() WHERE paciente_id = $1 AND cita_id = $2',
            [r.paciente_id, r.cita_id],
          );
          enviados++;
        } catch (e) {
          console.error('Error recordatorio día 15', r.paciente_id, (e as Error).message);
        }
      }

      if (diasDesde >= 30 && !flags.enviado_dia_30_at) {
        try {
          await sendMail({
            to: usuario.email!,
            bcc: 'contacto@psicologosenred.com',
            subject: 'Un mes de tu última sesión: Reconecta con tus metas',
            html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #c9a0dc;">Psicólogos en Red</h1>
              <p>Hola ${nombre}, hoy se cumple un mes desde tu última consulta.</p>
              ${botonHtml}
            </div>`,
          });
          await query(
            'UPDATE recordatorio_post_cita SET enviado_dia_30_at = NOW() WHERE paciente_id = $1 AND cita_id = $2',
            [r.paciente_id, r.cita_id],
          );
          enviados++;
        } catch (e) {
          console.error('Error recordatorio día 30', r.paciente_id, (e as Error).message);
        }
      }

      if (diasDesde >= 60 && !flags.enviado_dia_60_at) {
        try {
          await sendMail({
            to: usuario.email!,
            bcc: 'contacto@psicologosenred.com',
            subject: `${primerNombre}, queremos apoyarte a retomar tu bienestar`,
            html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #c9a0dc;">Psicólogos en Red</h1>
              <p>Hola ${nombre}, han pasado 60 días desde tu última consulta.</p>
              ${botonHtml}
            </div>`,
          });
          await query(
            'UPDATE recordatorio_post_cita SET enviado_dia_60_at = NOW() WHERE paciente_id = $1 AND cita_id = $2',
            [r.paciente_id, r.cita_id],
          );
          enviados++;
        } catch (e) {
          console.error('Error recordatorio día 60', r.paciente_id, (e as Error).message);
        }
      }
    }
  } catch (e) {
    console.error('Error recordatorios post-cita:', (e as Error).message);
  }

  return { enviados };
}

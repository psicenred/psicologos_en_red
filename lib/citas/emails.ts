import { getBaseUrl } from '@/lib/config';
import { sendMail } from '@/lib/email';
import { enviarWhatsapp } from '@/lib/whatsapp';
import { generarIcsCita } from '@/lib/citas/ics';
import { obtenerContextoCitaNotificacion } from '@/lib/citas/participants';

const BCC = 'contacto@psicologosenred.com';

function adjuntoIcs(
  ctx: NonNullable<Awaited<ReturnType<typeof obtenerContextoCitaNotificacion>>>,
  opts: {
    citaId?: number | null;
    titulo: string;
    descripcion?: string;
    accion?: 'crear' | 'cancelar';
  },
) {
  return {
    filename: opts.accion === 'cancelar' ? 'cita-cancelada.ics' : 'cita.ics',
    content: generarIcsCita({
      citaId: opts.citaId,
      fecha: ctx.fecha,
      hora: ctx.hora,
      fecha_hora_utc: ctx.fecha_hora_utc,
      titulo: opts.titulo,
      descripcion: opts.descripcion,
      accion: opts.accion,
    }),
    contentType:
      opts.accion === 'cancelar'
        ? 'text/calendar; method=CANCEL'
        : 'text/calendar; method=PUBLISH',
  };
}

export async function enviarCorreosCitaAgendada(
  pacienteId: number,
  psicologoId: number,
  fecha: unknown,
  hora: unknown,
  citaId: number | null = null,
  fecha_hora_utc?: string | null,
): Promise<void> {
  const ctx = await obtenerContextoCitaNotificacion({
    pacienteId,
    psicologoId,
    fecha,
    hora,
    citaId,
    fecha_hora_utc,
  });

  if (!ctx?.paciente.email || !ctx.psicologo.email) {
    console.warn('enviarCorreosCitaAgendada: falta email', {
      pacienteId,
      psicologoId,
    });
    return;
  }

  const baseUrl = getBaseUrl();
  const enlaceLogin = baseUrl + '/login';
  const { paraPaciente: p, paraPsicologo: psi } = ctx;

  const ics = adjuntoIcs(ctx, {
    citaId,
    titulo: `Sesión con ${ctx.psicologo.nombre || 'Psicólogos en Red'}`,
    descripcion: `Cita agendada. Paciente: ${ctx.paciente.nombre || 'Paciente'}.`,
    accion: 'crear',
  });

  const htmlPaciente = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #c9a0dc; text-align: center;">Psicólogos en Red</h1>
      <h2>¡Hola ${(ctx.paciente.nombre || '').split(' ')[0]}!</h2>
      <p>Tu cita está confirmada:</p>
      <p><strong>Fecha:</strong> ${p.fecha} · <strong>Hora:</strong> ${p.hora} hrs</p>
      <p><strong>Especialista:</strong> ${ctx.psicologo.nombre || 'Tu psicólogo'}</p>
      <p><a href="${enlaceLogin}">Iniciar sesión</a></p>
    </div>`;

  const htmlPsicologo = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #c9a0dc; text-align: center;">Psicólogos en Red</h1>
      <h2>Nueva cita agendada</h2>
      <p><strong>Fecha:</strong> ${psi.fecha} · <strong>Hora:</strong> ${psi.hora} hrs</p>
      <p><strong>Paciente:</strong> ${ctx.paciente.nombre || 'Paciente'}</p>
      <p><a href="${enlaceLogin}">Iniciar sesión</a></p>
    </div>`;

  try {
    await sendMail({
      to: ctx.paciente.email,
      bcc: BCC,
      subject: '✅ Cita agendada - Psicólogos en Red',
      html: htmlPaciente,
      attachments: [ics],
    });
  } catch (e) {
    console.error('Error correo cita paciente:', (e as Error).message);
  }
  try {
    await sendMail({
      to: ctx.psicologo.email,
      bcc: BCC,
      subject: '📅 Nueva cita agendada - Psicólogos en Red',
      html: htmlPsicologo,
      attachments: [ics],
    });
  } catch (e) {
    console.error('Error correo cita psicólogo:', (e as Error).message);
  }

  await enviarWhatsapp(
    ctx.paciente.telefono,
    `Psicólogos en Red – Cita agendada: ${p.linea} con ${ctx.psicologo.nombre || 'tu psicólogo'}. ${enlaceLogin}`,
  );
  await enviarWhatsapp(
    ctx.psicologo.telefono,
    `Psicólogos en Red – Nueva cita: ${psi.linea} con ${ctx.paciente.nombre || 'Paciente'}. ${enlaceLogin}`,
  );
}

export async function enviarCorreosCitaReagendada(
  pacienteId: number,
  psicologoId: number,
  fecha: unknown,
  hora: unknown,
  citaId: number | null = null,
  fecha_hora_utc?: string | null,
): Promise<void> {
  const ctx = await obtenerContextoCitaNotificacion({
    pacienteId,
    psicologoId,
    fecha,
    hora,
    citaId,
    fecha_hora_utc,
  });
  if (!ctx?.paciente.email || !ctx.psicologo.email) return;

  const baseUrl = getBaseUrl();
  const enlaceLogin = baseUrl + '/login';
  const { paraPaciente: p, paraPsicologo: psi } = ctx;

  const ics = adjuntoIcs(ctx, {
    citaId,
    titulo: `Sesión reagendada con ${ctx.psicologo.nombre || 'Psicólogos en Red'}`,
    accion: 'crear',
  });

  const htmlBase = (
    titulo: string,
    cuerpo: string,
    linea: typeof p,
  ) =>
    `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #c9a0dc;">Psicólogos en Red</h1>
      <h2>${titulo}</h2>
      <p>${cuerpo}</p>
      <p><strong>Nueva fecha:</strong> ${linea.fecha} · <strong>Hora:</strong> ${linea.hora} hrs</p>
      <p><a href="${enlaceLogin}">Iniciar sesión</a></p>
    </div>`;

  try {
    await sendMail({
      to: ctx.paciente.email,
      bcc: BCC,
      subject: '📅 Cita reagendada - Psicólogos en Red',
      html: htmlBase('Cita reagendada', 'Tu sesión ha sido reagendada correctamente.', p),
      attachments: [ics],
    });
  } catch (e) {
    console.error('Error correo reagendo paciente:', (e as Error).message);
  }
  try {
    await sendMail({
      to: ctx.psicologo.email,
      bcc: BCC,
      subject: '📅 Cita reagendada - Psicólogos en Red',
      html: htmlBase(
        'Cita reagendada',
        `El paciente ${ctx.paciente.nombre || 'Paciente'} ha reagendado la sesión.`,
        psi,
      ),
      attachments: [ics],
    });
  } catch (e) {
    console.error('Error correo reagendo psicólogo:', (e as Error).message);
  }

  await enviarWhatsapp(
    ctx.paciente.telefono,
    `Psicólogos en Red – Cita reagendada: ${p.linea}. ${enlaceLogin}`,
  );
  await enviarWhatsapp(
    ctx.psicologo.telefono,
    `Psicólogos en Red – Cita reagendada con ${ctx.paciente.nombre || 'Paciente'}: ${psi.linea}. ${enlaceLogin}`,
  );
}

export async function enviarCorreosCitaCancelada(
  pacienteId: number,
  psicologoId: number,
  fecha: unknown,
  hora: unknown,
  citaId: number | null = null,
  fecha_hora_utc?: string | null,
): Promise<void> {
  const ctx = await obtenerContextoCitaNotificacion({
    pacienteId,
    psicologoId,
    fecha,
    hora,
    citaId,
    fecha_hora_utc,
  });
  if (!ctx?.paciente.email || !ctx.psicologo.email) return;

  const baseUrl = getBaseUrl();
  const enlaceLogin = baseUrl + '/login';
  const enlaceCatalogo = baseUrl + '/catalogo';
  const { paraPaciente: p, paraPsicologo: psi } = ctx;

  const ics = adjuntoIcs(ctx, {
    citaId,
    titulo: 'Sesión cancelada',
    accion: 'cancelar',
  });

  try {
    await sendMail({
      to: ctx.psicologo.email,
      bcc: BCC,
      subject: '❌ Cita cancelada - Psicólogos en Red',
      html: `<p>Cita cancelada con ${ctx.paciente.nombre || 'Paciente'}: ${psi.linea}.</p><p><a href="${enlaceLogin}">Iniciar sesión</a></p>`,
      attachments: [ics],
    });
  } catch (e) {
    console.error('Error correo cancelación psicólogo:', (e as Error).message);
  }
  try {
    await sendMail({
      to: ctx.paciente.email,
      bcc: BCC,
      subject: 'Cita cancelada - Psicólogos en Red',
      html: `<p>Tu cita del ${p.linea} fue cancelada. Reembolso en 5-10 días hábiles.</p><p><a href="${enlaceCatalogo}">Agendar nueva cita</a></p>`,
      attachments: [ics],
    });
  } catch (e) {
    console.error('Error correo cancelación paciente:', (e as Error).message);
  }

  await enviarWhatsapp(
    ctx.psicologo.telefono,
    `Psicólogos en Red – Cita cancelada: ${psi.linea}. ${enlaceLogin}`,
  );
  await enviarWhatsapp(
    ctx.paciente.telefono,
    `Psicólogos en Red – Tu cita del ${p.linea} fue cancelada. ${enlaceCatalogo}`,
  );
}

export async function enviarCorreosRecordatorioCita(
  pacienteId: number,
  psicologoId: number,
  fecha: unknown,
  hora: unknown,
  fecha_hora_utc?: string | null,
): Promise<void> {
  const ctx = await obtenerContextoCitaNotificacion({
    pacienteId,
    psicologoId,
    fecha,
    hora,
    fecha_hora_utc,
  });
  if (!ctx?.paciente.email || !ctx.psicologo.email) return;

  const enlaceLogin = getBaseUrl() + '/login';
  const { paraPaciente: p, paraPsicologo: psi } = ctx;

  const htmlPaciente = `<p>Recordatorio: tu sesión con ${ctx.psicologo.nombre || 'tu psicólogo'} es en 30 min (${p.linea}).</p><p><a href="${enlaceLogin}">Iniciar sesión</a></p>`;
  const htmlPsicologo = `<p>Recordatorio: sesión en 30 min con ${ctx.paciente.nombre || 'Paciente'} (${psi.linea}).</p><p><a href="${enlaceLogin}">Iniciar sesión</a></p>`;

  try {
    await sendMail({
      to: ctx.paciente.email,
      bcc: BCC,
      subject: '⏰ Recordatorio: tu sesión es en 30 min - Psicólogos en Red',
      html: htmlPaciente,
    });
  } catch (e) {
    console.error('Error correo recordatorio paciente:', (e as Error).message);
  }
  try {
    await sendMail({
      to: ctx.psicologo.email,
      bcc: BCC,
      subject: '⏰ Recordatorio: sesión en 30 min - Psicólogos en Red',
      html: htmlPsicologo,
    });
  } catch (e) {
    console.error('Error correo recordatorio psicólogo:', (e as Error).message);
  }

  await enviarWhatsapp(
    ctx.paciente.telefono,
    `Psicólogos en Red – Recordatorio: sesión en 30 min (${p.linea}). ${enlaceLogin}`,
  );
  await enviarWhatsapp(
    ctx.psicologo.telefono,
    `Psicólogos en Red – Recordatorio: sesión en 30 min (${psi.linea}). ${enlaceLogin}`,
  );
}

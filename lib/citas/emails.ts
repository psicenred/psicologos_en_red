import { getBaseUrl } from '@/lib/config';
import { sendMail } from '@/lib/email';
import { enviarWhatsapp } from '@/lib/whatsapp';
import {
  htmlCitaAgendadaPaciente,
  htmlCitaAgendadaPsicologo,
  htmlCitaCanceladaPaciente,
  htmlCitaCanceladaPsicologo,
  htmlCitaReagendadaPaciente,
  htmlCitaReagendadaPsicologo,
  htmlRecordatorioPaciente,
  htmlRecordatorioPsicologo,
} from '@/lib/citas/email-templates';
import { generarIcsCita } from '@/lib/citas/ics';
import {
  obtenerContextoCitaNotificacion,
  type ContextoCitaNotificacion,
  type PersonaCita,
} from '@/lib/citas/participants';

function tieneContacto(persona: PersonaCita): boolean {
  return Boolean(persona.email?.trim() || persona.telefono?.trim());
}
import type { CitaFormateada } from '@/lib/citas/timezone';

const BCC = 'contacto@psicologosenred.com';

function detalle(formatted: CitaFormateada) {
  return { fechaStr: formatted.fecha, horaStr: formatted.hora };
}

function adjuntoIcs(
  ctx: ContextoCitaNotificacion,
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

  if (!ctx) return;
  if (!tieneContacto(ctx.paciente) || !tieneContacto(ctx.psicologo)) {
    console.warn('enviarCorreosCitaAgendada: falta email o teléfono', {
      pacienteId,
      psicologoId,
    });
  }

  const enlaceLogin = getBaseUrl() + '/login';
  const primerNombre = (ctx.paciente.nombre || '').split(' ')[0] || 'Paciente';
  const psicologoNombre = ctx.psicologo.nombre || 'Tu psicólogo';
  const pacienteNombre = ctx.paciente.nombre || 'Paciente';

  const ics = adjuntoIcs(ctx, {
    citaId,
    titulo: `Sesión con ${psicologoNombre}`,
    descripcion: `Cita agendada. Paciente: ${pacienteNombre}. Añade este evento a tu calendario (Zoho, Google, etc.).`,
    accion: 'crear',
  });

  const detPaciente = detalle(ctx.paraPaciente);
  const detPsicologo = detalle(ctx.paraPsicologo);

  if (ctx.paciente.email) {
    try {
      await sendMail({
        to: ctx.paciente.email,
        bcc: BCC,
        subject: '✅ Cita agendada - Psicólogos en Red',
        html: htmlCitaAgendadaPaciente({
          primerNombre,
          detalle: detPaciente,
          psicologoNombre,
          enlaceLogin,
        }),
        attachments: [ics],
      });
    } catch (e) {
      console.error('Error correo cita paciente:', (e as Error).message);
    }
  }
  if (ctx.psicologo.email) {
    try {
      await sendMail({
        to: ctx.psicologo.email,
        bcc: BCC,
        subject: '📅 Nueva cita agendada - Psicólogos en Red',
        html: htmlCitaAgendadaPsicologo({
          detalle: detPsicologo,
          pacienteNombre,
          enlaceLogin,
        }),
        attachments: [ics],
      });
    } catch (e) {
      console.error('Error correo cita psicólogo:', (e as Error).message);
    }
  }

  await enviarWhatsapp(
    ctx.paciente.telefono,
    `Psicólogos en Red – Cita agendada: ${detPaciente.fechaStr} a las ${detPaciente.horaStr} hrs con ${psicologoNombre}. Iniciar sesión: ${enlaceLogin}`,
  );
  await enviarWhatsapp(
    ctx.psicologo.telefono,
    `Psicólogos en Red – Nueva cita: ${detPsicologo.fechaStr} ${detPsicologo.horaStr} hrs con ${pacienteNombre}. Iniciar sesión: ${enlaceLogin}`,
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
  if (!ctx) return;

  const enlaceLogin = getBaseUrl() + '/login';
  const psicologoNombre = ctx.psicologo.nombre || 'Tu psicólogo';
  const pacienteNombre = ctx.paciente.nombre || 'Paciente';
  const detPaciente = detalle(ctx.paraPaciente);
  const detPsicologo = detalle(ctx.paraPsicologo);

  const ics = adjuntoIcs(ctx, {
    citaId,
    titulo: `Sesión reagendada con ${psicologoNombre}`,
    descripcion: `Cita reagendada. Paciente: ${pacienteNombre}. Añade o actualiza este evento en tu calendario.`,
    accion: 'crear',
  });

  if (ctx.paciente.email) {
    try {
      await sendMail({
        to: ctx.paciente.email,
        bcc: BCC,
        subject: '📅 Cita reagendada - Psicólogos en Red',
        html: htmlCitaReagendadaPaciente({
          detalle: detPaciente,
          psicologoNombre,
          enlaceLogin,
        }),
        attachments: [ics],
      });
    } catch (e) {
      console.error('Error correo reagendo paciente:', (e as Error).message);
    }
  }
  if (ctx.psicologo.email) {
    try {
      await sendMail({
        to: ctx.psicologo.email,
        bcc: BCC,
        subject: '📅 Cita reagendada - Psicólogos en Red',
        html: htmlCitaReagendadaPsicologo({
          detalle: detPsicologo,
          pacienteNombre,
          enlaceLogin,
        }),
        attachments: [ics],
      });
    } catch (e) {
      console.error('Error correo reagendo psicólogo:', (e as Error).message);
    }
  }

  await enviarWhatsapp(
    ctx.paciente.telefono,
    `Psicólogos en Red – Cita reagendada: ${detPaciente.fechaStr} ${detPaciente.horaStr} hrs. Iniciar sesión: ${enlaceLogin}`,
  );
  await enviarWhatsapp(
    ctx.psicologo.telefono,
    `Psicólogos en Red – Cita reagendada con ${pacienteNombre}: ${detPsicologo.fechaStr} ${detPsicologo.horaStr} hrs. Iniciar sesión: ${enlaceLogin}`,
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
  if (!ctx) return;

  const enlaceLogin = getBaseUrl() + '/login';
  const enlaceCatalogo = getBaseUrl() + '/catalogo';
  const psicologoNombre = ctx.psicologo.nombre || 'tu especialista';
  const pacienteNombre = ctx.paciente.nombre || 'Paciente';
  const detPaciente = detalle(ctx.paraPaciente);
  const detPsicologo = detalle(ctx.paraPsicologo);

  const ics = adjuntoIcs(ctx, {
    citaId,
    titulo: 'Sesión cancelada - Psicólogos en Red',
    accion: 'cancelar',
  });

  if (ctx.psicologo.email) {
    try {
      await sendMail({
        to: ctx.psicologo.email,
        bcc: BCC,
        subject: '❌ Cita cancelada - Psicólogos en Red',
        html: htmlCitaCanceladaPsicologo({
          detalle: detPsicologo,
          pacienteNombre,
          enlaceLogin,
        }),
        attachments: [ics],
      });
    } catch (e) {
      console.error('Error correo cancelación psicólogo:', (e as Error).message);
    }
  }
  if (ctx.paciente.email) {
    try {
      await sendMail({
        to: ctx.paciente.email,
        bcc: BCC,
        subject: 'Cita cancelada - Psicólogos en Red',
        html: htmlCitaCanceladaPaciente({
          detalle: detPaciente,
          psicologoNombre,
          enlaceCatalogo,
        }),
        attachments: [ics],
      });
    } catch (e) {
      console.error('Error correo cancelación paciente:', (e as Error).message);
    }
  }

  await enviarWhatsapp(
    ctx.psicologo.telefono,
    `Psicólogos en Red – Cita cancelada: ${detPsicologo.fechaStr} ${detPsicologo.horaStr} hrs con ${pacienteNombre}. Iniciar sesión: ${enlaceLogin}`,
  );
  await enviarWhatsapp(
    ctx.paciente.telefono,
    `Psicólogos en Red – Tu cita del ${detPaciente.fechaStr} fue cancelada. Puedes agendar otra: ${enlaceCatalogo}`,
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
  if (!ctx) return;

  const enlaceLogin = getBaseUrl() + '/login';
  const primerNombre = (ctx.paciente.nombre || '').split(' ')[0] || 'Paciente';
  const psicologoNombre = ctx.psicologo.nombre || 'tu psicólogo';
  const pacienteNombre = ctx.paciente.nombre || 'Paciente';
  const detPaciente = detalle(ctx.paraPaciente);
  const detPsicologo = detalle(ctx.paraPsicologo);

  if (ctx.paciente.email) {
    try {
      await sendMail({
        to: ctx.paciente.email,
        bcc: BCC,
        subject: '⏰ Recordatorio: tu sesión es en 30 min - Psicólogos en Red',
        html: htmlRecordatorioPaciente({
          primerNombre,
          psicologoNombre,
          detalle: detPaciente,
          enlaceLogin,
        }),
      });
    } catch (e) {
      console.error('Error correo recordatorio paciente:', (e as Error).message);
    }
  }
  if (ctx.psicologo.email) {
    try {
      await sendMail({
        to: ctx.psicologo.email,
        bcc: BCC,
        subject: '⏰ Recordatorio: sesión en 30 min - Psicólogos en Red',
        html: htmlRecordatorioPsicologo({
          pacienteNombre,
          detalle: detPsicologo,
          enlaceLogin,
        }),
      });
    } catch (e) {
      console.error('Error correo recordatorio psicólogo:', (e as Error).message);
    }
  }

  await enviarWhatsapp(
    ctx.paciente.telefono,
    `Psicólogos en Red – Recordatorio: tu sesión es en 30 min (${detPaciente.fechaStr} ${detPaciente.horaStr} hrs). Iniciar sesión: ${enlaceLogin}`,
  );
  await enviarWhatsapp(
    ctx.psicologo.telefono,
    `Psicólogos en Red – Recordatorio: sesión en 30 min con ${pacienteNombre} (${detPsicologo.fechaStr} ${detPsicologo.horaStr} hrs). Iniciar sesión: ${enlaceLogin}`,
  );
}

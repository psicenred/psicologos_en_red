import { getBaseUrl } from '@/lib/config';
import { sendMail } from '@/lib/email';
import { enviarWhatsapp } from '@/lib/whatsapp';
import {
  formatearFechaParaEmail,
  generarIcsCita,
} from '@/lib/citas/ics';
import { obtenerDatosPacienteYPsicologo } from '@/lib/citas/participants';

const BCC = 'contacto@psicologosenred.com';

export async function enviarCorreosCitaAgendada(
  pacienteId: number,
  psicologoId: number,
  fecha: unknown,
  hora: unknown,
  citaId: number | null = null,
): Promise<void> {
  const { paciente, psicologo } = await obtenerDatosPacienteYPsicologo(
    pacienteId,
    psicologoId,
  );

  if (!paciente?.email || !psicologo?.email) {
    console.warn('enviarCorreosCitaAgendada: falta email', {
      pacienteId,
      psicologoId,
    });
    return;
  }

  const baseUrl = getBaseUrl();
  const fechaStr = formatearFechaParaEmail(fecha);
  const horaStr = hora != null ? String(hora).substring(0, 5) : '—';
  const enlaceLogin = baseUrl + '/login';

  const icsAgendar = generarIcsCita({
    citaId,
    paciente_id: pacienteId,
    psicologo_id: psicologoId,
    fecha,
    hora,
    titulo: `Sesión con ${psicologo.nombre || 'Psicólogos en Red'}`,
    descripcion: `Cita agendada. Paciente: ${paciente.nombre || 'Paciente'}.`,
    accion: 'crear',
  });
  const adjuntoIcs = {
    filename: 'cita.ics',
    content: icsAgendar,
    contentType: 'text/calendar; method=PUBLISH',
  };

  const htmlPaciente = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #c9a0dc; text-align: center;">Psicólogos en Red</h1>
      <h2>¡Hola ${(paciente.nombre || '').split(' ')[0]}!</h2>
      <p>Tu cita está confirmada:</p>
      <p><strong>Fecha:</strong> ${fechaStr} · <strong>Hora:</strong> ${horaStr} hrs</p>
      <p><strong>Especialista:</strong> ${psicologo.nombre || 'Tu psicólogo'}</p>
      <p><a href="${enlaceLogin}">Iniciar sesión</a></p>
    </div>`;

  const htmlPsicologo = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #c9a0dc; text-align: center;">Psicólogos en Red</h1>
      <h2>Nueva cita agendada</h2>
      <p><strong>Fecha:</strong> ${fechaStr} · <strong>Hora:</strong> ${horaStr} hrs</p>
      <p><strong>Paciente:</strong> ${paciente.nombre || 'Paciente'}</p>
      <p><a href="${enlaceLogin}">Iniciar sesión</a></p>
    </div>`;

  try {
    await sendMail({
      to: paciente.email,
      bcc: BCC,
      subject: '✅ Cita agendada - Psicólogos en Red',
      html: htmlPaciente,
      attachments: [adjuntoIcs],
    });
  } catch (e) {
    console.error('Error correo cita paciente:', (e as Error).message);
  }
  try {
    await sendMail({
      to: psicologo.email,
      bcc: BCC,
      subject: '📅 Nueva cita agendada - Psicólogos en Red',
      html: htmlPsicologo,
      attachments: [adjuntoIcs],
    });
  } catch (e) {
    console.error('Error correo cita psicólogo:', (e as Error).message);
  }

  await enviarWhatsapp(
    paciente.telefono,
    `Psicólogos en Red – Cita agendada: ${fechaStr} a las ${horaStr} hrs con ${psicologo.nombre || 'tu psicólogo'}. ${enlaceLogin}`,
  );
  await enviarWhatsapp(
    psicologo.telefono,
    `Psicólogos en Red – Nueva cita: ${fechaStr} ${horaStr} hrs con ${paciente.nombre || 'Paciente'}. ${enlaceLogin}`,
  );
}

export async function enviarCorreosCitaReagendada(
  pacienteId: number,
  psicologoId: number,
  fecha: unknown,
  hora: unknown,
  citaId: number | null = null,
): Promise<void> {
  const { paciente, psicologo } = await obtenerDatosPacienteYPsicologo(
    pacienteId,
    psicologoId,
  );
  if (!paciente?.email || !psicologo?.email) return;

  const baseUrl = getBaseUrl();
  const fechaStr = formatearFechaParaEmail(fecha);
  const horaStr = hora != null ? String(hora).substring(0, 5) : '—';
  const enlaceLogin = baseUrl + '/login';
  const adjuntoIcs = {
    filename: 'cita.ics',
    content: generarIcsCita({
      citaId,
      paciente_id: pacienteId,
      psicologo_id: psicologoId,
      fecha,
      hora,
      titulo: `Sesión reagendada con ${psicologo.nombre || 'Psicólogos en Red'}`,
      accion: 'crear',
    }),
    contentType: 'text/calendar; method=PUBLISH',
  };

  const htmlBase = (titulo: string, cuerpo: string) =>
    `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #c9a0dc;">Psicólogos en Red</h1>
      <h2>${titulo}</h2>
      <p>${cuerpo}</p>
      <p><strong>Nueva fecha:</strong> ${fechaStr} · <strong>Hora:</strong> ${horaStr} hrs</p>
      <p><a href="${enlaceLogin}">Iniciar sesión</a></p>
    </div>`;

  try {
    await sendMail({
      to: paciente.email,
      bcc: BCC,
      subject: '📅 Cita reagendada - Psicólogos en Red',
      html: htmlBase('Cita reagendada', 'Tu sesión ha sido reagendada correctamente.'),
      attachments: [adjuntoIcs],
    });
  } catch (e) {
    console.error('Error correo reagendo paciente:', (e as Error).message);
  }
  try {
    await sendMail({
      to: psicologo.email,
      bcc: BCC,
      subject: '📅 Cita reagendada - Psicólogos en Red',
      html: htmlBase(
        'Cita reagendada',
        `El paciente ${paciente.nombre || 'Paciente'} ha reagendado la sesión.`,
      ),
      attachments: [adjuntoIcs],
    });
  } catch (e) {
    console.error('Error correo reagendo psicólogo:', (e as Error).message);
  }

  await enviarWhatsapp(
    paciente.telefono,
    `Psicólogos en Red – Cita reagendada: ${fechaStr} ${horaStr} hrs. ${enlaceLogin}`,
  );
  await enviarWhatsapp(
    psicologo.telefono,
    `Psicólogos en Red – Cita reagendada con ${paciente.nombre || 'Paciente'}: ${fechaStr} ${horaStr} hrs. ${enlaceLogin}`,
  );
}

export async function enviarCorreosCitaCancelada(
  pacienteId: number,
  psicologoId: number,
  fecha: unknown,
  hora: unknown,
  citaId: number | null = null,
): Promise<void> {
  const { paciente, psicologo } = await obtenerDatosPacienteYPsicologo(
    pacienteId,
    psicologoId,
  );
  if (!paciente?.email || !psicologo?.email) return;

  const baseUrl = getBaseUrl();
  const fechaStr = formatearFechaParaEmail(fecha);
  const horaStr = hora != null ? String(hora).substring(0, 5) : '—';
  const enlaceLogin = baseUrl + '/login';
  const enlaceCatalogo = baseUrl + '/catalogo';
  const adjuntoIcs = {
    filename: 'cita-cancelada.ics',
    content: generarIcsCita({
      citaId,
      paciente_id: pacienteId,
      psicologo_id: psicologoId,
      fecha,
      hora,
      titulo: 'Sesión cancelada',
      accion: 'cancelar',
    }),
    contentType: 'text/calendar; method=CANCEL',
  };

  try {
    await sendMail({
      to: psicologo.email,
      bcc: BCC,
      subject: '❌ Cita cancelada - Psicólogos en Red',
      html: `<p>Cita cancelada con ${paciente.nombre || 'Paciente'}: ${fechaStr} ${horaStr} hrs.</p><p><a href="${enlaceLogin}">Iniciar sesión</a></p>`,
      attachments: [adjuntoIcs],
    });
  } catch (e) {
    console.error('Error correo cancelación psicólogo:', (e as Error).message);
  }
  try {
    await sendMail({
      to: paciente.email,
      bcc: BCC,
      subject: 'Cita cancelada - Psicólogos en Red',
      html: `<p>Tu cita del ${fechaStr} a las ${horaStr} hrs fue cancelada. Reembolso en 5-10 días hábiles.</p><p><a href="${enlaceCatalogo}">Agendar nueva cita</a></p>`,
      attachments: [adjuntoIcs],
    });
  } catch (e) {
    console.error('Error correo cancelación paciente:', (e as Error).message);
  }

  await enviarWhatsapp(
    psicologo.telefono,
    `Psicólogos en Red – Cita cancelada: ${fechaStr} ${horaStr} hrs. ${enlaceLogin}`,
  );
  await enviarWhatsapp(
    paciente.telefono,
    `Psicólogos en Red – Tu cita del ${fechaStr} fue cancelada. ${enlaceCatalogo}`,
  );
}

export async function enviarCorreosRecordatorioCita(
  pacienteId: number,
  psicologoId: number,
  fecha: unknown,
  hora: unknown,
): Promise<void> {
  const { paciente, psicologo } = await obtenerDatosPacienteYPsicologo(
    pacienteId,
    psicologoId,
  );
  if (!paciente?.email || !psicologo?.email) return;

  const fechaStr = formatearFechaParaEmail(fecha);
  const horaStr = hora != null ? String(hora).substring(0, 5) : '—';
  const enlaceLogin = getBaseUrl() + '/login';

  const htmlPaciente = `<p>Recordatorio: tu sesión con ${psicologo.nombre || 'tu psicólogo'} es en 30 min (${fechaStr} ${horaStr} hrs).</p><p><a href="${enlaceLogin}">Iniciar sesión</a></p>`;
  const htmlPsicologo = `<p>Recordatorio: sesión en 30 min con ${paciente.nombre || 'Paciente'} (${fechaStr} ${horaStr} hrs).</p><p><a href="${enlaceLogin}">Iniciar sesión</a></p>`;

  try {
    await sendMail({
      to: paciente.email,
      bcc: BCC,
      subject: '⏰ Recordatorio: tu sesión es en 30 min - Psicólogos en Red',
      html: htmlPaciente,
    });
  } catch (e) {
    console.error('Error correo recordatorio paciente:', (e as Error).message);
  }
  try {
    await sendMail({
      to: psicologo.email,
      bcc: BCC,
      subject: '⏰ Recordatorio: sesión en 30 min - Psicólogos en Red',
      html: htmlPsicologo,
    });
  } catch (e) {
    console.error('Error correo recordatorio psicólogo:', (e as Error).message);
  }

  await enviarWhatsapp(
    paciente.telefono,
    `Psicólogos en Red – Recordatorio: sesión en 30 min (${fechaStr} ${horaStr} hrs). ${enlaceLogin}`,
  );
  await enviarWhatsapp(
    psicologo.telefono,
    `Psicólogos en Red – Recordatorio: sesión en 30 min (${fechaStr} ${horaStr} hrs). ${enlaceLogin}`,
  );
}

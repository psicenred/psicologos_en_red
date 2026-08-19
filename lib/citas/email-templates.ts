/** Plantillas HTML de correos de citas — paridad con server.js legacy (Express). */

const BTN_PRIMARY =
  'background: linear-gradient(135deg, #c9a0dc 0%, #a0c4e8 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 30px; font-size: 16px; font-weight: bold';

const WRAPPER =
  'font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px';

export function emailPie(): string {
  const year = new Date().getFullYear();
  return `<hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, Helvetica, sans-serif; border-collapse: collapse; margin: 0 auto;">
              <tr>
                <td style="padding-right: 16px; vertical-align: top;">
                  <a href="https://www.psicologosenred.com" target="_blank" rel="noopener noreferrer">
                    <img src="https://www.psicologosenred.com/images/logo.png" alt="Psicólogos en Red" width="72" height="72" style="display: block; border: 0; width: 72px; height: 72px;" />
                  </a>
                </td>
                <td style="border-left: 3px solid #c9a0dc; padding-left: 16px; vertical-align: top;">
                  <p style="margin: 0 0 2px 0; font-size: 16px; font-weight: bold; color: #333333;">Psicólogos en Red</p>
                  <p style="margin: 0 0 10px 0; font-size: 12px; color: #888888;">Terapia en línea · Ciudad de México</p>
                  <p style="margin: 0 0 4px 0; font-size: 13px; color: #555555;">
                    <a href="mailto:contacto@psicologosenred.com" style="color: #769db1; text-decoration: none;">contacto@psicologosenred.com</a>
                  </p>
                  <p style="margin: 0 0 4px 0; font-size: 13px; color: #555555;">
                    <a href="https://wa.me/525530776194" style="color: #769db1; text-decoration: none;">+52 55 3077 6194</a>
                  </p>
                  <p style="margin: 0 0 10px 0; font-size: 13px;">
                    <a href="https://www.psicologosenred.com" style="color: #c9a0dc; text-decoration: none;">www.psicologosenred.com</a>
                  </p>
                  <p style="margin: 0; font-size: 12px;">
                    <a href="https://www.facebook.com/profile.php?id=100063577030818" style="color: #769db1; text-decoration: none;">Facebook</a>
                    <span style="color: #cccccc;"> · </span>
                    <a href="https://www.instagram.com/psicologos_en_red" style="color: #769db1; text-decoration: none;">Instagram</a>
                    <span style="color: #cccccc;"> · </span>
                    <a href="https://www.tiktok.com/@psicologos_en_red_" style="color: #769db1; text-decoration: none;">TikTok</a>
                  </p>
                </td>
              </tr>
            </table>
            <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">© ${year} Psicólogos en Red.</p>`;
}

export function emailHeader(): string {
  return `<div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #c9a0dc;">Psicólogos en Red</h1>
          </div>`;
}

export function emailBtn(href: string, label: string): string {
  return `<div style="text-align: center; margin: 30px 0;">
            <a href="${href}" style="${BTN_PRIMARY}">${label}</a>
          </div>`;
}

export function emailDetalleCita(
  lineas: Array<{ emoji: string; label: string; value: string }>,
): string {
  const items = lineas
    .map(
      (l) =>
        `<p style="margin: 8px 0;"><strong>${l.emoji} ${l.label}:</strong> ${l.value}</p>`,
    )
    .join('\n                ');
  return `<div style="background: #fdf2f7; padding: 20px; border-radius: 12px; margin: 20px 0;">
                ${items}
            </div>`;
}

function wrapEmail(body: string): string {
  return `<div style="${WRAPPER}">${body}${emailPie()}</div>`;
}

export type DetalleCitaEmail = {
  fechaStr: string;
  horaStr: string;
};

export function htmlCitaAgendadaPaciente(params: {
  primerNombre: string;
  detalle: DetalleCitaEmail;
  psicologoNombre: string;
  enlaceLogin: string;
}): string {
  const { primerNombre, detalle, psicologoNombre, enlaceLogin } = params;
  return wrapEmail(`
            ${emailHeader()}
            <h2 style="color: #333;">¡Hola ${primerNombre}!</h2>
            <p style="color: #666; font-size: 16px;">Es muy valioso que te preocupes por tu bienestar emocional. Has dado un paso importante al agendar tu sesión.</p>
            <p style="color: #666; font-size: 16px;">Aquí están los detalles de tu cita:</p>
            ${emailDetalleCita([
              { emoji: '📅', label: 'Fecha', value: detalle.fechaStr },
              { emoji: '🕐', label: 'Horario', value: `${detalle.horaStr} hrs` },
              { emoji: '👤', label: 'Especialista', value: psicologoNombre },
            ])}
            <p style="color: #666; font-size: 16px;">Puedes ver tus citas y acceder a tu sesión el día acordado desde tu cuenta.</p>
            ${emailBtn(enlaceLogin, 'Iniciar sesión')}`);
}

export function htmlCitaAgendadaPsicologo(params: {
  detalle: DetalleCitaEmail;
  pacienteNombre: string;
  enlaceLogin: string;
}): string {
  const { detalle, pacienteNombre, enlaceLogin } = params;
  return wrapEmail(`
            ${emailHeader()}
            <h2 style="color: #333;">Nueva cita agendada</h2>
            <p style="color: #666; font-size: 16px;">Un paciente ha agendado una sesión contigo. Es una gran señal que se preocupe por su bienestar emocional.</p>
            ${emailDetalleCita([
              { emoji: '📅', label: 'Fecha', value: detalle.fechaStr },
              { emoji: '🕐', label: 'Horario', value: `${detalle.horaStr} hrs` },
              { emoji: '👤', label: 'Paciente', value: pacienteNombre },
            ])}
            <p style="color: #666; font-size: 16px;">Revisa tu panel para ver tu agenda y el enlace de la sesión.</p>
            <p style="color: #888; font-size: 14px;">📎 Este correo incluye un archivo <strong>cita.ics</strong> para que puedas añadir la cita a tu calendario (Zoho Mail, Google Calendar, Outlook, etc.).</p>
            ${emailBtn(enlaceLogin, 'Iniciar sesión')}`);
}

export function htmlCitaReagendadaPaciente(params: {
  detalle: DetalleCitaEmail;
  psicologoNombre: string;
  enlaceLogin: string;
}): string {
  const { detalle, psicologoNombre, enlaceLogin } = params;
  return wrapEmail(`
            ${emailHeader()}
            <h2 style="color: #333;">Cita reagendada</h2>
            <p style="color: #666; font-size: 16px;">Tu sesión ha sido reagendada correctamente. Estos son los nuevos datos:</p>
            ${emailDetalleCita([
              { emoji: '📅', label: 'Nueva fecha', value: detalle.fechaStr },
              { emoji: '🕐', label: 'Nuevo horario', value: `${detalle.horaStr} hrs` },
              { emoji: '👤', label: 'Especialista', value: psicologoNombre },
            ])}
            ${emailBtn(enlaceLogin, 'Iniciar sesión')}`);
}

export function htmlCitaReagendadaPsicologo(params: {
  detalle: DetalleCitaEmail;
  pacienteNombre: string;
  enlaceLogin: string;
}): string {
  const { detalle, pacienteNombre, enlaceLogin } = params;
  return wrapEmail(`
            ${emailHeader()}
            <h2 style="color: #333;">Cita reagendada</h2>
            <p style="color: #666; font-size: 16px;">El paciente <strong>${pacienteNombre}</strong> ha reagendado la sesión. Nuevos datos:</p>
            ${emailDetalleCita([
              { emoji: '📅', label: 'Nueva fecha', value: detalle.fechaStr },
              { emoji: '🕐', label: 'Nuevo horario', value: `${detalle.horaStr} hrs` },
              { emoji: '👤', label: 'Paciente', value: pacienteNombre },
            ])}
            <p style="color: #888; font-size: 14px;">📎 Incluimos un archivo <strong>cita.ics</strong> para actualizar el evento en tu calendario (Zoho, Google, etc.).</p>
            ${emailBtn(enlaceLogin, 'Iniciar sesión')}`);
}

export function htmlCitaCanceladaPsicologo(params: {
  detalle: DetalleCitaEmail;
  pacienteNombre: string;
  enlaceLogin: string;
}): string {
  const { detalle, pacienteNombre, enlaceLogin } = params;
  return wrapEmail(`
            ${emailHeader()}
            <h2 style="color: #333;">Cita cancelada</h2>
            <p style="color: #666; font-size: 16px;">El paciente <strong>${pacienteNombre}</strong> ha cancelado la siguiente sesión:</p>
            ${emailDetalleCita([
              { emoji: '📅', label: 'Fecha', value: detalle.fechaStr },
              { emoji: '🕐', label: 'Horario', value: `${detalle.horaStr} hrs` },
              { emoji: '👤', label: 'Paciente', value: pacienteNombre },
            ])}
            <p style="color: #888; font-size: 14px;">📎 Incluimos un archivo <strong>cita-cancelada.ics</strong> para que el evento se quite de tu calendario (Zoho, Google, etc.).</p>
            ${emailBtn(enlaceLogin, 'Iniciar sesión')}`);
}

export function htmlCitaCanceladaPaciente(params: {
  detalle: DetalleCitaEmail;
  psicologoNombre: string;
  enlaceCatalogo: string;
}): string {
  const { detalle, psicologoNombre, enlaceCatalogo } = params;
  return wrapEmail(`
            ${emailHeader()}
            <h2 style="color: #333;">Cita cancelada</h2>
            <p style="color: #666; font-size: 16px;">Hemos registrado la cancelación de tu sesión del <strong>${detalle.fechaStr}</strong> a las <strong>${detalle.horaStr} hrs</strong> con ${psicologoNombre}.</p>
            <p style="color: #666; font-size: 16px;">Tu reembolso se emitirá en un plazo de <strong>5 a 10 días hábiles</strong> al mismo método de pago con el que realizaste el pago. Si tienes cualquier problema o duda respecto a tu reembolso, escríbenos a <strong>contacto@psicologosenred.com</strong>.</p>
            <p style="color: #666; font-size: 16px;">Te invitamos a reagendar cuando las condiciones sean óptimas para ti. Estamos aquí cuando lo necesites.</p>
            ${emailBtn(enlaceCatalogo, 'Agendar nueva cita')}`);
}

export function htmlRecordatorioPaciente(params: {
  primerNombre: string;
  psicologoNombre: string;
  detalle: DetalleCitaEmail;
  enlaceLogin: string;
}): string {
  const { primerNombre, psicologoNombre, detalle, enlaceLogin } = params;
  return wrapEmail(`
            ${emailHeader()}
            <h2 style="color: #333;">Recordatorio: tu sesión es en 30 minutos</h2>
            <p style="color: #666; font-size: 16px;">Hola ${primerNombre}, tu sesión con <strong>${psicologoNombre}</strong> es hoy.</p>
            ${emailDetalleCita([
              { emoji: '📅', label: 'Fecha', value: detalle.fechaStr },
              { emoji: '🕐', label: 'Horario', value: `${detalle.horaStr} hrs` },
            ])}
            <p style="color: #666; font-size: 16px;">Entra a tu cuenta y podrás iniciar la videollamada cuando sea la hora.</p>
            ${emailBtn(enlaceLogin, 'Iniciar sesión')}`);
}

export function htmlRecordatorioPsicologo(params: {
  pacienteNombre: string;
  detalle: DetalleCitaEmail;
  enlaceLogin: string;
}): string {
  const { pacienteNombre, detalle, enlaceLogin } = params;
  return wrapEmail(`
            ${emailHeader()}
            <h2 style="color: #333;">Recordatorio: sesión en 30 minutos</h2>
            <p style="color: #666; font-size: 16px;">Tienes una sesión programada con <strong>${pacienteNombre}</strong>.</p>
            ${emailDetalleCita([
              { emoji: '📅', label: 'Fecha', value: detalle.fechaStr },
              { emoji: '🕐', label: 'Horario', value: `${detalle.horaStr} hrs` },
            ])}
            <p style="color: #666; font-size: 16px;">Entra a tu panel para iniciar la videollamada cuando sea la hora.</p>
            ${emailBtn(enlaceLogin, 'Iniciar sesión')}`);
}

/** Botón post-cita (15/30/60 días) — legacy server.js */
export function emailBtnPostCita(enlaceLogin: string): string {
  return `<div style="text-align: center; margin: 25px 0;"><a href="${enlaceLogin}" style="background: linear-gradient(135deg, #c9a0dc 0%, #a0c4e8 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 30px; font-size: 16px; font-weight: bold;">Iniciar sesión y agendar</a></div>`;
}

export function htmlRecordatorioPostCitaDia15(params: {
  nombre: string;
  primerNombre: string;
  enlaceLogin: string;
}): string {
  const { nombre, primerNombre, enlaceLogin } = params;
  return wrapEmail(`
            ${emailHeader()}
            <h2 style="color: #333;">¿Cómo te has sentido estos últimos días, ${primerNombre}?</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">Hola, ${nombre}:</p>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">Ha pasado un par de semanas desde tu última sesión en Psicólogos en Red. Solo queríamos pasar a saludarte y recordarte que la constancia es la clave para ver cambios reales en tu bienestar.</p>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">A veces, la rutina diaria nos hace postergar lo más importante: nosotros mismos. Si estás listo para retomar tu proceso, tu terapeuta tiene espacios disponibles para ti.</p>
            ${emailBtnPostCita(enlaceLogin)}
            <p style="color: #666; font-size: 16px;">Tu espacio sigue aquí.</p>`);
}

export function htmlRecordatorioPostCitaDia30(params: {
  nombre: string;
  enlaceLogin: string;
}): string {
  const { nombre, enlaceLogin } = params;
  return wrapEmail(`
            ${emailHeader()}
            <h2 style="color: #333;">Un mes de tu última sesión: Reconecta con tus metas</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">Hola, ${nombre}:</p>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">Hoy se cumple un mes desde que nos vimos por última vez. Queríamos recordarte por qué decidiste iniciar este camino de terapia.</p>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">Sabemos que la vida se vuelve caótica, pero retomar tus sesiones es la mejor manera de mantener el equilibrio. No importa si sientes que "todo va bien" o si han surgido nuevos retos; cada sesión es un avance hacia la versión de ti que quieres construir.</p>
            ${emailBtnPostCita(enlaceLogin)}
            <p style="color: #666; font-size: 16px; line-height: 1.6;">Recuerda que si necesitas cambiar de especialista o explorar otra corriente, nuestro algoritmo de match siempre está disponible para ayudarte.</p>`);
}

export function htmlRecordatorioPostCitaDia60(params: {
  nombre: string;
  primerNombre: string;
  enlaceLogin: string;
}): string {
  const { nombre, primerNombre, enlaceLogin } = params;
  return wrapEmail(`
            ${emailHeader()}
            <h2 style="color: #333;">${primerNombre}, queremos apoyarte a retomar tu bienestar</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">Hola, ${nombre}:</p>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">Notamos que han pasado 60 días desde tu última consulta. En Psicólogos en Red creemos que la salud mental no debe ser algo que se atiende solo en crisis, sino un hábito de cuidado continuo.</p>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">Si el motivo de tu ausencia ha sido el tiempo, la logística o simplemente una pausa necesaria, queremos que sepas que es muy fácil volver a empezar.</p>
            <p style="color: #666; font-size: 16px;">¿Listo para tu siguiente paso? Revisa los horarios disponibles de tu especialista o descubre a nuevos profesionales aquí:</p>
            ${emailBtnPostCita(enlaceLogin)}
            <p style="color: #666; font-size: 16px;">Estamos aquí para acompañarte en la red de apoyo que mereces.</p>`);
}

/** Promo: primera sesión gratis (mismo look que recordatorios). */
export function htmlPromoPrimeraSesionGratis(params: {
  enlaceCatalogo: string;
}): string {
  const { enlaceCatalogo } = params;
  return wrapEmail(`
            ${emailHeader()}
            <h2 style="color: #333;">Tu primera sesión es gratis</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">Hola,</p>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">En Psicólogos en Red sabemos que dar el primer paso en terapia puede ser significativo. Es por eso que te invitamos a conocer nuestro servicio sin compromiso.</p>
            <p style="color: #666; font-size: 16px; line-height: 1.6;"><strong>Ahora puedes agendar tu primera sesión completamente gratis.</strong></p>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">Esta es una oportunidad para:</p>
            ${emailDetalleCita([
              { emoji: '👋', label: 'Conocer', value: 'a nuestros profesionales' },
              { emoji: '🔒', label: 'Conversar', value: 'en un espacio seguro y confidencial' },
              { emoji: '🌱', label: 'Explorar', value: 'cómo la terapia puede acompañarte' },
              { emoji: '💭', label: 'Decidir', value: 'si es el momento adecuado para ti' },
            ])}
            <p style="color: #666; font-size: 16px; line-height: 1.6;">Nuestro equipo está compuesto por psicólogos y psicólogas clínicas formados, que trabajan desde enfoques integradores y centrados en tus necesidades particulares. Cada sesión es diseñada para ser un espacio de confianza, respeto y acogida.</p>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">Si sientes que necesitas apoyo o simplemente quieres explorar esta posibilidad, estamos aquí para ti.</p>
            ${emailBtn(enlaceCatalogo, 'Agenda')}
            <p style="color: #666; font-size: 16px; line-height: 1.6;">Cualquier pregunta, puedes escribirnos sin dudas.</p>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">Atentamente,<br><strong>Psicólogos en Red</strong></p>`);
}

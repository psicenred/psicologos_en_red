/** Textos WhatsApp alineados al contenido de los correos de citas/chat. */

export type DetalleCitaWa = {
  fechaStr: string;
  horaStr: string;
};

function bloqueDetalle(lineas: Array<{ emoji: string; label: string; value: string }>): string {
  return lineas.map((l) => `${l.emoji} ${l.label}: ${l.value}`).join('\n');
}

function pieLogin(enlace: string, label = 'Iniciar sesión'): string {
  return `${label}:\n${enlace}`;
}

export function waCitaAgendadaPaciente(params: {
  primerNombre: string;
  detalle: DetalleCitaWa;
  psicologoNombre: string;
  enlaceLogin: string;
}): string {
  const { primerNombre, detalle, psicologoNombre, enlaceLogin } = params;
  return [
    '*Psicólogos en Red*',
    '✅ Cita agendada',
    '',
    `¡Hola ${primerNombre}!`,
    'Es muy valioso que te preocupes por tu bienestar emocional. Has dado un paso importante al agendar tu sesión.',
    '',
    'Detalles de tu cita:',
    bloqueDetalle([
      { emoji: '📅', label: 'Fecha', value: detalle.fechaStr },
      { emoji: '🕐', label: 'Horario', value: `${detalle.horaStr} hrs` },
      { emoji: '👤', label: 'Especialista', value: psicologoNombre },
    ]),
    '',
    'Puedes ver tus citas y acceder a tu sesión el día acordado desde tu cuenta.',
    pieLogin(enlaceLogin),
  ].join('\n');
}

export function waCitaAgendadaPsicologo(params: {
  detalle: DetalleCitaWa;
  pacienteNombre: string;
  enlaceLogin: string;
}): string {
  const { detalle, pacienteNombre, enlaceLogin } = params;
  return [
    '*Psicólogos en Red*',
    '📅 Nueva cita agendada',
    '',
    'Un paciente ha agendado una sesión contigo.',
    '',
    bloqueDetalle([
      { emoji: '📅', label: 'Fecha', value: detalle.fechaStr },
      { emoji: '🕐', label: 'Horario', value: `${detalle.horaStr} hrs` },
      { emoji: '👤', label: 'Paciente', value: pacienteNombre },
    ]),
    '',
    'Revisa tu panel para ver tu agenda y el enlace de la sesión.',
    pieLogin(enlaceLogin),
  ].join('\n');
}

export function waCitaReagendadaPaciente(params: {
  detalle: DetalleCitaWa;
  psicologoNombre: string;
  enlaceLogin: string;
}): string {
  const { detalle, psicologoNombre, enlaceLogin } = params;
  return [
    '*Psicólogos en Red*',
    '📅 Cita reagendada',
    '',
    'Tu sesión ha sido reagendada correctamente. Nuevos datos:',
    '',
    bloqueDetalle([
      { emoji: '📅', label: 'Nueva fecha', value: detalle.fechaStr },
      { emoji: '🕐', label: 'Nuevo horario', value: `${detalle.horaStr} hrs` },
      { emoji: '👤', label: 'Especialista', value: psicologoNombre },
    ]),
    '',
    pieLogin(enlaceLogin),
  ].join('\n');
}

export function waCitaReagendadaPsicologo(params: {
  detalle: DetalleCitaWa;
  pacienteNombre: string;
  enlaceLogin: string;
}): string {
  const { detalle, pacienteNombre, enlaceLogin } = params;
  return [
    '*Psicólogos en Red*',
    '📅 Cita reagendada',
    '',
    `El paciente *${pacienteNombre}* ha reagendado la sesión. Nuevos datos:`,
    '',
    bloqueDetalle([
      { emoji: '📅', label: 'Nueva fecha', value: detalle.fechaStr },
      { emoji: '🕐', label: 'Nuevo horario', value: `${detalle.horaStr} hrs` },
      { emoji: '👤', label: 'Paciente', value: pacienteNombre },
    ]),
    '',
    pieLogin(enlaceLogin),
  ].join('\n');
}

export function waCitaCanceladaPsicologo(params: {
  detalle: DetalleCitaWa;
  pacienteNombre: string;
  enlaceLogin: string;
}): string {
  const { detalle, pacienteNombre, enlaceLogin } = params;
  return [
    '*Psicólogos en Red*',
    '❌ Cita cancelada',
    '',
    `El paciente *${pacienteNombre}* ha cancelado la siguiente sesión:`,
    '',
    bloqueDetalle([
      { emoji: '📅', label: 'Fecha', value: detalle.fechaStr },
      { emoji: '🕐', label: 'Horario', value: `${detalle.horaStr} hrs` },
      { emoji: '👤', label: 'Paciente', value: pacienteNombre },
    ]),
    '',
    pieLogin(enlaceLogin),
  ].join('\n');
}

export function waCitaCanceladaPaciente(params: {
  detalle: DetalleCitaWa;
  psicologoNombre: string;
  enlaceCatalogo: string;
}): string {
  const { detalle, psicologoNombre, enlaceCatalogo } = params;
  return [
    '*Psicólogos en Red*',
    '❌ Cita cancelada',
    '',
    `Hemos registrado la cancelación de tu sesión del *${detalle.fechaStr}* a las *${detalle.horaStr} hrs* con ${psicologoNombre}.`,
    '',
    'Tu reembolso se emitirá en un plazo de *5 a 10 días hábiles* al mismo método de pago. Si tienes dudas: contacto@psicologosenred.com',
    '',
    'Te invitamos a reagendar cuando sea el momento adecuado para ti.',
    `Agendar nueva cita:\n${enlaceCatalogo}`,
  ].join('\n');
}

export function waRecordatorioPaciente(params: {
  primerNombre: string;
  psicologoNombre: string;
  detalle: DetalleCitaWa;
  enlaceLogin: string;
}): string {
  const { primerNombre, psicologoNombre, detalle, enlaceLogin } = params;
  return [
    '*Psicólogos en Red*',
    '⏰ Recordatorio: tu sesión es en 30 minutos',
    '',
    `Hola ${primerNombre}, tu sesión con *${psicologoNombre}* es hoy.`,
    '',
    bloqueDetalle([
      { emoji: '📅', label: 'Fecha', value: detalle.fechaStr },
      { emoji: '🕐', label: 'Horario', value: `${detalle.horaStr} hrs` },
    ]),
    '',
    'Entra a tu cuenta para iniciar la videollamada cuando sea la hora.',
    pieLogin(enlaceLogin),
  ].join('\n');
}

export function waRecordatorioPsicologo(params: {
  pacienteNombre: string;
  detalle: DetalleCitaWa;
  enlaceLogin: string;
}): string {
  const { pacienteNombre, detalle, enlaceLogin } = params;
  return [
    '*Psicólogos en Red*',
    '⏰ Recordatorio: sesión en 30 minutos',
    '',
    `Tienes una sesión programada con *${pacienteNombre}*.`,
    '',
    bloqueDetalle([
      { emoji: '📅', label: 'Fecha', value: detalle.fechaStr },
      { emoji: '🕐', label: 'Horario', value: `${detalle.horaStr} hrs` },
    ]),
    '',
    'Entra a tu panel para iniciar la videollamada cuando sea la hora.',
    pieLogin(enlaceLogin),
  ].join('\n');
}

export function waRecordatorioPostCitaDia15(params: {
  primerNombre: string;
  enlaceLogin: string;
}): string {
  const { primerNombre, enlaceLogin } = params;
  return [
    '*Psicólogos en Red*',
    `¿Cómo te has sentido estos últimos días, ${primerNombre}?`,
    '',
    'Ha pasado un par de semanas desde tu última sesión. La constancia es clave para ver cambios reales en tu bienestar.',
    '',
    'Si estás listo para retomar, tu terapeuta tiene espacios disponibles.',
    '',
    'Tu espacio sigue aquí.',
    pieLogin(enlaceLogin, 'Iniciar sesión y agendar'),
  ].join('\n');
}

export function waRecordatorioPostCitaDia30(params: {
  primerNombre: string;
  enlaceLogin: string;
}): string {
  const { primerNombre, enlaceLogin } = params;
  return [
    '*Psicólogos en Red*',
    'Un mes de tu última sesión: reconecta con tus metas',
    '',
    `Hola ${primerNombre}, hoy se cumple un mes desde tu última sesión.`,
    '',
    'Retomar tus sesiones es la mejor manera de mantener el equilibrio. Cada sesión es un avance hacia la versión de ti que quieres construir.',
    '',
    pieLogin(enlaceLogin, 'Iniciar sesión y agendar'),
  ].join('\n');
}

export function waRecordatorioPostCitaDia60(params: {
  primerNombre: string;
  enlaceLogin: string;
}): string {
  const { primerNombre, enlaceLogin } = params;
  return [
    '*Psicólogos en Red*',
    `${primerNombre}, queremos apoyarte a retomar tu bienestar`,
    '',
    'Han pasado 60 días desde tu última consulta. La salud mental merece cuidado continuo, no solo en crisis.',
    '',
    'Es muy fácil volver a empezar: revisa horarios de tu especialista o descubre nuevos profesionales.',
    '',
    'Estamos aquí para acompañarte.',
    pieLogin(enlaceLogin, 'Iniciar sesión y agendar'),
  ].join('\n');
}

export function waNotificacionChat(params: {
  primerNombre: string;
  nombreRemitente: string;
  enlaceLogin: string;
}): string {
  const { primerNombre, nombreRemitente, enlaceLogin } = params;
  return [
    '*Psicólogos en Red*',
    '💬 Te están escribiendo',
    '',
    `Hola ${primerNombre}, *${nombreRemitente}* está tratando de comunicarse contigo.`,
    '',
    'Inicia sesión para ver el mensaje.',
    pieLogin(enlaceLogin),
  ].join('\n');
}

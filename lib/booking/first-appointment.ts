import { MOTIVO_OTRO_VALUE } from '@/lib/booking/constants';

export function isIndividualService(servicio: string): boolean {
  return servicio.toLowerCase().includes('individual');
}

export function resolveMotivoDeConsulta(
  motivo: string,
  motivoOtro: string,
): string | null {
  const trimmed = motivo.trim();
  if (!trimmed) return null;
  if (trimmed === MOTIVO_OTRO_VALUE) {
    const otro = motivoOtro.trim();
    return otro ? otro.slice(0, 200) : null;
  }
  return trimmed.slice(0, 200);
}

export function validateFirstAppointmentBooking(input: {
  esPacienteNuevo: boolean;
  servicioInteres: string;
  motivoConsulta: string;
  motivoOtro: string;
}): { ok: true; motivoDeConsulta?: string } | { ok: false; errorKey: string } {
  const servicio = input.servicioInteres.trim();
  if (!servicio) {
    return { ok: false, errorKey: 'serviceRequired' };
  }

  if (input.motivoConsulta.trim() === MOTIVO_OTRO_VALUE && !input.motivoOtro.trim()) {
    return { ok: false, errorKey: 'motivoOtroRequired' };
  }

  const motivo = resolveMotivoDeConsulta(input.motivoConsulta, input.motivoOtro);
  if (input.esPacienteNuevo && isIndividualService(servicio) && !motivo) {
    return { ok: false, errorKey: 'motivoRequired' };
  }

  return { ok: true, ...(motivo ? { motivoDeConsulta: motivo } : {}) };
}

/** Convierte teléfono guardado en BD a E.164 (+52..., +1..., etc.). */
export function normalizarTelefonoE164(
  telefono: string | null | undefined,
): string | null {
  if (!telefono || typeof telefono !== 'string') return null;

  const trimmed = telefono.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('+')) {
    const digits = trimmed.replace(/\D/g, '');
    return digits.length >= 10 ? `+${digits}` : null;
  }

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return `+52${digits}`;
  if (digits.length === 12 && digits.startsWith('52')) return `+${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length >= 10) return `+${digits}`;

  return null;
}

export function telefonoToWhatsappJid(e164: string): string {
  const digits = e164.replace(/\D/g, '');
  return `${digits}@s.whatsapp.net`;
}

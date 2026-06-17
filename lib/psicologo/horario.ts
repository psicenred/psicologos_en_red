/** Normaliza hora a hora completa: inicio = piso, fin = techo. */
export function normalizarHoraCompleta(
  timeStr: string | null | undefined,
  tipo: 'inicio' | 'fin',
): string | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const parts = timeStr.trim().split(':');
  const h = parseInt(parts[0], 10);
  const m = parts.length >= 2 ? parseInt(parts[1], 10) : 0;
  if (Number.isNaN(h) || h < 0 || h > 23) return null;
  if (tipo === 'inicio') return `${String(h).padStart(2, '0')}:00:00`;
  if (tipo === 'fin') {
    const nextH = m > 0 ? h + 1 : h;
    if (nextH >= 24) return '23:59:59';
    return `${String(nextH).padStart(2, '0')}:00:00`;
  }
  return null;
}

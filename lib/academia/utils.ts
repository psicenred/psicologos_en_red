export function slugifyTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function formatMxn(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatLabel(value: string): string {
  const labels: Record<string, string> = {
    sync: 'Síncrono',
    async: 'Asíncrono',
    draft: 'Borrador',
    published: 'Publicado',
    archived: 'Archivado',
    active: 'Activo',
    pending: 'Pendiente',
    paid: 'Pagado',
  };
  return labels[value] ?? value;
}

import { query } from '@/lib/db';

export function quitarEtiquetasHtml(html: string): string {
  if (!html) return '';
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizarPalabrasClave(input: unknown): string[] {
  const base = Array.isArray(input)
    ? input
    : String(input || '').split(',');
  const limpias = base
    .map((v) => String(v || '').trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(limpias)].slice(0, 25);
}

export function crearSlug(texto: unknown): string {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function slugUnico(
  baseSlug: string,
  excluirId: number | null,
): Promise<string> {
  const base = (baseSlug && String(baseSlug).trim()) || 'articulo';
  let intento = base;
  let i = 1;
  while (i < 200) {
    const q = excluirId
      ? await query(
          'SELECT 1 FROM blog_articulos WHERE slug = $1 AND id <> $2 LIMIT 1',
          [intento, excluirId],
        )
      : await query(
          'SELECT 1 FROM blog_articulos WHERE slug = $1 LIMIT 1',
          [intento],
        );
    if (q.rows.length === 0) return intento;
    i += 1;
    intento = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

/** Normaliza columnas text[] / json de Postgres que a veces llegan como string. */
export function asStringArray(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    const s = value.trim();
    if (!s) return [];
    if (s.startsWith('{') && s.endsWith('}')) {
      return parsePostgresArrayLiteral(s);
    }
    if (s.startsWith('[')) {
      try {
        const parsed = JSON.parse(s) as unknown;
        if (Array.isArray(parsed)) {
          return parsed.map((x) => String(x).trim()).filter(Boolean);
        }
      } catch {
        /* literal simple */
      }
    }
    return [s];
  }
  return [];
}

function parsePostgresArrayLiteral(literal: string): string[] {
  const inner = literal.slice(1, -1);
  if (!inner) return [];
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (c === ',' && !inQuotes) {
      if (current.trim()) result.push(current.trim());
      current = '';
      continue;
    }
    current += c;
  }
  if (current.trim()) result.push(current.trim());
  return result;
}

/** Anonimiza nombre completo: "María García López" → "María G." */
export function anonymizeDisplayName(fullName: string | null | undefined): string {
  const trimmed = (fullName || '').trim();
  if (!trimmed) return 'Usuario';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!;
  const first = parts[0]!;
  const initial = parts[1]!.charAt(0).toUpperCase();
  return `${first} ${initial}.`;
}

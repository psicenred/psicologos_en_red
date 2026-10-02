/** Nombre del campo honeypot (parece un campo real de formulario). */
export const HONEYPOT_FIELD_NAME = 'company_url' as const;

/** true si un bot rellenó el honeypot. */
export function isHoneypotTriggered(value: unknown): boolean {
  if (value == null) return false;
  return String(value).trim().length > 0;
}

/** Inscripción directa sin Stripe (demo / desarrollo). */
export function isAcademiaFreeEnrollmentEnabled(): boolean {
  const v = process.env.ACADEMIA_SKIP_PAYMENT?.trim().toLowerCase();
  if (v === 'false' || v === '0' || v === 'no') return false;
  if (v === 'true' || v === '1' || v === 'yes') return true;
  return process.env.NODE_ENV === 'development';
}

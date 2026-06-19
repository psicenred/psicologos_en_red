/** Combina código de país (+52) y número local en formato E.164 simplificado. */
export function formatPhoneWithCountryCode(
  countryDial: string,
  localNumber: string,
): string {
  const localDigits = localNumber.replace(/\D/g, '');
  if (!localDigits) return '';

  const dialDigits = countryDial.replace(/\D/g, '');
  if (!dialDigits) return localDigits;

  return `+${dialDigits}${localDigits}`;
}

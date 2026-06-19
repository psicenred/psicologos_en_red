export type PhoneCountryCode = {
  dial: string;
  labelEs: string;
  labelEn: string;
};

/** Códigos telefónicos frecuentes en LATAM, Norteamérica y España. */
export const PHONE_COUNTRY_CODES: PhoneCountryCode[] = [
  { dial: '+52', labelEs: 'México', labelEn: 'Mexico' },
  { dial: '+1', labelEs: 'Estados Unidos / Canadá', labelEn: 'United States / Canada' },
  { dial: '+54', labelEs: 'Argentina', labelEn: 'Argentina' },
  { dial: '+57', labelEs: 'Colombia', labelEn: 'Colombia' },
  { dial: '+56', labelEs: 'Chile', labelEn: 'Chile' },
  { dial: '+51', labelEs: 'Perú', labelEn: 'Peru' },
  { dial: '+34', labelEs: 'España', labelEn: 'Spain' },
  { dial: '+593', labelEs: 'Ecuador', labelEn: 'Ecuador' },
  { dial: '+58', labelEs: 'Venezuela', labelEn: 'Venezuela' },
  { dial: '+502', labelEs: 'Guatemala', labelEn: 'Guatemala' },
  { dial: '+506', labelEs: 'Costa Rica', labelEn: 'Costa Rica' },
  { dial: '+507', labelEs: 'Panamá', labelEn: 'Panama' },
  { dial: '+591', labelEs: 'Bolivia', labelEn: 'Bolivia' },
  { dial: '+595', labelEs: 'Paraguay', labelEn: 'Paraguay' },
  { dial: '+598', labelEs: 'Uruguay', labelEn: 'Uruguay' },
  { dial: '+55', labelEs: 'Brasil', labelEn: 'Brazil' },
  { dial: '+503', labelEs: 'El Salvador', labelEn: 'El Salvador' },
  { dial: '+504', labelEs: 'Honduras', labelEn: 'Honduras' },
  { dial: '+505', labelEs: 'Nicaragua', labelEn: 'Nicaragua' },
  { dial: '+53', labelEs: 'Cuba', labelEn: 'Cuba' },
  { dial: '+1809', labelEs: 'República Dominicana', labelEn: 'Dominican Republic' },
  { dial: '+44', labelEs: 'Reino Unido', labelEn: 'United Kingdom' },
  { dial: '+49', labelEs: 'Alemania', labelEn: 'Germany' },
  { dial: '+33', labelEs: 'Francia', labelEn: 'France' },
  { dial: '+39', labelEs: 'Italia', labelEn: 'Italy' },
];

export const DEFAULT_PHONE_COUNTRY_DIAL = '+52';

export function phoneCountryLabel(
  entry: PhoneCountryCode,
  locale: string,
): string {
  return locale.startsWith('en') ? entry.labelEn : entry.labelEs;
}

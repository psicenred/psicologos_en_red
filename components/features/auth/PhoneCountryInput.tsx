'use client';

import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  DEFAULT_PHONE_COUNTRY_DIAL,
  PHONE_COUNTRY_CODES,
  phoneCountryLabel,
} from '@/lib/phone/country-codes';
import { Input } from '@/components/ui/input';

const selectClassName =
  'flex h-10 w-[7.5rem] shrink-0 rounded-md border border-input bg-background px-2 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

type PhoneCountryInputProps = {
  countryDial: string;
  localNumber: string;
  onCountryDialChange: (dial: string) => void;
  onLocalNumberChange: (number: string) => void;
  countryError?: string;
  numberError?: string;
  countryLabel: string;
  numberPlaceholder: string;
  numberId?: string;
  countryId?: string;
};

export function PhoneCountryInput({
  countryDial,
  localNumber,
  onCountryDialChange,
  onLocalNumberChange,
  countryError,
  numberError,
  countryLabel,
  numberPlaceholder,
  numberId = 'telefono_numero',
  countryId = 'codigo_pais',
}: PhoneCountryInputProps) {
  const locale = useLocale();

  return (
    <div className="space-y-1">
      <span className="sr-only">{countryLabel}</span>
      <div className="flex gap-2">
        <select
          id={countryId}
          aria-label={countryLabel}
          className={cn(selectClassName, countryError && 'border-destructive')}
          value={countryDial || DEFAULT_PHONE_COUNTRY_DIAL}
          onChange={(e) => onCountryDialChange(e.target.value)}
        >
          {PHONE_COUNTRY_CODES.map((entry) => (
            <option key={entry.dial} value={entry.dial}>
              {entry.dial} {phoneCountryLabel(entry, locale)}
            </option>
          ))}
        </select>
        <Input
          id={numberId}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder={numberPlaceholder}
          className={cn('flex-1', numberError && 'border-destructive')}
          value={localNumber}
          onChange={(e) => onLocalNumberChange(e.target.value)}
        />
      </div>
      {countryError ? (
        <p className="text-xs text-destructive">{countryError}</p>
      ) : numberError ? (
        <p className="text-xs text-destructive">{numberError}</p>
      ) : null}
    </div>
  );
}

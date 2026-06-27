'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { persistReferralCodeFromParam } from '@/lib/referral/client';

/** Captura ?ref=CODIGO en /registro y lo guarda en localStorage. */
export function ReferralRefCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    persistReferralCodeFromParam(searchParams.get('ref'));
  }, [searchParams]);

  return null;
}

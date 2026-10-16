'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/push/client';

/** Registra el Service Worker en HTTPS / localhost (necesario para Web Push). */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const { protocol, hostname } = window.location;
    const ok =
      protocol === 'https:' ||
      hostname === 'localhost' ||
      hostname === '127.0.0.1';
    if (!ok) return;
    void registerServiceWorker();
  }, []);

  return null;
}

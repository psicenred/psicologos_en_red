'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { getZonaNavegador } from '@/lib/timezone-client';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { DateTimePicker } from '@/components/features/citas/DateTimePicker';
import { minSessionPrice } from '@/lib/catalog-pricing';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import type { Psicologo } from '@/components/features/catalogo/CatalogoClient';

type RegionState = {
  currency: string;
  amount: number;
  inMexico?: boolean;
  regionUnknown?: boolean;
};

export function AgendarDialog({
  psicologo,
  open,
  onOpenChange,
  region,
}: {
  psicologo: Psicologo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  region?: RegionState;
}) {
  const t = useTranslations('catalog');
  const [mounted, setMounted] = useState(false);
  const [fecha, setFecha] = useState<Date | undefined>();
  const [hora, setHora] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [precio, setPrecio] = useState<{ amount: number; currency: string } | null>(null);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const onCloseRef = useRef(() => onOpenChange(false));

  onCloseRef.current = () => onOpenChange(false);

  useBodyScrollLock(open);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setFecha(undefined);
      setHora('');
      setError('');
      setPrecio(null);
      setLoggedIn(null);
      return;
    }
    fetch('/api/estado-sesion')
      .then((r) => r.json())
      .then((d) => setLoggedIn(!!d.autenticado))
      .catch(() => setLoggedIn(false));

    if (region && !region.regionUnknown && region.currency && psicologo) {
      setPrecio({
        amount: minSessionPrice(psicologo, region.currency),
        currency: region.currency,
      });
    } else if (region && !region.regionUnknown && region.currency) {
      setPrecio({ amount: region.amount, currency: region.currency });
    } else {
      setPrecio(null);
    }
  }, [open, psicologo, region]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  async function confirmar() {
    if (!psicologo || !fecha || !hora) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/crear-sesion-pago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          psicologo_id: psicologo.id,
          fecha: format(fecha, 'yyyy-MM-dd'),
          hora,
          zona_horaria_paciente: getZonaNavegador(),
          currency: region?.currency || undefined,
          success_url: `${window.location.origin}/perfil?pago=exito`,
          cancel_url: `${window.location.origin}/catalogo`,
        }),
      });
      if (res.status === 401) {
        setLoggedIn(false);
        setError(t('loginRequired'));
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t('loginRequired'));
        return;
      }
      if (data.url) window.location.href = data.url;
    } catch {
      setError(t('loginRequired'));
    } finally {
      setLoading(false);
    }
  }

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="catalogo-agendar-overlay"
      style={{
        display: 'flex',
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 10001,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCloseRef.current();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="grid w-full max-w-lg gap-4 rounded-lg border bg-background p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold leading-none tracking-tight">
            {psicologo ? t('bookWith', { name: psicologo.nombre }) : t('book')}
          </h2>
          <button
            type="button"
            onClick={() => onCloseRef.current()}
            className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
            aria-label={t('closeProfile')}
          >
            ×
          </button>
        </div>

        {loggedIn === false ? (
          <div className="space-y-3 text-sm">
            <p>{t('loginRequired')}</p>
            <div className="flex gap-2">
              <Button asChild>
                <Link href={`/login?redirect=${encodeURIComponent('/catalogo')}`}>
                  {t('login')}
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/registro">{t('register')}</Link>
              </Button>
            </div>
          </div>
        ) : psicologo ? (
          <div className="space-y-4">
            {precio ? (
              <p className="text-sm text-muted-foreground">
                {t('sessionPrice')}:{' '}
                <strong>
                  {precio.currency === 'USD' ? 'US$' : '$'}
                  {precio.amount} {precio.currency}
                </strong>
              </p>
            ) : null}
            <DateTimePicker
              psicologoId={psicologo.id}
              fecha={fecha}
              setFecha={setFecha}
              hora={hora}
              setHora={setHora}
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button
              className="w-full"
              disabled={!fecha || !hora || loading || loggedIn === null}
              onClick={confirmar}
            >
              {loading ? t('redirectingPay') : t('continuePay')}
            </Button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

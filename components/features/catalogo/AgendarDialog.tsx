'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DateTimePicker } from '@/components/features/citas/DateTimePicker';
import { minSessionPrice } from '@/lib/catalog-pricing';
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
  const [fecha, setFecha] = useState<Date | undefined>();
  const [hora, setHora] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [precio, setPrecio] = useState<{ amount: number; currency: string } | null>(null);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    if (!open) {
      setFecha(undefined);
      setHora('');
      setError('');
      setPrecio(null);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {psicologo ? t('bookWith', { name: psicologo.nombre }) : t('book')}
          </DialogTitle>
        </DialogHeader>
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
      </DialogContent>
    </Dialog>
  );
}

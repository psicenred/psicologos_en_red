'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { getZonaNavegador } from '@/lib/timezone-client';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { PerfilGestionCitaFields } from '@/components/features/perfil/PerfilGestionCitaFields';
import { minSessionPrice } from '@/lib/catalog-pricing';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import type { Psicologo } from '@/components/features/catalogo/CatalogoClient';
import '@/components/features/perfil/perfil-legacy.css';

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
      if (e.key === 'Escape' && !loading) onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, loading]);

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
      className="perfil-modal-overlay catalogo-agendar-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gestion-cita-titulo"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onCloseRef.current();
      }}
    >
      <div
        className="perfil-modal perfil-modal-gestion-cita"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="gestion-cita-titulo">
          {psicologo ? t('bookWith', { name: psicologo.nombre }) : t('book')}
        </h3>

        {loggedIn === false ? (
          <div className="gestion-cita-login">
            <p>{t('loginRequired')}</p>
            <div className="perfil-modal-actions">
              <Link
                href={`/login?redirect=${encodeURIComponent('/catalogo')}`}
                className="btn-primary"
                style={{ textAlign: 'center', textDecoration: 'none' }}
              >
                {t('login')}
              </Link>
              <Link
                href="/registro"
                className="btn-primary"
                style={{
                  textAlign: 'center',
                  textDecoration: 'none',
                  background: '#fff',
                  color: 'var(--primario-rosa)',
                  border: '1px solid var(--primario-rosa)',
                }}
              >
                {t('register')}
              </Link>
            </div>
          </div>
        ) : psicologo ? (
          <>
            {precio ? (
              <p className="perfil-modal-subtitulo">
                {t('sessionPrice')}:{' '}
                <strong>
                  {precio.currency === 'USD' ? 'US$' : '$'}
                  {precio.amount} {precio.currency}
                </strong>
              </p>
            ) : null}

            <PerfilGestionCitaFields
              psicologoId={psicologo.id}
              fecha={fecha}
              setFecha={setFecha}
              hora={hora}
              setHora={setHora}
            />

            {error ? <p className="gestion-cita-error">{error}</p> : null}

            <div className="perfil-modal-actions">
              <button
                type="button"
                disabled={loading}
                onClick={() => onCloseRef.current()}
              >
                {t('closeProfile')}
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={!fecha || !hora || loading || loggedIn === null}
                onClick={confirmar}
              >
                {loading ? t('redirectingPay') : t('continuePay')}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

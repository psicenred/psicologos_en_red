'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { getZonaNavegador } from '@/lib/timezone-client';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { AgendarBookingExtraFields } from '@/components/features/citas/AgendarBookingExtraFields';
import { PerfilGestionCitaFields } from '@/components/features/perfil/PerfilGestionCitaFields';
import { ORIGEN_RECOMENDACION } from '@/lib/booking/constants';
import { validateFirstAppointmentBooking } from '@/lib/booking/first-appointment';
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
  const [servicioInteres, setServicioInteres] = useState('');
  const [motivoConsulta, setMotivoConsulta] = useState('');
  const [motivoOtro, setMotivoOtro] = useState('');
  const [origenConocimiento, setOrigenConocimiento] = useState('');
  const [recomendadoPor, setRecomendadoPor] = useState('');
  const [esPacienteNuevo, setEsPacienteNuevo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const onCloseRef = useRef(() => onOpenChange(false));

  onCloseRef.current = () => onOpenChange(false);

  useBodyScrollLock(open);

  useEffect(() => {
    setMounted(true);
  }, []);

  function resetBookingFields() {
    setFecha(undefined);
    setHora('');
    setServicioInteres('');
    setMotivoConsulta('');
    setMotivoOtro('');
    setOrigenConocimiento('');
    setRecomendadoPor('');
    setEsPacienteNuevo(false);
    setError('');
  }

  useEffect(() => {
    if (!open) {
      resetBookingFields();
      setLoggedIn(null);
      return;
    }

    fetch('/api/estado-sesion')
      .then((r) => r.json())
      .then((d) => {
        const autenticado = !!d.autenticado;
        setLoggedIn(autenticado);
        if (autenticado) {
          return fetch('/api/soy-paciente-nuevo', { credentials: 'same-origin' })
            .then((r) => r.json())
            .then((data: { nuevo?: boolean }) => setEsPacienteNuevo(data.nuevo === true))
            .catch(() => setEsPacienteNuevo(false));
        }
        setEsPacienteNuevo(false);
      })
      .catch(() => setLoggedIn(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, loading]);

  function handleServicioChange(value: string) {
    setServicioInteres(value);
    setMotivoConsulta('');
    setMotivoOtro('');
  }

  async function confirmar() {
    if (!psicologo || !fecha || !hora) return;

    if (region?.regionUnknown || !region?.currency) {
      setError(t('selectRegionForPrices'));
      return;
    }

    const servicios = (psicologo.servicios ?? []).filter(Boolean);
    if (servicios.length === 0) {
      setError(t('noServicesToBook'));
      return;
    }

    const validation = validateFirstAppointmentBooking({
      esPacienteNuevo,
      servicioInteres,
      motivoConsulta,
      motivoOtro,
    });
    if (!validation.ok) {
      setError(t(validation.errorKey));
      return;
    }

    setLoading(true);
    setError('');

    const payload: Record<string, string | number | undefined> = {
      psicologo_id: psicologo.id,
      fecha: format(fecha, 'yyyy-MM-dd'),
      hora,
      servicio_interes: servicioInteres,
      zona_horaria_paciente: getZonaNavegador(),
      currency: region.currency,
      success_url: `${window.location.origin}/perfil?pago=exito`,
      cancel_url: `${window.location.origin}/catalogo`,
    };

    if (validation.motivoDeConsulta) {
      payload.motivo_de_consulta = validation.motivoDeConsulta;
    }

    if (esPacienteNuevo && origenConocimiento.trim()) {
      payload.origen_conocimiento = origenConocimiento.trim();
      if (
        origenConocimiento === ORIGEN_RECOMENDACION &&
        recomendadoPor.trim()
      ) {
        payload.recomendado_por = recomendadoPor.trim().slice(0, 200);
      }
    }

    try {
      const res = await fetch('/api/crear-sesion-pago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        setLoggedIn(false);
        setError(t('loginRequired'));
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t('paymentStartError'));
        return;
      }
      if (data.url) window.location.href = data.url;
    } catch {
      setError(t('paymentStartError'));
    } finally {
      setLoading(false);
    }
  }

  const serviciosDisponibles = (psicologo?.servicios ?? []).filter(Boolean);
  const canSubmit =
    !!fecha &&
    !!hora &&
    !!servicioInteres &&
    serviciosDisponibles.length > 0 &&
    !loading &&
    loggedIn === true &&
    !region?.regionUnknown;

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
        className="perfil-modal perfil-modal-gestion-cita perfil-modal-gestion-cita-wide"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="perfil-modal-gestion-cita-header">
          <h3 id="gestion-cita-titulo">
            {psicologo ? t('bookWith', { name: psicologo.nombre }) : t('book')}
          </h3>
        </div>

        {loggedIn === false ? (
          <>
            <div className="perfil-modal-gestion-cita-body">
              <div className="gestion-cita-login">
                <p>{t('loginRequired')}</p>
              </div>
            </div>
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
          </>
        ) : psicologo ? (
          <>
            <div className="perfil-modal-gestion-cita-body">
              <PerfilGestionCitaFields
                psicologoId={psicologo.id}
                fecha={fecha}
                setFecha={setFecha}
                hora={hora}
                setHora={setHora}
                floatingCalendar
              />

              <AgendarBookingExtraFields
                psicologo={psicologo}
                currency={region?.currency ?? ''}
                regionUnknown={region?.regionUnknown}
                esPacienteNuevo={esPacienteNuevo}
                servicioInteres={servicioInteres}
                onServicioChange={handleServicioChange}
                motivoConsulta={motivoConsulta}
                onMotivoChange={setMotivoConsulta}
                motivoOtro={motivoOtro}
                onMotivoOtroChange={setMotivoOtro}
                origenConocimiento={origenConocimiento}
                onOrigenChange={setOrigenConocimiento}
                recomendadoPor={recomendadoPor}
                onRecomendadoChange={setRecomendadoPor}
              />

              {error ? <p className="gestion-cita-error">{error}</p> : null}
            </div>

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
                disabled={!canSubmit}
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

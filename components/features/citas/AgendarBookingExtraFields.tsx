'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  MOTIVO_OTRO_VALUE,
  MOTIVOS_CONSULTA,
  ORIGEN_RECOMENDACION,
  ORIGENES_CONOCIMIENTO,
} from '@/lib/booking/constants';
import { isIndividualService } from '@/lib/booking/first-appointment';
import {
  sessionPriceForService,
  type PsicologoPricing,
} from '@/lib/catalog-pricing';

export type AgendarBookingExtraFieldsProps = {
  psicologo: PsicologoPricing & { servicios: string[] | null };
  currency: string;
  regionUnknown?: boolean;
  esPacienteNuevo: boolean;
  servicioInteres: string;
  onServicioChange: (value: string) => void;
  motivoConsulta: string;
  onMotivoChange: (value: string) => void;
  motivoOtro: string;
  onMotivoOtroChange: (value: string) => void;
  origenConocimiento: string;
  onOrigenChange: (value: string) => void;
  recomendadoPor: string;
  onRecomendadoChange: (value: string) => void;
};

export function AgendarBookingExtraFields({
  psicologo,
  currency,
  regionUnknown,
  esPacienteNuevo,
  servicioInteres,
  onServicioChange,
  motivoConsulta,
  onMotivoChange,
  motivoOtro,
  onMotivoOtroChange,
  origenConocimiento,
  onOrigenChange,
  recomendadoPor,
  onRecomendadoChange,
}: AgendarBookingExtraFieldsProps) {
  const t = useTranslations('catalog');

  const servicios = useMemo(
    () => (psicologo.servicios ?? []).filter(Boolean),
    [psicologo.servicios],
  );

  const mostrarMotivo =
    esPacienteNuevo && servicioInteres && isIndividualService(servicioInteres);
  const mostrarOrigen = esPacienteNuevo;
  const mostrarMotivoOtro = motivoConsulta === MOTIVO_OTRO_VALUE;
  const mostrarRecomendado = origenConocimiento === ORIGEN_RECOMENDACION;

  const precioSesion =
    servicioInteres && currency && !regionUnknown
      ? sessionPriceForService(psicologo, servicioInteres, currency)
      : null;

  return (
    <div className="gestion-cita-campos gestion-cita-campos-extra">
      <div className="gestion-cita-field">
        <label htmlFor="booking-servicio">{t('serviceInterest')}</label>
        <select
          id="booking-servicio"
          value={servicioInteres}
          onChange={(e) => onServicioChange(e.target.value)}
          required
        >
          <option value="" disabled>
            {t('chooseService')}
          </option>
          {servicios.length === 0 ? (
            <option value="" disabled>
              {t('noServices')}
            </option>
          ) : (
            servicios.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))
          )}
        </select>
      </div>

      {regionUnknown ? (
        <p className="gestion-cita-precio-hint">{t('selectRegionForPrices')}</p>
      ) : precioSesion != null ? (
        <p className="gestion-cita-precio-sesion">
          {t('sessionPriceSelected')}:{' '}
          <strong>
            {currency === 'USD' ? 'US$' : '$'}
            {precioSesion} {currency}
          </strong>
        </p>
      ) : servicioInteres ? null : (
        <p className="gestion-cita-precio-hint">{t('chooseServiceForPrice')}</p>
      )}

      {mostrarMotivo ? (
        <>
          <div className="gestion-cita-field">
            <label htmlFor="booking-motivo">
              {t('consultReason')} <span className="gestion-cita-required">*</span>
            </label>
            <select
              id="booking-motivo"
              value={motivoConsulta}
              onChange={(e) => onMotivoChange(e.target.value)}
              required
            >
              <option value="" disabled>
                {t('chooseConsultReason')}
              </option>
              {MOTIVOS_CONSULTA.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          {mostrarMotivoOtro ? (
            <div className="gestion-cita-field">
              <label htmlFor="booking-motivo-otro">{t('consultReasonOther')}</label>
              <textarea
                id="booking-motivo-otro"
                maxLength={200}
                rows={3}
                value={motivoOtro}
                onChange={(e) => onMotivoOtroChange(e.target.value)}
                placeholder={t('consultReasonOtherPlaceholder')}
                required
              />
              <small className="gestion-cita-hint">{t('consultReasonMax')}</small>
            </div>
          ) : null}
        </>
      ) : null}

      {mostrarOrigen ? (
        <>
          <div className="gestion-cita-field">
            <label htmlFor="booking-origen">{t('howDidYouHear')}</label>
            <select
              id="booking-origen"
              value={origenConocimiento}
              onChange={(e) => onOrigenChange(e.target.value)}
            >
              <option value="">—</option>
              {ORIGENES_CONOCIMIENTO.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          {mostrarRecomendado ? (
            <div className="gestion-cita-field">
              <label htmlFor="booking-recomendado">{t('recommendedBy')}</label>
              <input
                id="booking-recomendado"
                type="text"
                maxLength={200}
                value={recomendadoPor}
                onChange={(e) => onRecomendadoChange(e.target.value)}
                placeholder={t('recommendedByPlaceholder')}
              />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

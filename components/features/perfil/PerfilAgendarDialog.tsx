'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { fetchPrecioRegionClient } from '@/lib/geo-client';
import { PerfilGestionCitaFields } from '@/components/features/perfil/PerfilGestionCitaFields';

export function PerfilAgendarDialog({
  open,
  onOpenChange,
  psicologoId,
  psicologoNombre,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  psicologoId: number;
  psicologoNombre: string;
}) {
  const [fecha, setFecha] = useState<Date | undefined>();
  const [hora, setHora] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currency, setCurrency] = useState<string | undefined>();

  useEffect(() => {
    if (!open) {
      setFecha(undefined);
      setHora('');
      setError('');
      setCurrency(undefined);
      setLoading(false);
      return;
    }
    fetchPrecioRegionClient()
      .then((region) => {
        if (!region.regionUnknown && region.currency) {
          setCurrency(region.currency);
        }
      })
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, loading, onOpenChange]);

  async function confirmar() {
    if (!fecha || !hora) {
      setError('Selecciona fecha y hora.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/crear-sesion-pago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          psicologo_id: psicologoId,
          fecha: format(fecha, 'yyyy-MM-dd'),
          hora,
          servicio_interes: 'Sesión de psicoterapia',
          currency,
          success_url: `${window.location.origin}/perfil?pago=exito`,
          cancel_url: `${window.location.origin}/perfil`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo iniciar el pago. Intenta de nuevo.');
        setLoading(false);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError('No se pudo iniciar el pago. Intenta de nuevo.');
      setLoading(false);
    } catch {
      setError('Error de conexión');
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="perfil-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gestion-cita-titulo"
      onClick={() => !loading && onOpenChange(false)}
    >
      <div
        className="perfil-modal perfil-modal-gestion-cita"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="gestion-cita-titulo">Agendar cita</h3>
        {psicologoNombre ? (
          <p id="gestion-cita-subtitulo" className="perfil-modal-subtitulo">
            Psicólogo: {psicologoNombre}
          </p>
        ) : null}

        <PerfilGestionCitaFields
          psicologoId={psicologoId}
          fecha={fecha}
          setFecha={setFecha}
          hora={hora}
          setHora={setHora}
        />

        {error ? <p className="gestion-cita-error">{error}</p> : null}

        <div className="perfil-modal-actions">
          <button type="button" disabled={loading} onClick={() => onOpenChange(false)}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!fecha || !hora || loading}
            onClick={confirmar}
          >
            {loading ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

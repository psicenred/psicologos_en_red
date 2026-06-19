'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { getZonaNavegador } from '@/lib/timezone-client';
import { PerfilGestionCitaFields } from '@/components/features/perfil/PerfilGestionCitaFields';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  citaId: number;
  psicologoId: number;
  psicologoNombre?: string;
  onSuccess: () => void;
};

export function ReagendarDialog({
  open,
  onOpenChange,
  citaId,
  psicologoId,
  psicologoNombre,
  onSuccess,
}: Props) {
  const [fecha, setFecha] = useState<Date | undefined>();
  const [hora, setHora] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setFecha(undefined);
      setHora('');
      setError('');
      setLoading(false);
      return;
    }
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
      const res = await fetch('/api/reagendar-cita', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cita_id: citaId,
          fecha: format(fecha, 'yyyy-MM-dd'),
          hora,
          zona_horaria_paciente: getZonaNavegador(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo reagendar. Intenta de nuevo.');
        setLoading(false);
        return;
      }
      onSuccess();
      onOpenChange(false);
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
        <h3 id="gestion-cita-titulo">Reagendar cita</h3>
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

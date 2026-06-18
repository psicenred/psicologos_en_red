'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DateTimePicker } from '@/components/features/citas/DateTimePicker';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  citaId: number;
  psicologoId: number;
  onSuccess: () => void;
};

export function ReagendarDialog({
  open,
  onOpenChange,
  citaId,
  psicologoId,
  onSuccess,
}: Props) {
  const [fecha, setFecha] = useState<Date | undefined>();
  const [hora, setHora] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function confirmar() {
    if (!fecha || !hora) return;
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
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo reagendar');
        return;
      }
      onSuccess();
      onOpenChange(false);
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Reagendar cita</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <DateTimePicker
            psicologoId={psicologoId}
            fecha={fecha}
            setFecha={setFecha}
            hora={hora}
            setHora={setHora}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button
            className="w-full"
            disabled={!fecha || !hora || loading}
            onClick={confirmar}
          >
            {loading ? 'Guardando…' : 'Confirmar reagendado'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

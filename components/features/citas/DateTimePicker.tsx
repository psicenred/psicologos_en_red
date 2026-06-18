'use client';

import { useEffect, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { es } from 'date-fns/locale';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export function DateTimePicker({
  psicologoId,
  fecha,
  setFecha,
  hora,
  setHora,
}: {
  psicologoId: number;
  fecha: Date | undefined;
  setFecha: (d: Date | undefined) => void;
  hora: string;
  setHora: (h: string) => void;
}) {
  const [disabledDays, setDisabledDays] = useState<number[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [horarios, setHorarios] = useState<string[]>([]);
  const [availMsg, setAvailMsg] = useState('');

  useEffect(() => {
    fetch(`/api/disponibilidad-calendario/${psicologoId}`)
      .then((r) => r.json())
      .then((data) => {
        setDisabledDays(data.diasNoLaborales || []);
        setBlockedDates(data.fechasBloqueadas || []);
      })
      .catch(() => {});
  }, [psicologoId]);

  useEffect(() => {
    if (!fecha) {
      setHorarios([]);
      setHora('');
      return;
    }
    const fechaStr = format(fecha, 'yyyy-MM-dd');
    fetch(`/api/horarios-disponibles/${psicologoId}?fecha=${fechaStr}`)
      .then((r) => r.json())
      .then((data) => {
        setHorarios(data.horarios || []);
        setHora('');
        setAvailMsg(data.disponible === false ? data.mensaje || '' : '');
      })
      .catch(() => setHorarios([]));
  }, [fecha, psicologoId, setHora]);

  function isDateDisabled(day: Date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (day < today) return true;
    if (disabledDays.includes(day.getDay())) return true;
    return blockedDates.includes(format(day, 'yyyy-MM-dd'));
  }

  return (
    <div className="space-y-4">
      <DayPicker
        mode="single"
        locale={es}
        selected={fecha}
        onSelect={setFecha}
        disabled={isDateDisabled}
        className="mx-auto rounded-lg border p-2"
      />
      {fecha ? (
        <div>
          <Label>Horario</Label>
          {availMsg ? <p className="text-sm text-muted-foreground">{availMsg}</p> : null}
          {horarios.length === 0 && !availMsg ? (
            <p className="text-sm text-muted-foreground">Sin horarios para esta fecha.</p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              {horarios.map((h) => (
                <Button
                  key={h}
                  type="button"
                  size="sm"
                  variant={hora === h ? 'default' : 'outline'}
                  onClick={() => setHora(h)}
                >
                  {h}
                </Button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

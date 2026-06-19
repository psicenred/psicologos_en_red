'use client';

import { useEffect, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { es } from 'date-fns/locale';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { formatHoraLocalDesdeIso } from '@/lib/timezone-client';

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
  const [horariosIso, setHorariosIso] = useState<string[]>([]);
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
      setHorariosIso([]);
      setHora('');
      setAvailMsg('');
      return;
    }
    const fechaStr = format(fecha, 'yyyy-MM-dd');
    fetch(`/api/horarios-disponibles/${psicologoId}?fecha=${fechaStr}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.disponible || !data.horarios?.length) {
          setHorarios([]);
          setHorariosIso([]);
          setHora('');
          setAvailMsg(data.mensaje || 'No hay horarios disponibles.');
          return;
        }
        const iso =
          data.horarios_iso &&
          Array.isArray(data.horarios_iso) &&
          data.horarios_iso.length === data.horarios.length
            ? data.horarios_iso
            : [];
        setHorarios(data.horarios);
        setHorariosIso(iso);
        setHora('');
        setAvailMsg(
          `${data.horarios.length} horario(s) disponible(s) (en tu hora local)`,
        );
      })
      .catch(() => {
        setHorarios([]);
        setHorariosIso([]);
        setAvailMsg('');
      });
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
          {availMsg ? (
            <p className="text-sm text-muted-foreground">{availMsg}</p>
          ) : null}
          {horarios.length === 0 && !availMsg ? (
            <p className="text-sm text-muted-foreground">Sin horarios para esta fecha.</p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              {horarios.map((h, i) => (
                <Button
                  key={h}
                  type="button"
                  size="sm"
                  variant={hora === h ? 'default' : 'outline'}
                  onClick={() => setHora(h)}
                >
                  {formatHoraLocalDesdeIso(h, horariosIso[i] ?? null)}
                </Button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

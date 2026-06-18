'use client';

import { useEffect, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { es } from 'date-fns/locale';
import { format } from 'date-fns';

function formatHoraLabel(hora: string, horariosIso?: string | null): string {
  if (horariosIso) {
    try {
      const d = new Date(horariosIso);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleTimeString('es-MX', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
      }
    } catch {
      /* fallback */
    }
  }
  const h = parseInt(hora.split(':')[0], 10);
  const periodo = h < 12 ? 'AM' : 'PM';
  const hora12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${String(hora12).padStart(2, '0')}:00 ${periodo}`;
}

export function PerfilGestionCitaFields({
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
  const [horariosMsg, setHorariosMsg] = useState('');
  const [horariosMsgColor, setHorariosMsgColor] = useState('#888');
  const [loadingHorarios, setLoadingHorarios] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

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
      setHorariosMsg('');
      setHora('');
      return;
    }

    const fechaStr = format(fecha, 'yyyy-MM-dd');
    setLoadingHorarios(true);
    setHorariosMsg('');
    setHora('');

    fetch(`/api/horarios-disponibles/${psicologoId}?fecha=${fechaStr}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.disponible || !data.horarios?.length) {
          setHorarios([]);
          setHorariosIso([]);
          setHorariosMsg(data.mensaje || 'No hay horarios disponibles.');
          setHorariosMsgColor('#e74c3c');
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
        setHorariosMsg(
          `${data.horarios.length} horario(s) disponible(s) (en tu hora local)`,
        );
        setHorariosMsgColor('#27ae60');
      })
      .catch(() => {
        setHorarios([]);
        setHorariosIso([]);
        setHorariosMsg('Error de conexión');
        setHorariosMsgColor('#e74c3c');
      })
      .finally(() => setLoadingHorarios(false));
  }, [fecha, psicologoId, setHora]);

  useEffect(() => {
    if (!showCalendar) return;
    function onDocClick(e: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setShowCalendar(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showCalendar]);

  function isDateDisabled(day: Date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (day < today) return true;
    const max = new Date();
    max.setDate(max.getDate() + 90);
    if (day > max) return true;
    if (disabledDays.includes(day.getDay())) return true;
    return blockedDates.includes(format(day, 'yyyy-MM-dd'));
  }

  return (
    <div className="gestion-cita-campos">
      <div className="gestion-cita-field">
        <label htmlFor="gestion-cita-fecha">Fecha</label>
        <div className="gestion-cita-fecha-wrap" ref={calendarRef}>
          <input
            id="gestion-cita-fecha"
            type="text"
            readOnly
            value={fecha ? format(fecha, 'yyyy-MM-dd') : ''}
            placeholder="-- / -- / ----"
            onClick={() => setShowCalendar((v) => !v)}
          />
          {showCalendar ? (
            <div className="gestion-cita-calendario-popup">
              <DayPicker
                mode="single"
                locale={es}
                selected={fecha}
                disabled={isDateDisabled}
                onSelect={(d) => {
                  setFecha(d);
                  setShowCalendar(false);
                }}
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="gestion-cita-field">
        <label htmlFor="gestion-cita-hora">Hora</label>
        <select
          id="gestion-cita-hora"
          value={hora}
          disabled={!fecha || loadingHorarios}
          onChange={(e) => setHora(e.target.value)}
        >
          {!fecha ? (
            <option value="" disabled>
              Primero selecciona una fecha...
            </option>
          ) : loadingHorarios ? (
            <option value="" disabled>
              Cargando...
            </option>
          ) : horarios.length === 0 ? (
            <option value="" disabled>
              No hay horarios
            </option>
          ) : (
            <>
              <option value="" disabled>
                Elige una hora...
              </option>
              {horarios.map((h, i) => (
                <option key={h} value={h}>
                  {formatHoraLabel(h, horariosIso[i] ?? null)}
                </option>
              ))}
            </>
          )}
        </select>
        {horariosMsg ? (
          <p className="gestion-mensaje-horarios" style={{ color: horariosMsgColor }}>
            {horariosMsg}
          </p>
        ) : null}
      </div>
    </div>
  );
}

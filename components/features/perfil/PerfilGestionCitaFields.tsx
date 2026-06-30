'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DayPicker } from 'react-day-picker';
import { es } from 'date-fns/locale';
import { format } from 'date-fns';
import { formatHoraLocalDesdeIso } from '@/lib/timezone-client';

function formatHoraLabel(hora: string, horariosIso?: string | null): string {
  return formatHoraLocalDesdeIso(hora, horariosIso);
}

export function PerfilGestionCitaFields({
  psicologoId,
  fecha,
  setFecha,
  hora,
  setHora,
  /** Catálogo: calendario flotante fuera del área con scroll del modal */
  floatingCalendar = false,
}: {
  psicologoId: number;
  fecha: Date | undefined;
  setFecha: (d: Date | undefined) => void;
  hora: string;
  setHora: (h: string) => void;
  floatingCalendar?: boolean;
}) {
  const [disabledDays, setDisabledDays] = useState<number[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [horarios, setHorarios] = useState<string[]>([]);
  const [horariosIso, setHorariosIso] = useState<string[]>([]);
  const [horariosMsg, setHorariosMsg] = useState('');
  const [horariosMsgColor, setHorariosMsgColor] = useState('#888');
  const [loadingHorarios, setLoadingHorarios] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarPos, setCalendarPos] = useState({ top: 0, left: 0 });
  const calendarRef = useRef<HTMLDivElement>(null);
  const floatingCalendarRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function updateCalendarPosition() {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setCalendarPos({ top: rect.bottom + 6, left: rect.left });
  }

  function toggleCalendar() {
    setShowCalendar((open) => {
      const next = !open;
      if (next && floatingCalendar) updateCalendarPosition();
      return next;
    });
  }

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
      const target = e.target as Node;
      if (calendarRef.current?.contains(target)) return;
      if (floatingCalendarRef.current?.contains(target)) return;
      setShowCalendar(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showCalendar]);

  useEffect(() => {
    if (!showCalendar || !floatingCalendar) return;
    updateCalendarPosition();
    window.addEventListener('resize', updateCalendarPosition);
    return () => window.removeEventListener('resize', updateCalendarPosition);
  }, [showCalendar, floatingCalendar]);

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

  const dayPicker = (
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
  );

  const inlineCalendar =
    showCalendar && !floatingCalendar ? (
      <div className="gestion-cita-calendario-popup">{dayPicker}</div>
    ) : null;

  const floatingCalendarPortal =
    showCalendar && floatingCalendar
      ? createPortal(
          <div
            ref={floatingCalendarRef}
            className="gestion-cita-calendario-popup gestion-cita-calendario-popup-floating"
            style={{ top: calendarPos.top, left: calendarPos.left }}
          >
            {dayPicker}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div className="gestion-cita-campos">
        <div className="gestion-cita-field">
          <label htmlFor="gestion-cita-fecha">Fecha</label>
          <div className="gestion-cita-fecha-wrap" ref={calendarRef}>
            <input
              ref={inputRef}
              id="gestion-cita-fecha"
              type="text"
              readOnly
              value={fecha ? format(fecha, 'yyyy-MM-dd') : ''}
              placeholder="-- / -- / ----"
              onClick={toggleCalendar}
            />
            {inlineCalendar}
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
      {floatingCalendarPortal}
    </>
  );
}

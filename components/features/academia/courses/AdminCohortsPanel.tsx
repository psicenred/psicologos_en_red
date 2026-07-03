'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DateTimeInlineEditor } from '@/components/features/academia/DateTimeInlineEditor';
import type { CourseLiveSession } from '@/lib/academia/types';

type Cohort = {
  id: string;
  start_date: string;
  end_date: string;
  live_session_weekday: number;
  live_session_time: string;
  timezone: string;
  status: string;
  sessions?: CourseLiveSession[];
};

const WEEKDAYS = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
];

export function AdminCohortsPanel({ courseId, isSync }: { courseId: string; isSync: boolean }) {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [form, setForm] = useState({
    start_date: '',
    end_date: '',
    live_session_weekday: 2,
    live_session_time: '18:00',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch(`/api/academia/admin/cohorts/${courseId}`)
      .then((r) => r.json())
      .then((data) => setCohorts(data.cohorts ?? []))
      .catch(() => setCohorts([]));
  }

  useEffect(() => {
    if (isSync) load();
  }, [courseId, isSync]);

  if (!isSync) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--color-arena)] bg-card p-10 text-center text-muted-foreground">
        Las cohortes solo aplican a cursos síncronos.
      </div>
    );
  }

  const hasCohort = cohorts.length > 0;

  async function createCohort(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/academia/admin/cohorts/${courseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForm({ start_date: '', end_date: '', live_session_weekday: 2, live_session_time: '18:00' });
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function saveSessionDate(sessionId: string, scheduledAt: string) {
    const res = await fetch(`/api/academia/live-sessions/${sessionId}/schedule`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduled_at: scheduledAt }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo actualizar la fecha');
    setCohorts((prev) =>
      prev.map((cohort) => ({
        ...cohort,
        sessions: (cohort.sessions ?? []).map((session) =>
          session.id === sessionId
            ? { ...session, scheduled_at: data.session.scheduled_at }
            : session,
        ),
      })),
    );
  }

  return (
    <section className="space-y-4 rounded-xl border border-[var(--color-arena)] bg-card p-6 shadow-sm">
      <div>
        <h2 className="font-semibold">Cohorte del curso</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Por ahora cada curso síncrono tiene una sola cohorte. Los alumnos eligen la edición al
          inscribirse en la página pública y, al pagar, entran automáticamente a esta cohorte con
          sus sesiones en vivo y lista de asistencia.
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {hasCohort ? (
        <div className="space-y-3">
          {cohorts.map((c) => (
            <div
              key={c.id}
              className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-4 text-sm"
            >
              <p className="font-semibold text-foreground">
                Inicia el{' '}
                {new Date(c.start_date).toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              <p className="mt-1 text-muted-foreground">
                {new Date(c.start_date).toLocaleDateString('es-MX')} →{' '}
                {new Date(c.end_date).toLocaleDateString('es-MX')} ·{' '}
                {WEEKDAYS[c.live_session_weekday]?.label}{' '}
                {String(c.live_session_time).slice(0, 5)} ({c.timezone}) · {c.status}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Los alumnos inscritos aparecerán en esta cohorte. Gestiona asistencia en la
                sección Asistencia del curso.
              </p>
              {(c.sessions ?? []).length > 0 ? (
                <div className="mt-4 space-y-3 border-t border-primary/20 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Sesiones en vivo
                  </p>
                  <ul className="space-y-3">
                    {(c.sessions ?? []).map((session) => (
                      <li
                        key={session.id}
                        className="rounded-md border border-[var(--color-arena)] bg-card px-3 py-3"
                      >
                        <DateTimeInlineEditor
                          value={session.scheduled_at}
                          label={`Sesión · ${session.status}`}
                          onSave={(iso) => saveSessionDate(session.id, iso)}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Puedes ajustar la fecha de cada sesión en vivo. Para cambiar el calendario completo de
            la cohorte, edítala en la base de datos o elimínala antes de crear otra (solo si no hay
            alumnos inscritos).
          </p>
        </div>
      ) : (
        <form onSubmit={createCohort} className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium">Fecha de inicio</label>
            <input
              type="date"
              className="h-10 w-full rounded-md border px-3 text-sm"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Es la fecha que verán los alumnos al inscribirse (ej. 9 de julio).
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Fecha de fin</label>
            <input
              type="date"
              className="h-10 w-full rounded-md border px-3 text-sm"
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Día de sesión en vivo</label>
            <select
              className="h-10 w-full rounded-md border px-3 text-sm"
              value={form.live_session_weekday}
              onChange={(e) =>
                setForm({ ...form, live_session_weekday: Number(e.target.value) })
              }
            >
              {WEEKDAYS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Hora de sesión</label>
            <input
              type="time"
              className="h-10 w-full rounded-md border px-3 text-sm"
              value={form.live_session_time}
              onChange={(e) => setForm({ ...form, live_session_time: e.target.value })}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'Creando…' : 'Crear cohorte y sesiones en vivo'}
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              Se generan automáticamente las sesiones en vivo y salas Daily.co para cada fecha del
              calendario.
            </p>
          </div>
        </form>
      )}
    </section>
  );
}

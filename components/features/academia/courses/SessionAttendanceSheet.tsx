'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { AttendanceSheetRow, CourseLiveSession } from '@/lib/academia/types';

function formatSessionDate(iso: string) {
  return new Date(iso).toLocaleString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface SessionAttendanceSheetProps {
  session: CourseLiveSession;
  readOnly?: boolean;
  onSaved?: () => void;
}

export function SessionAttendanceSheet({
  session,
  readOnly = false,
  onSaved,
}: SessionAttendanceSheetProps) {
  const [rows, setRows] = useState<AttendanceSheetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/academia/live-sessions/${session.id}/attendance`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setRows(data.rows ?? []);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [session.id]);

  useEffect(() => {
    load();
  }, [load]);

  function toggle(studentId: string) {
    if (readOnly) return;
    setRows((prev) =>
      prev.map((r) =>
        r.student_id === studentId ? { ...r, attended: !r.attended } : r,
      ),
    );
  }

  function markAll(attended: boolean) {
    if (readOnly) return;
    setRows((prev) => prev.map((r) => ({ ...r, attended })));
  }

  async function save() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/academia/live-sessions/${session.id}/attendance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: rows.map((r) => ({
            student_id: r.student_id,
            attended: r.attended,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar');
      setRows(data.rows ?? []);
      setMessage('Asistencia guardada');
      onSaved?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const present = rows.filter((r) => r.attended).length;

  if (loading) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">Cargando lista…</p>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        No hay alumnos inscritos en la cohorte de esta sesión.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-[var(--color-arena)] bg-muted/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">
            Lista de asistencia — {formatSessionDate(session.scheduled_at)}
          </p>
          <p className="text-xs text-muted-foreground">
            {present} de {rows.length} presentes
          </p>
        </div>
        {!readOnly ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => markAll(true)}>
              Marcar todos
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => markAll(false)}>
              Desmarcar todos
            </Button>
            <Button type="button" size="sm" onClick={save} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar asistencia'}
            </Button>
          </div>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-secondary-foreground">{message}</p> : null}

      <ul className="divide-y divide-[var(--color-arena)]/60 rounded-md border border-[var(--color-arena)]/60 bg-card">
        {rows.map((row) => (
          <li
            key={row.student_id}
            className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
          >
            <label
              className={`flex flex-1 cursor-pointer items-center gap-3 ${readOnly ? 'cursor-default' : ''}`}
            >
              <input
                type="checkbox"
                checked={row.attended}
                disabled={readOnly}
                onChange={() => toggle(row.student_id)}
                className="h-4 w-4 rounded border-[var(--color-arena)] text-primary focus:ring-primary"
              />
              <span className="font-medium text-foreground">{row.full_name}</span>
            </label>
            {row.joined_at ? (
              <span className="text-xs text-muted-foreground">
                {row.attended ? 'Registrado' : ''}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

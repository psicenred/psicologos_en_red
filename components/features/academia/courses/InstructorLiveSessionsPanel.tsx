'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DailyRoom } from '@/components/features/video/DailyRoom';
import { SessionAttendanceSheet } from '@/components/features/academia/courses/SessionAttendanceSheet';
import { DateTimeInlineEditor } from '@/components/features/academia/DateTimeInlineEditor';
import type { CourseLiveSession } from '@/lib/academia/types';

function formatSessionDate(iso: string) {
  return new Date(iso).toLocaleString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function canJoinSession(session: CourseLiveSession) {
  if (session.status === 'cancelled') return false;
  const start = new Date(session.scheduled_at).getTime();
  const now = Date.now();
  const windowMs = 30 * 60 * 1000;
  return now >= start - windowMs && now <= start + 3 * 60 * 60 * 1000;
}

export function InstructorLiveSessionsPanel({
  courseId,
  format,
  showWhenEmpty = false,
}: {
  courseId: string;
  format: string;
  showWhenEmpty?: boolean;
}) {
  const [sessions, setSessions] = useState<CourseLiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [room, setRoom] = useState<{ url: string; token: string } | null>(null);
  const [attendanceSessionId, setAttendanceSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (format !== 'sync') {
      setLoading(false);
      return;
    }

    fetch(`/api/academia/live-sessions/instructor/course/${courseId}`)
      .then((r) => r.json())
      .then((data) => setSessions(data.sessions ?? []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [courseId, format]);

  async function joinSession(sessionId: string) {
    setJoining(sessionId);
    setError(null);
    try {
      const res = await fetch(`/api/academia/live-sessions/${sessionId}/join`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo unir a la sesión');
      setRoom({ url: data.url, token: data.token });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setJoining(null);
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
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, scheduled_at: data.session.scheduled_at } : s)),
    );
  }

  async function attachRecording(sessionId: string) {
    const url = window.prompt('URL de la grabación (Daily.co o enlace externo)');
    if (!url) return;
    setError(null);
    const res = await fetch(`/api/academia/live-sessions/${sessionId}/recording`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordingUrl: url }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'No se pudo guardar la grabación');
      return;
    }
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId ? { ...s, recording_url: data.session.recording_url } : s,
      ),
    );
  }

  if (format !== 'sync') {
    if (!showWhenEmpty) return null;
    return (
      <div className="rounded-xl border border-dashed border-[var(--color-arena)] bg-card p-10 text-center text-muted-foreground">
        Este curso es asíncrono y no incluye sesiones en vivo.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--color-arena)] bg-card p-8 text-center text-sm text-muted-foreground">
        Cargando sesiones…
      </div>
    );
  }

  return (
    <section className="space-y-4 rounded-xl border border-[var(--color-arena)] bg-card p-5 shadow-sm">

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {room ? (
        <div className="space-y-2">
          <Button variant="outline" size="sm" onClick={() => setRoom(null)}>
            Salir de la videollamada
          </Button>
          <DailyRoom url={room.url} token={room.token} onLeave={() => setRoom(null)} />
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin sesiones programadas aún.</p>
      ) : (
        <ul className="space-y-2">
          {sessions.map((session) => (
            <li
              key={session.id}
              className="space-y-2 rounded border px-3 py-2 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="font-medium">{formatSessionDate(session.scheduled_at)}</p>
                  <DateTimeInlineEditor
                    value={session.scheduled_at}
                    label="Fecha de la sesión"
                    onSave={(iso) => saveSessionDate(session.id, iso)}
                  />
                  <p className="text-xs text-muted-foreground capitalize">{session.status}</p>
                  {session.recording_url ? (
                    <a
                      href={session.recording_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary underline"
                    >
                      Grabación disponible
                    </a>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={attendanceSessionId === session.id ? 'default' : 'outline'}
                    onClick={() =>
                      setAttendanceSessionId((prev) => (prev === session.id ? null : session.id))
                    }
                  >
                    {attendanceSessionId === session.id ? 'Ocultar lista' : 'Lista de asistencia'}
                  </Button>
                  {canJoinSession(session) ? (
                    <Button
                      size="sm"
                      onClick={() => joinSession(session.id)}
                      disabled={joining === session.id}
                    >
                      {joining === session.id ? 'Conectando…' : 'Iniciar clase'}
                    </Button>
                  ) : null}
                  {!session.recording_url ? (
                    <Button size="sm" variant="outline" onClick={() => attachRecording(session.id)}>
                      Subir grabación
                    </Button>
                  ) : null}
                  {!canJoinSession(session) && !session.recording_url ? (
                    <span className="self-center text-xs text-muted-foreground">
                      {session.status === 'completed' ? 'Finalizada' : 'Programada'}
                    </span>
                  ) : null}
                </div>
              </div>
              {attendanceSessionId === session.id ? (
                <SessionAttendanceSheet
                  session={session}
                  onSaved={() => {
                    setSessions((prev) =>
                      prev.map((s) =>
                        s.id === session.id && s.status === 'scheduled'
                          ? { ...s, status: 'completed' }
                          : s,
                      ),
                    );
                  }}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

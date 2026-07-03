'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DailyRoom } from '@/components/features/video/DailyRoom';
import type { CourseLiveSession } from '@/lib/academia/types';
import { PlayCircle } from 'lucide-react';

function hasRecording(session: CourseLiveSession): boolean {
  return Boolean(session.recording_url?.trim());
}

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
  if (session.status === 'cancelled' || session.status === 'completed') return false;
  const start = new Date(session.scheduled_at).getTime();
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  return now >= start - windowMs && now <= start + 2 * 60 * 60 * 1000;
}

export function CourseLiveSessionsPanel({
  courseId,
  format,
  showWhenEmpty = false,
}: {
  courseId: string;
  format: string;
  showWhenEmpty?: boolean;
}) {
  const [sessions, setSessions] = useState<CourseLiveSession[]>([]);
  const [enrollmentStatus, setEnrollmentStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [room, setRoom] = useState<{ url: string; token: string } | null>(null);

  useEffect(() => {
    if (format !== 'sync') {
      setLoading(false);
      return;
    }

    fetch(`/api/academia/live-sessions/course/${courseId}`)
      .then((r) => r.json())
      .then((data) => {
        setSessions(data.sessions ?? []);
        setEnrollmentStatus(data.enrollmentStatus ?? null);
      })
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

  if (format !== 'sync') {
    if (!showWhenEmpty) return null;
    return (
      <div className="rounded-xl border border-dashed border-[var(--color-arena)] bg-card p-10 text-center text-muted-foreground">
        Este curso es asíncrono y no incluye sesiones en vivo.
      </div>
    );
  }
  if (loading) return <p className="text-sm text-muted-foreground">Cargando sesiones en vivo…</p>;

  if (enrollmentStatus === 'payment_overdue') {
    return (
      <section className="mb-8 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <h2 className="mb-1 font-semibold text-amber-900">Sesiones en vivo</h2>
        <p className="text-sm text-amber-800">
          Tu acceso está pausado por pago vencido. Regulariza tu mensualidad para unirte a las
          clases en vivo.
        </p>
      </section>
    );
  }

  if (!sessions.length) {
    return (
      <section className="mb-8 rounded-lg border bg-background p-4">
        <h2 className="mb-1 font-semibold">Sesiones en vivo</h2>
        <p className="text-sm text-muted-foreground">
          Aún no hay sesiones programadas para tu cohorte.
        </p>
      </section>
    );
  }

  return (
    <section className="mb-8 space-y-4 rounded-lg border bg-background p-4">
      <h2 className="font-semibold">Calendario de sesiones en vivo</h2>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {room ? (
        <div className="space-y-2">
          <Button variant="outline" size="sm" onClick={() => setRoom(null)}>
            Salir de la videollamada
          </Button>
          <DailyRoom url={room.url} token={room.token} onLeave={() => setRoom(null)} />
        </div>
      ) : (
        <ul className="space-y-2">
          {sessions.map((session) => {
            const joinable = canJoinSession(session);
            return (
              <li
                key={session.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{formatSessionDate(session.scheduled_at)}</p>
                  <p className="text-xs text-muted-foreground capitalize">{session.status}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {joinable && enrollmentStatus === 'active' ? (
                    <Button
                      size="sm"
                      onClick={() => joinSession(session.id)}
                      disabled={joining === session.id}
                    >
                      {joining === session.id ? 'Conectando…' : 'Unirse'}
                    </Button>
                  ) : null}
                  {hasRecording(session) ? (
                    <Button size="sm" variant="outline" asChild>
                      <a
                        href={session.recording_url!}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
                        Ver grabación
                      </a>
                    </Button>
                  ) : null}
                  {!joinable && !hasRecording(session) ? (
                    <span className="text-xs text-muted-foreground">
                      {session.status === 'completed' ? 'Finalizada' : 'Próximamente'}
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

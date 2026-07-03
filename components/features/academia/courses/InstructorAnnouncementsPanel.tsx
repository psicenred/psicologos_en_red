'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/routing';
import { AlumnoPageHeader } from '@/components/features/academia/alumno/AlumnoPageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { CourseAnnouncement } from '@/lib/academia/types';
import {
  announcementVisibilityLabel,
  getAnnouncementVisibilityStatus,
} from '@/lib/academia/announcement-visibility';
import { Megaphone, Trash2 } from 'lucide-react';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultVisibilityRange() {
  const from = new Date();
  from.setMinutes(0, 0, 0);
  const until = new Date(from);
  until.setDate(until.getDate() + 2);
  return { from: toDatetimeLocalValue(from), until: toDatetimeLocalValue(until) };
}

function visibilityBadgeClass(status: ReturnType<typeof getAnnouncementVisibilityStatus>): string {
  if (status === 'active') return 'bg-green-100 text-green-800';
  if (status === 'scheduled') return 'bg-amber-100 text-amber-900';
  return 'bg-muted text-muted-foreground';
}

export function InstructorAnnouncementsPanel({ courseId }: { courseId: string }) {
  const [announcements, setAnnouncements] = useState<CourseAnnouncement[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const defaults = defaultVisibilityRange();
  const [visibleFrom, setVisibleFrom] = useState(defaults.from);
  const [visibleUntil, setVisibleUntil] = useState(defaults.until);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function load() {
    fetch(`/api/academia/announcements?courseId=${courseId}`)
      .then((r) => r.json())
      .then((data) => setAnnouncements(data.announcements ?? []))
      .catch(() => setAnnouncements([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [courseId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch('/api/academia/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, title, body, visibleFrom, visibleUntil }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo enviar el aviso');

      setTitle('');
      setBody('');
      const next = defaultVisibilityRange();
      setVisibleFrom(next.from);
      setVisibleUntil(next.until);
      setMessage('Aviso programado. Los alumnos lo verán solo dentro del rango de fechas indicado.');
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('¿Eliminar este aviso?')) return;

    const res = await fetch(`/api/academia/announcements/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'No se pudo eliminar');
      return;
    }
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div>
      <AlumnoPageHeader
        title="Avisos"
        description="Envía mensajes a todos los alumnos inscritos. Define cuándo empieza y cuándo deja de mostrarse."
      />

      {message ? (
        <div className="mb-6 rounded-xl border border-secondary/30 bg-secondary/10 px-4 py-3 text-sm">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="mb-8 space-y-4 rounded-xl border border-[var(--color-arena)] bg-card p-6 shadow-sm"
      >
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Megaphone className="h-4 w-4 text-primary" />
          Nuevo aviso
        </div>

        <div className="space-y-2">
          <Label htmlFor="announcement-title">Título</Label>
          <Input
            id="announcement-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Cambio de horario de la clase en vivo"
            maxLength={200}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="announcement-body">Mensaje</Label>
          <Textarea
            id="announcement-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Escribe el aviso para tus alumnos…"
            rows={5}
            maxLength={5000}
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="announcement-visible-from">Visible desde</Label>
            <Input
              id="announcement-visible-from"
              type="datetime-local"
              value={visibleFrom}
              onChange={(e) => setVisibleFrom(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="announcement-visible-until">Visible hasta</Label>
            <Input
              id="announcement-visible-until"
              type="datetime-local"
              value={visibleUntil}
              onChange={(e) => setVisibleUntil(e.target.value)}
              required
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Ejemplo: inicio 2 jul 10:00, fin 4 jul 10:00. Fuera de ese rango los alumnos no verán el aviso.
        </p>

        <Button type="submit" disabled={sending}>
          {sending ? 'Publicando…' : 'Publicar aviso'}
        </Button>
      </form>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Avisos publicados
        </h2>

        {loading ? (
          <div className="rounded-xl border border-[var(--color-arena)] bg-card p-8 text-center text-muted-foreground">
            Cargando…
          </div>
        ) : announcements.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-arena)] bg-card p-10 text-center text-muted-foreground">
            Aún no has publicado avisos para este curso.
          </div>
        ) : (
          <ul className="space-y-4">
            {announcements.map((a) => {
              const status = getAnnouncementVisibilityStatus(a);
              return (
              <li
                key={a.id}
                className="rounded-xl border border-[var(--color-arena)] bg-card p-5 shadow-sm"
              >
                <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-foreground">{a.title}</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${visibilityBadgeClass(status)}`}
                      >
                        {announcementVisibilityLabel(status)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Creado {formatDate(a.created_at)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Visible: {formatDate(a.visible_from ?? a.created_at)}
                      {a.visible_until ? ` → ${formatDate(a.visible_until)}` : ''}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(a.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="whitespace-pre-wrap text-sm text-foreground">{a.body}</p>
              </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

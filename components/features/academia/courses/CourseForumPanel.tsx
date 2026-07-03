'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { CourseForumThreadDetail, CourseForumThreadListItem } from '@/lib/academia/types';
import { ArrowLeft, MessageCircle, Plus } from 'lucide-react';

function formatForumDate(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function CourseForumPanel({ courseId }: { courseId: string }) {
  const [threads, setThreads] = useState<CourseForumThreadListItem[]>([]);
  const [activeThread, setActiveThread] = useState<CourseForumThreadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [saving, setSaving] = useState(false);

  const loadThreads = useCallback(() => {
    setLoading(true);
    fetch(`/api/academia/forum?courseId=${courseId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setThreads(data.threads ?? []);
      })
      .catch((err) => setError((err as Error).message || 'No se pudo cargar el foro'))
      .finally(() => setLoading(false));
  }, [courseId]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  async function openThread(threadId: string) {
    setLoadingThread(true);
    setError(null);
    setReplyBody('');
    try {
      const res = await fetch(`/api/academia/forum/${threadId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo cargar la pregunta');
      setActiveThread(data.thread);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingThread(false);
    }
  }

  async function submitQuestion(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/academia/forum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, title: newTitle, body: newBody }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo publicar');
      setNewTitle('');
      setNewBody('');
      setShowNewForm(false);
      loadThreads();
      if (data.thread?.id) await openThread(data.thread.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function submitReply(e: React.FormEvent) {
    e.preventDefault();
    if (!activeThread) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/academia/forum/${activeThread.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: replyBody }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo publicar la respuesta');
      setReplyBody('');
      await openThread(activeThread.id);
      loadThreads();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--color-arena)] bg-card p-10 text-center text-sm text-muted-foreground">
        Cargando foro…
      </div>
    );
  }

  if (activeThread) {
    return (
      <div className="space-y-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2"
          onClick={() => {
            setActiveThread(null);
            setReplyBody('');
          }}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Volver al foro
        </Button>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {loadingThread ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : (
          <>
            <article className="rounded-xl border border-[var(--color-arena)] bg-card p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">{activeThread.title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {activeThread.student_name} · {formatForumDate(activeThread.created_at)}
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">{activeThread.body}</p>
            </article>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Respuestas ({activeThread.replies.length})
              </h3>
              {activeThread.replies.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aún no hay respuestas. Sé el primero en ayudar.
                </p>
              ) : (
                <ul className="space-y-2">
                  {activeThread.replies.map((reply) => (
                    <li
                      key={reply.id}
                      className="rounded-lg border border-[var(--color-arena)] bg-muted/20 px-4 py-3"
                    >
                      <p className="text-xs font-medium text-muted-foreground">
                        {reply.student_name} · {formatForumDate(reply.created_at)}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{reply.body}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <form
              onSubmit={submitReply}
              className="space-y-3 rounded-xl border border-[var(--color-arena)] bg-card p-4 shadow-sm"
            >
              <Label htmlFor="forum-reply">Tu respuesta</Label>
              <Textarea
                id="forum-reply"
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                rows={4}
                placeholder="Comparte tu experiencia o ayuda a tu compañero…"
              />
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? 'Publicando…' : 'Publicar respuesta'}
              </Button>
            </form>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Plantea dudas y responde a tus compañeros del curso.
        </p>
        <Button
          type="button"
          size="sm"
          variant={showNewForm ? 'outline' : 'default'}
          onClick={() => setShowNewForm((v) => !v)}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {showNewForm ? 'Cancelar' : 'Nueva pregunta'}
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {showNewForm ? (
        <form
          onSubmit={submitQuestion}
          className="space-y-3 rounded-xl border border-[var(--color-arena)] bg-card p-4 shadow-sm"
        >
          <div className="space-y-1">
            <Label htmlFor="forum-title">Título</Label>
            <Input
              id="forum-title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Ej. ¿Cómo aplicar el concepto X en la práctica?"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="forum-body">Pregunta</Label>
            <Textarea
              id="forum-body"
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              rows={4}
              placeholder="Describe tu duda con el detalle que puedas…"
            />
          </div>
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? 'Publicando…' : 'Publicar pregunta'}
          </Button>
        </form>
      ) : null}

      {threads.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-arena)] bg-card p-10 text-center">
          <MessageCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-muted-foreground">Aún no hay preguntas en el foro.</p>
          <Button type="button" className="mt-4" size="sm" onClick={() => setShowNewForm(true)}>
            Hacer la primera pregunta
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {threads.map((thread) => (
            <li key={thread.id}>
              <button
                type="button"
                onClick={() => openThread(thread.id)}
                className="w-full rounded-xl border border-[var(--color-arena)] bg-card px-4 py-3 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <p className="font-medium text-foreground">{thread.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{thread.body}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {thread.student_name} · {formatForumDate(thread.created_at)}
                  {thread.reply_count > 0
                    ? ` · ${thread.reply_count} respuesta${thread.reply_count === 1 ? '' : 's'}`
                    : ' · Sin respuestas'}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

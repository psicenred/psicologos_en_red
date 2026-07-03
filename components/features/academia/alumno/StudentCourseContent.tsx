'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlumnoPageHeader } from '@/components/features/academia/alumno/AlumnoPageHeader';
import type { CourseLesson, ModuleWithLessons } from '@/lib/academia/types';
import { BookOpen, CheckCircle2 } from 'lucide-react';

export function StudentCourseContent({ courseId }: { courseId: string }) {
  const [modules, setModules] = useState<ModuleWithLessons[]>([]);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/academia/courses/${courseId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setModules(data.modules ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

    fetch(`/api/academia/progress?courseId=${courseId}`)
      .then((r) => r.json())
      .then((data) => {
        const ids = (data.progress ?? [])
          .filter((p: { completed: boolean }) => p.completed)
          .map((p: { lesson_id: string }) => p.lesson_id);
        setCompleted(new Set(ids));
      })
      .catch(() => setCompleted(new Set()));
  }, [courseId]);

  async function markComplete(lesson: CourseLesson) {
    const res = await fetch('/api/academia/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId: lesson.id }),
    });
    if (res.ok) {
      setCompleted((prev) => new Set(prev).add(lesson.id));
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--color-arena)] bg-card p-8 text-center text-muted-foreground">
        Cargando contenido…
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive">{error}</p>;
  }

  const totalLessons = modules.reduce((n, m) => n + m.lessons.length, 0);
  const doneCount = modules.reduce(
    (n, m) => n + m.lessons.filter((l) => completed.has(l.id)).length,
    0,
  );

  return (
    <div>
      <AlumnoPageHeader
        title="Contenido del curso"
        description={
          totalLessons > 0
            ? `${doneCount} de ${totalLessons} lecciones completadas`
            : 'El instructor aún no ha publicado lecciones.'
        }
      />

      {modules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-arena)] bg-card p-10 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-muted-foreground">Pronto aparecerán módulos y lecciones aquí.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {modules.map((mod, modIndex) => (
            <section key={mod.id} className="overflow-hidden rounded-xl border border-[var(--color-arena)] bg-card shadow-sm">
              <div className="border-b border-[var(--color-arena)] bg-muted/40 px-5 py-3">
                <h2 className="font-semibold text-foreground">
                  Módulo {modIndex + 1}: {mod.title}
                </h2>
              </div>
              <ul className="divide-y divide-[var(--color-arena)]">
                {mod.lessons.map((lesson) => {
                  const isDone = completed.has(lesson.id);
                  return (
                    <li key={lesson.id} className="p-5">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-medium text-foreground">{lesson.title}</h3>
                        {isDone ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-secondary">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Completada
                          </span>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => markComplete(lesson)}>
                            Marcar completada
                          </Button>
                        )}
                      </div>
                      {lesson.content_type === 'text' && lesson.text_content ? (
                        <div className="prose prose-sm max-w-none whitespace-pre-wrap rounded-lg bg-muted/30 p-4 text-sm text-foreground">
                          {lesson.text_content}
                        </div>
                      ) : null}
                      {lesson.content_type === 'video' && lesson.video_url ? (
                        <div className="aspect-video overflow-hidden rounded-lg bg-black shadow-inner">
                          <iframe
                            src={lesson.video_url}
                            title={lesson.title}
                            className="h-full w-full"
                            allowFullScreen
                          />
                        </div>
                      ) : null}
                      {lesson.content_type === 'pdf' && lesson.pdf_url ? (
                        <a
                          href={lesson.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex text-sm font-medium text-primary underline-offset-2 hover:underline"
                        >
                          Abrir material PDF
                        </a>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

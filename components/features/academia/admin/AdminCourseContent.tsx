'use client';

import { useEffect, useState } from 'react';
import { AlumnoPageHeader } from '@/components/features/academia/alumno/AlumnoPageHeader';
import { Button } from '@/components/ui/button';
import type { ModuleWithLessons } from '@/lib/academia/types';

export function AdminCourseContent({ courseId }: { courseId: string }) {
  const [modules, setModules] = useState<ModuleWithLessons[]>([]);
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
  }, [courseId]);

  async function addModule() {
    const title = window.prompt('Título del módulo');
    if (!title) return;
    const res = await fetch('/api/academia/admin/courses', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'upsert_module',
        courseId,
        module: { title, order_index: modules.length },
      }),
    });
    if (res.ok) {
      const { id } = await res.json();
      setModules([
        ...modules,
        { id, course_id: courseId, title, order_index: modules.length, lessons: [] },
      ]);
    }
  }

  async function addLesson(moduleId: string) {
    const title = window.prompt('Título de la lección');
    if (!title) return;
    const mod = modules.find((m) => m.id === moduleId);
    const res = await fetch('/api/academia/admin/courses', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'upsert_lesson',
        moduleId,
        lesson: {
          title,
          content_type: 'text',
          text_content: '',
          order_index: mod?.lessons.length ?? 0,
        },
      }),
    });
    if (res.ok) {
      const { id } = await res.json();
      setModules(
        modules.map((m) =>
          m.id === moduleId
            ? {
                ...m,
                lessons: [
                  ...m.lessons,
                  {
                    id,
                    module_id: moduleId,
                    title,
                    content_type: 'text' as const,
                    video_url: null,
                    pdf_url: null,
                    text_content: '',
                    order_index: m.lessons.length,
                    unlock_at: null,
                  },
                ],
              }
            : m,
        ),
      );
    }
  }

  async function updateLessonText(moduleId: string, lessonId: string, text: string) {
    const mod = modules.find((m) => m.id === moduleId);
    const lesson = mod?.lessons.find((l) => l.id === lessonId);
    if (!lesson) return;

    await fetch('/api/academia/admin/courses', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'upsert_lesson',
        moduleId,
        lesson: {
          id: lessonId,
          title: lesson.title,
          content_type: lesson.content_type,
          text_content: text,
          order_index: lesson.order_index,
        },
      }),
    });

    setModules(
      modules.map((m) =>
        m.id === moduleId
          ? {
              ...m,
              lessons: m.lessons.map((l) =>
                l.id === lessonId ? { ...l, text_content: text } : l,
              ),
            }
          : m,
      ),
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--color-arena)] bg-card p-8 text-center text-muted-foreground">
        Cargando contenido…
      </div>
    );
  }

  if (error) return <p className="text-destructive">{error}</p>;

  return (
    <div>
      <AlumnoPageHeader
        title="Contenido del curso"
        description="Administra módulos y lecciones del programa."
      />

      <div className="mb-6 flex justify-end">
        <Button type="button" variant="outline" onClick={addModule}>
          + Nuevo módulo
        </Button>
      </div>

      {modules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-arena)] bg-card p-10 text-center text-muted-foreground">
          Aún no hay módulos. Crea el primero para empezar.
        </div>
      ) : (
        <div className="space-y-6">
          {modules.map((mod, modIndex) => (
            <section
              key={mod.id}
              className="overflow-hidden rounded-xl border border-[var(--color-arena)] bg-card shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-arena)] bg-muted/40 px-5 py-3">
                <h2 className="font-semibold">
                  Módulo {modIndex + 1}: {mod.title}
                </h2>
                <Button type="button" variant="outline" size="sm" onClick={() => addLesson(mod.id)}>
                  + Lección
                </Button>
              </div>
              <ul className="divide-y divide-[var(--color-arena)]">
                {mod.lessons.length === 0 ? (
                  <li className="p-5 text-sm text-muted-foreground">Sin lecciones.</li>
                ) : (
                  mod.lessons.map((lesson) => (
                    <li key={lesson.id} className="p-5">
                      <p className="mb-2 font-medium">{lesson.title}</p>
                      <textarea
                        className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                        defaultValue={lesson.text_content ?? ''}
                        onBlur={(e) => updateLessonText(mod.id, lesson.id, e.target.value)}
                        placeholder="Contenido de la lección"
                      />
                    </li>
                  ))
                )}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

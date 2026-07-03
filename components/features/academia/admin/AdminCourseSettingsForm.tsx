'use client';

import { useEffect, useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { AlumnoPageHeader } from '@/components/features/academia/alumno/AlumnoPageHeader';
import { AdminDeleteCourseButton } from '@/components/features/academia/admin/AdminDeleteCourseButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Course } from '@/lib/academia/types';
import { AdminCourseInstructorPicker } from '@/components/features/academia/admin/AdminCourseInstructorPicker';

type InstructorOption = { id: string; full_name: string | null; status: string };

export function AdminCourseSettingsForm({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [instructors, setInstructors] = useState<InstructorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [form, setForm] = useState({
    instructor_ids: [] as string[],
    primary_instructor_id: '',
    title: '',
    description: '',
    curriculum: '',
    format: 'async' as 'async' | 'sync',
    status: 'draft' as 'draft' | 'published' | 'archived',
    price_full: '',
    price_monthly: '',
    duration_months: '1',
    category: '',
    level: '',
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/academia/courses/${courseId}`).then((r) => r.json()),
      fetch('/api/academia/admin/instructors').then((r) => r.json()),
    ])
      .then(([courseData, instructorsData]) => {
        if (courseData.error) throw new Error(courseData.error);
        setCourse(courseData.course);
        setInstructors(instructorsData.instructors ?? []);
        const c = courseData.course as Course;
        const ids = (courseData.instructor_ids as string[] | undefined) ?? [c.instructor_id];
        setForm({
          instructor_ids: ids,
          primary_instructor_id: c.instructor_id,
          title: c.title,
          description: c.description ?? '',
          curriculum: c.curriculum ?? '',
          format: c.format,
          status: c.status,
          price_full: c.price_full != null ? String(c.price_full) : '',
          price_monthly: c.price_monthly != null ? String(c.price_monthly) : '',
          duration_months: String(c.duration_months ?? 1),
          category: c.category ?? '',
          level: c.level ?? '',
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [courseId]);

  async function saveCourse() {
    if (form.instructor_ids.length === 0) {
      setError('Selecciona al menos un instructor');
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/academia/admin/courses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: courseId,
          ...form,
          instructor_id: form.primary_instructor_id,
          instructor_ids: form.instructor_ids,
          price_full: form.price_full ? Number(form.price_full) : null,
          price_monthly: form.price_monthly ? Number(form.price_monthly) : null,
          duration_months: form.duration_months ? Number(form.duration_months) : 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCourse(data.course);
      setMessage('Curso actualizado correctamente');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--color-arena)] bg-card p-8 text-center text-muted-foreground">
        Cargando…
      </div>
    );
  }

  if (!course) {
    return <p className="text-destructive">{error || 'Curso no encontrado'}</p>;
  }

  return (
    <div>
      <AlumnoPageHeader
        title="Configuración del curso"
        description="Datos generales, profesores asignados, precios y estado de publicación."
      />

      {message ? (
        <div className="mb-6 rounded-xl border border-secondary/30 bg-secondary/10 px-4 py-3 text-sm">
          {message}
        </div>
      ) : null}
      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

      <section className="space-y-4 rounded-xl border border-[var(--color-arena)] bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <Label>Instructores asignados</Label>
          <AdminCourseInstructorPicker
            instructors={instructors}
            selectedIds={form.instructor_ids}
            primaryId={form.primary_instructor_id}
            onChange={(instructor_ids, primary_instructor_id) =>
              setForm({ ...form, instructor_ids, primary_instructor_id })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Título</Label>
          <Input
            id="title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descripción</Label>
          <textarea
            id="description"
            className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <p className="text-sm text-muted-foreground">
          El temario estructurado (temas, subtemas, bibliografía) se edita en la sección{' '}
          <strong>Temario</strong> del menú del curso.
        </p>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Formato</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.format}
              onChange={(e) => setForm({ ...form, format: e.target.value as 'async' | 'sync' })}
            >
              <option value="async">Asíncrono</option>
              <option value="sync">Síncrono</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.status}
              onChange={(e) =>
                setForm({
                  ...form,
                  status: e.target.value as 'draft' | 'published' | 'archived',
                })
              }
            >
              <option value="draft">Borrador</option>
              <option value="published">Publicado</option>
              <option value="archived">Archivado</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Precio completo (MXN)</Label>
            <Input
              type="number"
              value={form.price_full}
              onChange={(e) => setForm({ ...form, price_full: e.target.value })}
            />
          </div>
        </div>

        {form.format === 'sync' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Precio mensual (MXN)</Label>
              <Input
                type="number"
                value={form.price_monthly}
                onChange={(e) => setForm({ ...form, price_monthly: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Duración (meses)</Label>
              <Input
                type="number"
                min={1}
                value={form.duration_months}
                onChange={(e) => setForm({ ...form, duration_months: e.target.value })}
              />
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Categoría</Label>
            <Input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Nivel</Label>
            <Input
              value={form.level}
              onChange={(e) => setForm({ ...form, level: e.target.value })}
            />
          </div>
        </div>

        <Button onClick={saveCourse} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </Button>

        {course.status === 'published' ? (
          <p className="text-sm text-muted-foreground">
            Página pública:{' '}
            <a
              href={`/academia/${course.slug}`}
              className="font-medium text-primary underline-offset-2 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              /academia/{course.slug}
            </a>
          </p>
        ) : null}
      </section>

      <section className="mt-8 rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <h2 className="mb-1 text-sm font-semibold text-destructive">Zona peligrosa</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Eliminar este curso borra también inscripciones, contenido, evaluaciones, cohortes y avisos.
          No se puede deshacer.
        </p>
        <AdminDeleteCourseButton courseId={courseId} courseTitle={course.title} />
      </section>
    </div>
  );
}

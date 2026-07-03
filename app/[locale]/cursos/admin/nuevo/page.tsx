'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlumnoPageHeader } from '@/components/features/academia/alumno/AlumnoPageHeader';
import { AdminCourseInstructorPicker } from '@/components/features/academia/admin/AdminCourseInstructorPicker';

type InstructorOption = { id: string; full_name: string | null; status: string };

export default function AdminNuevoCursoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instructors, setInstructors] = useState<InstructorOption[]>([]);
  const [form, setForm] = useState({
    instructor_ids: [] as string[],
    primary_instructor_id: '',
    title: '',
    description: '',
    curriculum: '',
    format: 'async' as 'async' | 'sync',
    status: 'draft' as 'draft' | 'published',
    price_full: '',
    price_monthly: '',
    duration_months: '6',
    category: '',
    level: '',
  });

  useEffect(() => {
    fetch('/api/academia/admin/instructors')
      .then((r) => r.json())
      .then((data) => setInstructors(data.instructors ?? []))
      .catch(() => setInstructors([]));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.instructor_ids.length === 0) {
      setError('Selecciona al menos un instructor');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/academia/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          curriculum: form.curriculum,
          format: form.format,
          status: form.status,
          price_full: form.price_full ? Number(form.price_full) : null,
          price_monthly: form.price_monthly ? Number(form.price_monthly) : null,
          duration_months: form.duration_months ? Number(form.duration_months) : 1,
          category: form.category,
          level: form.level,
          instructor_id: form.primary_instructor_id || form.instructor_ids[0],
          instructor_ids: form.instructor_ids,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear');

      router.push(`/cursos/admin/${data.course.id}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <AlumnoPageHeader
        title="Nuevo curso"
        description="Completa los datos y asigna uno o más profesores al programa."
      />

      {error ? (
        <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="space-y-4 rounded-xl border border-[var(--color-arena)] bg-card p-6 shadow-sm">
          <div className="space-y-2">
            <Label>Instructores asignados *</Label>
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
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción corta</Label>
            <textarea
              id="description"
              className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <p className="text-sm text-muted-foreground">
            Después de crear el curso podrás armar el temario en la sección <strong>Temario</strong>.
          </p>
        </section>

        <section className="space-y-4 rounded-xl border border-[var(--color-arena)] bg-card p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Formato</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.format}
                onChange={(e) =>
                  setForm({ ...form, format: e.target.value as 'async' | 'sync' })
                }
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
                  setForm({ ...form, status: e.target.value as 'draft' | 'published' })
                }
              >
                <option value="draft">Borrador</option>
                <option value="published">Publicado</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Precio completo (MXN)</Label>
              <Input
                type="number"
                min={0}
                value={form.price_full}
                onChange={(e) => setForm({ ...form, price_full: e.target.value })}
              />
            </div>
            {form.format === 'sync' ? (
              <>
                <div className="space-y-2">
                  <Label>Precio mensual (MXN)</Label>
                  <Input
                    type="number"
                    min={0}
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
              </>
            ) : (
              <>
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
              </>
            )}
          </div>

          {form.format === 'sync' ? (
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
          ) : null}
        </section>

        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando…' : 'Crear curso'}
        </Button>
      </form>
    </div>
  );
}

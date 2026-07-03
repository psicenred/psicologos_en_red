'use client';

import { useEffect, useState } from 'react';
import { AlumnoPageHeader } from '@/components/features/academia/alumno/AlumnoPageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatLabel } from '@/lib/academia/utils';
import { UserPlus } from 'lucide-react';

type InstructorRow = {
  id: string;
  full_name: string | null;
  status: string;
  email: string | null;
  revenue_share_pct: number;
};

export function AdminInstructorsList() {
  const [instructors, setInstructors] = useState<InstructorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    bio: '',
    revenueSharePct: '70',
  });

  function load() {
    setLoading(true);
    fetch('/api/academia/admin/instructors')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setInstructors(data.instructors ?? []);
      })
      .catch((err) => setError((err as Error).message || 'No se pudieron cargar instructores'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit() {
    if (saving) return;
    if (!form.fullName.trim() || !form.email.trim() || !form.password) {
      setError('Completa nombre, correo y contraseña');
      return;
    }
    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch('/api/academia/admin/instructors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          bio: form.bio,
          revenueSharePct: Number(form.revenueSharePct),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo crear el instructor');

      setForm({
        fullName: '',
        email: '',
        password: '',
        bio: '',
        revenueSharePct: '70',
      });
      setShowForm(false);
      setMessage(
        `Instructor creado. Puede iniciar sesión en /academia/login con ${data.instructor.email}.`,
      );
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function handleFormKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
      e.preventDefault();
      void handleSubmit();
    }
  }

  return (
    <div>
      <AlumnoPageHeader
        title="Instructores"
        description="Da de alta a profesores desde aquí. Los alumnos se registran solos; los instructores no."
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Asigna instructores al crear o editar un curso.
        </p>
        <Button type="button" size="sm" onClick={() => setShowForm((v) => !v)}>
          <UserPlus className="mr-1.5 h-4 w-4" />
          {showForm ? 'Cancelar' : 'Agregar instructor'}
        </Button>
      </div>

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

      {showForm ? (
        <div
          role="group"
          aria-labelledby="new-instructor-heading"
          onKeyDown={handleFormKeyDown}
          className="mb-8 space-y-4 rounded-xl border border-[var(--color-arena)] bg-card p-6 shadow-sm"
        >
          <h2
            id="new-instructor-heading"
            className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Nuevo instructor
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="instructor-name">Nombre completo</Label>
              <Input
                id="instructor-name"
                autoComplete="name"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instructor-email">Correo</Label>
              <Input
                id="instructor-email"
                type="email"
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instructor-password">Contraseña temporal</Label>
              <Input
                id="instructor-password"
                type="password"
                autoComplete="new-password"
                data-1p-ignore
                data-lpignore="true"
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instructor-revenue">% ingresos para el instructor</Label>
              <Input
                id="instructor-revenue"
                type="number"
                min={0}
                max={100}
                value={form.revenueSharePct}
                onChange={(e) => setForm({ ...form, revenueSharePct: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="instructor-bio">Bio (opcional)</Label>
              <Textarea
                id="instructor-bio"
                rows={3}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Comparte la contraseña con el instructor por un canal seguro. Podrá cambiarla después si
            configuras recuperación de contraseña.
          </p>
          <Button type="button" disabled={saving} onClick={() => void handleSubmit()}>
            {saving ? 'Creando…' : 'Crear instructor'}
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl border border-[var(--color-arena)] bg-card p-8 text-center text-muted-foreground">
          Cargando…
        </div>
      ) : instructors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-arena)] bg-card p-10 text-center text-muted-foreground">
          Aún no hay instructores. Usa &quot;Agregar instructor&quot; para dar de alta al primero.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {instructors.map((i) => (
            <article
              key={i.id}
              className="rounded-xl border border-[var(--color-arena)] bg-card p-5 shadow-sm"
            >
              <h2 className="font-semibold text-foreground">{i.full_name || 'Sin nombre'}</h2>
              {i.email ? (
                <p className="mt-1 text-sm text-muted-foreground">{i.email}</p>
              ) : null}
              <p className="mt-2 text-sm capitalize text-muted-foreground">
                Estado: {formatLabel(i.status)}
              </p>
              <p className="text-xs text-muted-foreground">
                Ingresos: {i.revenue_share_pct}% · ID: {i.id.slice(0, 8)}…
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

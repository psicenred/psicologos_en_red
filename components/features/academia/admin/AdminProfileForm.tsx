'use client';

import { useRef, useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { AlumnoPageHeader } from '@/components/features/academia/alumno/AlumnoPageHeader';
import { StudentAvatar } from '@/components/features/academia/alumno/StudentAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AdminProfile } from '@/lib/academia/admins';
import { Camera, Trash2 } from 'lucide-react';

export function AdminProfileForm({ initialProfile }: { initialProfile: AdminProfile }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(initialProfile.fullName);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(initialProfile.avatarUrl);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setError(null);
    setMessage(null);

    const form = new FormData();
    form.append('avatar', file);

    try {
      const res = await fetch('/api/academia/profile/avatar', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al subir la foto');
      setAvatarUrl(data.avatarUrl ?? data.profile?.avatarUrl ?? null);
      setMessage('Foto de perfil actualizada');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function removeAvatar() {
    if (!avatarUrl) return;
    if (!window.confirm('¿Eliminar tu foto de perfil?')) return;

    setUploadingAvatar(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch('/api/academia/profile/avatar', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar la foto');
      setAvatarUrl(null);
      setMessage('Foto de perfil eliminada');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (password && password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (password && password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/academia/admin/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          password: password || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');

      setPassword('');
      setConfirmPassword('');
      setMessage('Perfil actualizado correctamente');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <AlumnoPageHeader
        title="Editar mi perfil"
        description="Actualiza tu información y contraseña de administrador."
      />

      {message ? (
        <div className="mb-6 rounded-xl border border-secondary/30 bg-secondary/10 px-4 py-3 text-sm text-secondary-foreground">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <section className="mb-8 rounded-xl border border-[var(--color-arena)] bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Foto de perfil
        </h2>
        <div className="flex flex-wrap items-center gap-6">
          <StudentAvatar name={fullName} avatarUrl={avatarUrl} size="lg" />
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <Button
              type="button"
              variant="outline"
              disabled={uploadingAvatar}
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="mr-2 h-4 w-4" />
              {uploadingAvatar ? 'Subiendo…' : avatarUrl ? 'Cambiar foto' : 'Agregar foto'}
            </Button>
            {avatarUrl ? (
              <Button
                type="button"
                variant="outline"
                disabled={uploadingAvatar}
                onClick={removeAvatar}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar foto
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-xl border border-[var(--color-arena)] bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Datos de cuenta
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="fullName">Nombre completo</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                maxLength={120}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" type="email" value={initialProfile.email} disabled />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-[var(--color-arena)] bg-card p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Contraseña
          </h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Déjala en blanco si no deseas cambiarla.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="password">Nueva contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
              />
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving || uploadingAvatar}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </div>
  );
}

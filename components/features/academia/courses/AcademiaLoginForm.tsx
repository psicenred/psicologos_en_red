'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from '@/i18n/routing';
import { createAcademiaBrowserClient } from '@/lib/academia/supabase/client';

type Mode = 'login' | 'register';

export function AcademiaLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/cursos';
  const authError = searchParams.get('error') === 'auth';

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const supabase = createAcademiaBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw new Error(signInError.message);

      const res = await fetch('/api/academia/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión');

      router.push(data.redirect || next);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch('/api/academia/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrarse');

      if (data.needsEmailConfirmation) {
        setMessage(
          'Revisa tu correo para confirmar la cuenta. Luego podrás iniciar sesión.',
        );
        setMode('login');
        return;
      }

      const supabase = createAcademiaBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw new Error(signInError.message);

      const loginRes = await fetch('/api/academia/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok) throw new Error(loginData.error || 'Error al iniciar sesión');

      router.push(loginData.redirect || '/cursos/alumno');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-6 flex gap-2 rounded-lg bg-muted p-1">
        <button
          type="button"
          className={`flex-1 rounded-md py-2 text-sm font-medium ${mode === 'login' ? 'bg-background shadow' : ''}`}
          onClick={() => setMode('login')}
        >
          Iniciar sesión
        </button>
        <button
          type="button"
          className={`flex-1 rounded-md py-2 text-sm font-medium ${mode === 'register' ? 'bg-background shadow' : ''}`}
          onClick={() => setMode('register')}
        >
          Registrarse
        </button>
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        Cuenta independiente del portal de terapia. El registro público es solo para alumnos;
        instructores y administradores acceden con la cuenta que les asigne el equipo.
      </p>

      {authError && !error ? (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          No se pudo confirmar el enlace del correo. Intenta iniciar sesión con tu contraseña o
          solicita un nuevo correo de confirmación en Supabase.
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {message}
        </div>
      ) : null}

      <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4">
        {mode === 'register' ? (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium">Nombre completo</label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Teléfono (opcional)</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </>
        ) : null}

        <div>
          <label className="mb-1 block text-sm font-medium">Correo</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Contraseña</label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Procesando…' : mode === 'login' ? 'Entrar' : 'Crear cuenta de alumno'}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm">
        <Link href="/academia" className="text-primary hover:underline">
          ← Volver al catálogo
        </Link>
      </p>
    </div>
  );
}

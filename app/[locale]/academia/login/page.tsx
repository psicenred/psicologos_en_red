import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { AcademiaLoginForm } from '@/components/features/academia/courses/AcademiaLoginForm';

export const metadata: Metadata = {
  title: 'Acceso Academia | Psicólogos en Red',
};

export default function AcademiaLoginPage() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="mb-2 text-center text-2xl font-bold">Academia virtual</h1>
        <p className="mb-8 text-center text-muted-foreground">
          Inicia sesión o crea tu cuenta de alumno o instructor
        </p>
        <Suspense fallback={<p className="text-center">Cargando…</p>}>
          <AcademiaLoginForm />
        </Suspense>
      </div>
    </PublicLayout>
  );
}

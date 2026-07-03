'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

export function AdminDeleteCourseButton({
  courseId,
  courseTitle,
  redirectTo = '/cursos/admin',
  variant = 'outline',
  className,
}: {
  courseId: string;
  courseTitle: string;
  redirectTo?: string;
  variant?: 'outline' | 'ghost';
  className?: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const confirmed = window.confirm(
      `¿Eliminar el curso "${courseTitle}"?\n\nSe borrarán también inscripciones, módulos, lecciones, evaluaciones y avisos. Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;

    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/academia/admin/courses?id=${encodeURIComponent(courseId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo eliminar el curso');

      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className={className}>
      <Button
        type="button"
        variant={variant}
        onClick={handleDelete}
        disabled={deleting}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        {deleting ? 'Eliminando…' : 'Eliminar curso'}
      </Button>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

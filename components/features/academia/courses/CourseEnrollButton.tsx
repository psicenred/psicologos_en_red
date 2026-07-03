'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { createAcademiaBrowserClient } from '@/lib/academia/supabase/client';

export function CourseEnrollButton({
  slug,
  priceLabel,
  format,
}: {
  slug: string;
  priceLabel: string;
  format: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (format !== 'async') {
    return (
      <p className="text-sm text-muted-foreground">
        Los cursos síncronos estarán disponibles en la Fase 2. Contáctanos para más información.
      </p>
    );
  }

  async function handleEnroll() {
    setLoading(true);
    setError(null);

    try {
      const supabase = createAcademiaBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push(`/academia/login?next=/academia/${slug}`);
        return;
      }

      const res = await fetch('/api/academia/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo iniciar el pago');

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button size="lg" onClick={handleEnroll} disabled={loading} className="w-full sm:w-auto">
        {loading ? 'Redirigiendo a pago…' : `Inscribirme — ${priceLabel}`}
      </Button>
    </div>
  );
}

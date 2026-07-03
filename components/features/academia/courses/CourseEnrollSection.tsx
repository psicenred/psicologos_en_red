'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { createAcademiaBrowserClient } from '@/lib/academia/supabase/client';
import { formatMxn } from '@/lib/academia/utils';
import { CalendarDays, Users } from 'lucide-react';

type CohortOption = {
  id: string;
  start_date: string;
  end_date: string;
  schedule_label: string;
  start_label: string;
  enrollment_label: string;
  enrollment_count?: number;
};

export function CourseEnrollSection({
  slug,
  format,
  priceFull,
  priceMonthly,
  maxStudents,
  courseTitle,
  skipPayment = false,
}: {
  slug: string;
  format: 'sync' | 'async';
  priceFull: number | null;
  priceMonthly: number | null;
  maxStudents: number;
  courseTitle?: string;
  skipPayment?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cohorts, setCohorts] = useState<CohortOption[]>([]);
  const [cohortId, setCohortId] = useState('');
  const [paymentPlan, setPaymentPlan] = useState<'full' | 'monthly'>('full');

  useEffect(() => {
    if (format !== 'sync') return;
    fetch(`/api/academia/cohorts/by-slug/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        const list = data.cohorts ?? [];
        setCohorts(list);
        if (list[0]) setCohortId(list[0].id);
      })
      .catch(() => setCohorts([]));
  }, [format, slug]);

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
        body: JSON.stringify({
          slug,
          cohortId: format === 'sync' ? cohortId || undefined : undefined,
          paymentPlan: format === 'sync' ? paymentPlan : 'full',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo completar la inscripción');

      if (data.url) {
        window.location.href = data.url;
        return;
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const selectedCohort = cohorts.find((c) => c.id === cohortId);
  const spotsLeft =
    selectedCohort != null && maxStudents > 0
      ? maxStudents - (selectedCohort.enrollment_count ?? 0)
      : null;
  const cohortFull = spotsLeft != null && spotsLeft <= 0;

  const amount =
    format === 'sync' && paymentPlan === 'monthly' ? priceMonthly : priceFull;
  const priceLabel = formatMxn(amount);

  return (
    <div className="space-y-4">
      {skipPayment ? (
        <div className="rounded-lg border border-secondary/40 bg-secondary/10 px-4 py-3 text-sm text-foreground">
          Inscripción sin pago activa (modo demo). Al confirmar entrarás directo al curso.
        </div>
      ) : null}

      {format === 'sync' ? (
        <>
          <div>
            <p className="mb-3 text-sm font-medium">Edición disponible</p>
            {cohorts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--color-arena)] bg-muted/20 p-6 text-sm text-muted-foreground">
                Aún no hay fechas de inicio abiertas para inscripción. Vuelve pronto o contáctanos
                para más información.
              </div>
            ) : cohorts.length === 1 && selectedCohort ? (
              <div className="rounded-xl border-2 border-primary bg-primary/5 p-5 shadow-sm">
                <p className="text-lg font-semibold text-foreground">
                  {selectedCohort.enrollment_label}
                </p>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
                    Sesiones en vivo: {selectedCohort.schedule_label}
                  </p>
                  <p>
                    Finaliza el{' '}
                    {new Date(selectedCohort.end_date).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                  {spotsLeft != null ? (
                    <p className="flex items-center gap-2">
                      <Users className="h-4 w-4 shrink-0 text-primary" />
                      {cohortFull
                        ? 'Cupo lleno'
                        : `${Math.max(0, spotsLeft)} cupos disponibles de ${maxStudents}`}
                    </p>
                  ) : null}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {skipPayment
                    ? `Al inscribirte entrarás automáticamente a esta cohorte${courseTitle ? ` de ${courseTitle}` : ''}.`
                    : `Al inscribirte y completar el pago entrarás automáticamente a esta cohorte${courseTitle ? ` de ${courseTitle}` : ''}.`}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {cohorts.map((c) => {
                  const left =
                    maxStudents > 0 ? maxStudents - (c.enrollment_count ?? 0) : null;
                  const full = left != null && left <= 0;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={full}
                      onClick={() => setCohortId(c.id)}
                      className={`w-full rounded-xl border p-4 text-left transition-colors ${
                        cohortId === c.id
                          ? 'border-primary bg-primary/5'
                          : 'border-[var(--color-arena)] bg-card hover:bg-muted/30'
                      } ${full ? 'cursor-not-allowed opacity-60' : ''}`}
                    >
                      <p className="font-semibold text-foreground">{c.enrollment_label}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{c.schedule_label}</p>
                      {left != null ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {full ? 'Cupo lleno' : `${Math.max(0, left)} cupos disponibles`}
                        </p>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {priceMonthly != null && priceMonthly > 0 && !skipPayment ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`rounded-md border px-3 py-2 text-sm ${paymentPlan === 'full' ? 'border-primary bg-primary/5' : ''}`}
                onClick={() => setPaymentPlan('full')}
              >
                Pago completo {formatMxn(priceFull)}
              </button>
              <button
                type="button"
                className={`rounded-md border px-3 py-2 text-sm ${paymentPlan === 'monthly' ? 'border-primary bg-primary/5' : ''}`}
                onClick={() => setPaymentPlan('monthly')}
              >
                Mensualidades {formatMxn(priceMonthly)}
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button
        size="lg"
        onClick={handleEnroll}
        disabled={
          loading ||
          (format === 'sync' && (cohorts.length === 0 || cohortFull))
        }
        className="w-full sm:w-auto"
      >
        {loading
          ? skipPayment
            ? 'Inscribiendo…'
            : 'Redirigiendo a pago…'
          : skipPayment
            ? format === 'sync' && selectedCohort
              ? 'Confirmar inscripción gratuita'
              : 'Inscribirme gratis'
            : format === 'sync' && selectedCohort
              ? `Inscribirme a esta edición — ${priceLabel}`
              : `Inscribirme — ${priceLabel}`}
      </Button>
    </div>
  );
}

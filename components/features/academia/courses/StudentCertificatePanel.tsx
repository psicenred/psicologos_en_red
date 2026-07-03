'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { CertificateEligibility } from '@/lib/academia/types';

export function StudentCertificatePanel({ courseId }: { courseId: string }) {
  const [data, setData] = useState<CertificateEligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/academia/certificates/course/${courseId}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError('No se pudo cargar el estado del certificado'))
      .finally(() => setLoading(false));
  }, [courseId]);

  async function download() {
    setDownloading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/academia/certificates/course/${courseId}?download=1`,
      );
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'No se pudo generar el certificado');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificado-${courseId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--color-arena)] bg-card p-8 text-center text-sm text-muted-foreground">
        Cargando certificado…
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-[var(--color-arena)] bg-card p-6 shadow-sm">
      {error ? <p className="mb-2 text-sm text-destructive">{error}</p> : null}

      {data?.certificate ? (
        <div className="space-y-2 text-sm">
          <p className="text-green-700">
            Certificado emitido · Código: {data.certificate.certificate_code}
          </p>
          <Button size="sm" onClick={download} disabled={downloading}>
            {downloading ? 'Generando…' : 'Descargar PDF'}
          </Button>
        </div>
      ) : data?.eligible ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Cumples los requisitos (calificación {data.grade}, progreso {data.progressPct}%).
          </p>
          <Button size="sm" onClick={download} disabled={downloading}>
            {downloading ? 'Generando…' : 'Obtener certificado'}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {data?.reason ??
            'Completa el curso con calificación mínima de 70 para obtener tu certificado.'}
          {data?.grade != null ? ` Calificación actual: ${data.grade}.` : ''}
          {data?.progressPct != null && data.progressPct < 100
            ? ` Evaluaciones: ${data.progressPct}%.`
            : ''}
        </p>
      )}
    </section>
  );
}

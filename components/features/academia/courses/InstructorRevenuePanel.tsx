'use client';

import { useEffect, useState } from 'react';
import { formatMxn } from '@/lib/academia/utils';
import type { InstructorRevenueReport } from '@/lib/academia/types';

export function InstructorRevenuePanel() {
  const [report, setReport] = useState<InstructorRevenueReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/academia/instructor/revenue')
      .then((r) => r.json())
      .then((d) => setReport(d.report ?? null))
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--color-arena)] bg-card p-8 text-center text-sm text-muted-foreground">
        Cargando ingresos…
      </div>
    );
  }

  if (!report) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--color-arena)] bg-card p-10 text-center text-muted-foreground">
        No hay datos de ingresos disponibles por ahora.
      </div>
    );
  }

  return (
    <section className="space-y-4 rounded-xl border border-[var(--color-arena)] bg-card p-6 shadow-sm">
      <div>
        <h2 className="font-semibold">Ingresos por cursos</h2>
        <p className="text-sm text-muted-foreground">
          Reporte informativo ({report.revenue_share_pct}% de tu parte). Los pagos se gestionan
          fuera de la plataforma.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Ingresos brutos (pagados)</p>
          <p className="text-xl font-semibold">{formatMxn(report.total_gross_mxn)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Tu parte estimada</p>
          <p className="text-xl font-semibold text-green-700">
            {formatMxn(report.total_instructor_share_mxn)}
          </p>
        </div>
      </div>

      {report.lines.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-2">Curso</th>
                <th className="p-2">Pagos</th>
                <th className="p-2">Bruto</th>
                <th className="p-2">Tu parte</th>
              </tr>
            </thead>
            <tbody>
              {report.lines.map((line) => (
                <tr key={line.course_id} className="border-b last:border-0">
                  <td className="p-2">{line.course_title}</td>
                  <td className="p-2">{line.paid_payments_count}</td>
                  <td className="p-2">{formatMxn(line.gross_mxn)}</td>
                  <td className="p-2">{formatMxn(line.instructor_share_mxn)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

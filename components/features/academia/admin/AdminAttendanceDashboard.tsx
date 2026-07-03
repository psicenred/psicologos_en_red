'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CourseAttendanceReport } from '@/lib/academia/types';

function formatSessionHeader(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AdminAttendanceDashboard({
  courseId,
  isSync,
}: {
  courseId: string;
  isSync: boolean;
}) {
  const [report, setReport] = useState<CourseAttendanceReport | null>(null);
  const [cohortIndex, setCohortIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSync) {
      setLoading(false);
      return;
    }

    fetch(`/api/academia/admin/attendance/course/${courseId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setReport(data);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [courseId, isSync]);

  const cohort = useMemo(() => {
    if (!report?.cohorts.length) return null;
    const idx = Math.min(cohortIndex, report.cohorts.length - 1);
    return report.cohorts[idx];
  }, [report, cohortIndex]);

  if (!isSync) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--color-arena)] bg-card p-10 text-center text-muted-foreground">
        La asistencia solo aplica a cursos síncronos con sesiones en vivo.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--color-arena)] bg-card p-8 text-center text-sm text-muted-foreground">
        Cargando asistencia…
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive">{error}</p>;
  }

  if (!report?.cohorts.length || !cohort) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--color-arena)] bg-card p-10 text-center text-muted-foreground">
        Aún no hay cohortes ni sesiones para este curso.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {report.cohorts.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {report.cohorts.map((c, i) => (
            <button
              key={c.cohort_id}
              type="button"
              onClick={() => setCohortIndex(i)}
              className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                i === cohortIndex
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-[var(--color-arena)] bg-card text-foreground hover:bg-muted/40'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{cohort.label}</p>
      )}

      {cohort.sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Esta cohorte no tiene sesiones programadas.</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {cohort.sessions.map((ses) => (
              <div
                key={ses.session_id}
                className="rounded-xl border border-[var(--color-arena)] bg-card p-4 shadow-sm"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {formatSessionHeader(ses.scheduled_at)}
                </p>
                <p className="mt-1 text-2xl font-bold text-primary">{ses.attendance_pct}%</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {ses.present_count} / {ses.total_students} presentes
                </p>
                <p className="mt-1 text-xs capitalize text-muted-foreground">{ses.status}</p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-xl border border-[var(--color-arena)] bg-card shadow-sm">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-arena)] bg-muted/30">
                  <th className="sticky left-0 z-10 bg-muted/30 px-4 py-3 text-left font-semibold text-foreground">
                    Alumno
                  </th>
                  {cohort.sessions.map((ses) => (
                    <th
                      key={ses.session_id}
                      className="min-w-[72px] px-2 py-3 text-center text-xs font-medium text-muted-foreground"
                      title={formatSessionHeader(ses.scheduled_at)}
                    >
                      {formatSessionHeader(ses.scheduled_at)}
                    </th>
                  ))}
                  <th className="min-w-[64px] px-3 py-3 text-center font-semibold text-foreground">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {cohort.students.map((student) => {
                  const totals = cohort.student_totals[student.student_id];
                  return (
                    <tr
                      key={student.student_id}
                      className="border-b border-[var(--color-arena)]/60 last:border-0"
                    >
                      <td className="sticky left-0 z-10 bg-card px-4 py-2.5 font-medium text-foreground">
                        {student.full_name}
                      </td>
                      {cohort.sessions.map((ses) => {
                        const attended = cohort.matrix[student.student_id]?.[ses.session_id];
                        return (
                          <td key={ses.session_id} className="px-2 py-2.5 text-center">
                            <span
                              className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                                attended
                                  ? 'bg-secondary/20 text-secondary-foreground'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                              title={attended ? 'Presente' : 'Ausente'}
                            >
                              {attended ? '✓' : '—'}
                            </span>
                          </td>
                        );
                      })}
                      <td className="px-3 py-2.5 text-center font-semibold text-foreground">
                        {totals ? `${totals.pct}%` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted/20">
                  <td className="sticky left-0 z-10 bg-muted/20 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Por sesión
                  </td>
                  {cohort.sessions.map((ses) => (
                    <td
                      key={ses.session_id}
                      className="px-2 py-2.5 text-center text-xs font-semibold text-primary"
                    >
                      {ses.attendance_pct}%
                    </td>
                  ))}
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

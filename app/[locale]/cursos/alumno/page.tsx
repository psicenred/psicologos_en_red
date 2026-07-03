import { Link } from '@/i18n/routing';
import { AlumnoPageHeader } from '@/components/features/academia/alumno/AlumnoPageHeader';
import { StudentAnnouncementsFeed } from '@/components/features/academia/alumno/StudentAnnouncementsFeed';
import { PayInstallmentButton } from '@/components/features/academia/courses/PayInstallmentButton';
import { listAnnouncementsForStudent } from '@/lib/academia/announcements';
import { computeEvaluationProgress } from '@/lib/academia/evaluation-progress';
import {
  getEnrollmentPayments,
  getStudentEnrollments,
} from '@/lib/academia/enrollments';
import { getAcademiaSession } from '@/lib/academia/auth';
import { formatLabel } from '@/lib/academia/utils';
import { BookOpen, ChevronRight } from 'lucide-react';

export default async function AlumnoDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; course?: string }>;
}) {
  const session = await getAcademiaSession();
  if (!session) return null;

  const sp = await searchParams;
  const enrollments = await getStudentEnrollments(session.userId);
  const announcements = await listAnnouncementsForStudent(session.userId);

  const enrollmentsWithProgress = await Promise.all(
    enrollments.map(async (enr) => {
      const course = enr.course as { id: string; title: string; slug: string; format: string };
      const { progressPct, total } = await computeEvaluationProgress(session.userId, course.id);
      const payments = await getEnrollmentPayments(enr.id);
      const nextPayment = payments.find((p) => p.status === 'pending' || p.status === 'overdue');
      return {
        ...enr,
        course,
        progressPct,
        totalEvaluations: total,
        nextPayment: nextPayment ?? null,
      };
    }),
  );

  return (
    <div>
      <AlumnoPageHeader
        title="Mis cursos"
        description="Selecciona un curso para continuar aprendiendo."
      />

      {sp.checkout === 'success' ? (
        <div className="mb-6 rounded-xl border border-secondary/30 bg-secondary/10 px-5 py-4 text-secondary-foreground">
          ¡Pago recibido! Ya puedes acceder a tu curso
          {sp.course ? `: ${sp.course}` : ''}.
        </div>
      ) : null}

      <StudentAnnouncementsFeed announcements={announcements} />

      {enrollmentsWithProgress.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-arena)] bg-card p-12 text-center shadow-sm">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
          <p className="mb-4 text-muted-foreground">Aún no estás inscrito en ningún curso.</p>
          <Link
            href="/academia"
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Explorar catálogo
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {enrollmentsWithProgress.map((enr) => (
            <article
              key={enr.id}
              className="flex flex-col overflow-hidden rounded-xl border border-[var(--color-arena)] bg-card shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="border-b border-[var(--color-arena)] bg-secondary/10 px-5 py-4">
                <h2 className="text-lg font-semibold text-foreground">{enr.course.title}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {formatLabel(enr.course.format)} · {formatLabel(enr.status)}
                </p>
              </div>

              <div className="flex flex-1 flex-col p-5">
                {enr.nextPayment &&
                (enr.status === 'active' || enr.status === 'payment_overdue') ? (
                  <div className="mb-4 rounded-lg border border-accent bg-accent/30 p-3">
                    <p className="mb-2 text-sm text-foreground">
                      {enr.status === 'payment_overdue'
                        ? 'Tienes una mensualidad vencida. Regulariza para recuperar el acceso.'
                        : 'Próxima mensualidad pendiente:'}
                    </p>
                    <PayInstallmentButton
                      paymentId={enr.nextPayment.id}
                      amount={Number(enr.nextPayment.amount)}
                      dueDate={enr.nextPayment.due_date}
                    />
                  </div>
                ) : null}

                {enr.status === 'active' && enr.totalEvaluations > 0 ? (
                  <div className="mb-5">
                    <div className="mb-1.5 flex justify-between text-xs font-medium text-muted-foreground">
                      <span>Evaluaciones</span>
                      <span>{enr.progressPct}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${enr.progressPct}%` }}
                      />
                    </div>
                  </div>
                ) : null}

                <div className="mt-auto">
                  {enr.status === 'active' ? (
                    <Link
                      href={`/cursos/alumno/${enr.course.id}`}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                    >
                      Entrar al curso
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  ) : enr.status === 'payment_overdue' ? (
                    <p className="text-center text-sm font-medium text-muted-foreground">
                      Pago vencido — regulariza para continuar
                    </p>
                  ) : (
                    <p className="text-center text-sm font-medium text-muted-foreground">
                      Pendiente de pago
                    </p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

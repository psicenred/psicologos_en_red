import { Link } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import { AlumnoPageHeader } from '@/components/features/academia/alumno/AlumnoPageHeader';
import { computeEvaluationProgress } from '@/lib/academia/evaluation-progress';
import { requireAcademiaRole } from '@/lib/academia/auth';
import { getCourseById } from '@/lib/academia/courses';
import { getEnrollment } from '@/lib/academia/enrollments';
import { getStudentFinalGrade } from '@/lib/academia/grades';
import { parseCurriculum } from '@/lib/academia/curriculum';
import { Award, ClipboardList, FileCheck, ListTree, MessageSquare, Video } from 'lucide-react';

export default async function AlumnoCourseHomePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const session = await requireAcademiaRole('student');

  const course = await getCourseById(courseId);
  if (!course) notFound();

  const enrollment = await getEnrollment(session.userId, courseId);
  if (!enrollment) notFound();

  const { progressPct, completed, total } = await computeEvaluationProgress(
    session.userId,
    courseId,
  );
  const gradeRow = await getStudentFinalGrade(session.userId, courseId);
  const curriculum = parseCurriculum(course.curriculum);
  const themeCount = curriculum.themes.length;
  const gradingMode = course.grading_mode ?? 'weighted';

  const gradeLabel =
    gradingMode === 'pass_fail'
      ? gradeRow?.pass_status === 'passed'
        ? 'Aprobado'
        : gradeRow?.pass_status === 'failed'
          ? 'Reprobado'
          : 'Pendiente'
      : gradeRow?.computed_grade != null
        ? String(gradeRow.computed_grade)
        : '—';

  const quickLinks = [
    { href: `/cursos/alumno/${courseId}/temario`, label: 'Temario', icon: ListTree },
    { href: `/cursos/alumno/${courseId}/tareas`, label: 'Tareas', icon: ClipboardList },
    { href: `/cursos/alumno/${courseId}/examenes`, label: 'Exámenes', icon: FileCheck },
    { href: `/cursos/alumno/${courseId}/calificaciones`, label: 'Calificaciones', icon: Award },
    { href: `/cursos/alumno/${courseId}/foro`, label: 'Foro', icon: MessageSquare },
    ...(course.format === 'sync'
      ? [{ href: `/cursos/alumno/${courseId}/en-vivo`, label: 'En vivo', icon: Video }]
      : []),
  ];

  return (
    <div>
      <AlumnoPageHeader
        title={course.title}
        description="Resumen de tu avance y accesos rápidos a cada sección del curso."
      />

      {enrollment.status !== 'active' ? (
        <div className="mb-6 rounded-xl border border-accent bg-accent/40 px-5 py-4 text-sm text-foreground">
          {enrollment.status === 'payment_overdue'
            ? 'Tu acceso está limitado por un pago vencido. Regulariza tu mensualidad para continuar.'
            : 'Tu inscripción está pendiente de activación.'}
        </div>
      ) : null}

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--color-arena)] bg-card p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Evaluaciones
          </p>
          <p className="mt-1 text-3xl font-bold text-primary">{progressPct}%</p>
          {total > 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {completed} de {total} completadas
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">Sin evaluaciones aún</p>
          )}
        </div>
        <div className="rounded-xl border border-[var(--color-arena)] bg-card p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Temas</p>
          <p className="mt-1 text-3xl font-bold text-secondary">{themeCount}</p>
        </div>
        <div className="rounded-xl border border-[var(--color-arena)] bg-card p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {gradingMode === 'pass_fail' ? 'Resultado' : 'Calificación'}
          </p>
          <p className="mt-1 text-3xl font-bold text-foreground">{gradeLabel}</p>
        </div>
      </div>

      {total > 0 ? (
        <div className="mb-8">
          <div className="mb-2 flex justify-between text-sm text-muted-foreground">
            <span>Avance en evaluaciones</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      ) : null}

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Accesos rápidos
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-xl border border-[var(--color-arena)] bg-card px-4 py-4 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="font-medium text-foreground">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

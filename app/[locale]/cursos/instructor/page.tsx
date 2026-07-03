import { Link } from '@/i18n/routing';
import { AlumnoPageHeader } from '@/components/features/academia/alumno/AlumnoPageHeader';
import { getAcademiaSession } from '@/lib/academia/auth';
import { listInstructorCourses } from '@/lib/academia/courses';
import { formatLabel } from '@/lib/academia/utils';
import { BookOpen, ChevronRight } from 'lucide-react';

export default async function InstructorDashboardPage() {
  const session = await getAcademiaSession();
  if (!session) return null;

  const courses = await listInstructorCourses(session.userId);

  return (
    <div>
      <AlumnoPageHeader
        title="Mis cursos"
        description="Cursos asignados por el equipo de academia. Selecciona uno para gestionar contenido, evaluaciones y sesiones."
      />

      {courses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-arena)] bg-card p-12 text-center shadow-sm">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">
            Aún no tienes cursos asignados. Cuando el administrador te asigne uno, aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {courses.map((c) => (
            <article
              key={c.id}
              className="flex flex-col overflow-hidden rounded-xl border border-[var(--color-arena)] bg-card shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="border-b border-[var(--color-arena)] bg-secondary/10 px-5 py-4">
                <h2 className="text-lg font-semibold text-foreground">{c.title}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {formatLabel(c.format)} · {formatLabel(c.status)}
                </p>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <div className="mt-auto">
                  <Link
                    href={`/cursos/instructor/${c.id}`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    Gestionar curso
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

import { Link } from '@/i18n/routing';
import { AdminDeleteCourseButton } from '@/components/features/academia/admin/AdminDeleteCourseButton';
import { getAcademiaSession } from '@/lib/academia/auth';
import { listAllCourses } from '@/lib/academia/courses';
import { formatLabel, formatMxn } from '@/lib/academia/utils';
import { BookOpen, ChevronRight, PlusCircle } from 'lucide-react';

export default async function AdminCoursesPage() {
  const session = await getAcademiaSession();
  if (!session) return null;

  const courses = await listAllCourses();

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--color-arena)] pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Administración de cursos
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
            Crea cursos, asigna instructores y gestiona el catálogo de academia.
          </p>
        </div>
        <Link
          href="/cursos/admin/nuevo"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <PlusCircle className="h-4 w-4" />
          Nuevo curso
        </Link>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-arena)] bg-card p-12 text-center shadow-sm">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
          <p className="mb-4 text-muted-foreground">No hay cursos creados. Empieza con &quot;Nuevo curso&quot;.</p>
          <Link
            href="/cursos/admin/nuevo"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Crear primer curso
            <ChevronRight className="h-4 w-4" />
          </Link>
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
                  {c.instructor?.full_name ?? 'Sin instructor'} · {formatLabel(c.format)} ·{' '}
                  {formatLabel(c.status)}
                </p>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="mb-4 text-sm text-muted-foreground">
                  Precio: {formatMxn(c.price_full)}
                </p>
                <div className="mt-auto space-y-2">
                  <Link
                    href={`/cursos/admin/${c.id}`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    Gestionar curso
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                  <AdminDeleteCourseButton
                    courseId={c.id}
                    courseTitle={c.title}
                    variant="ghost"
                    className="flex justify-center"
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

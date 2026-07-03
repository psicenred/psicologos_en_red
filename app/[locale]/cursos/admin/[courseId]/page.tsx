import { Link } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import { AlumnoPageHeader } from '@/components/features/academia/alumno/AlumnoPageHeader';
import { getCourseById } from '@/lib/academia/courses';
import { ListTree, Settings, UsersRound } from 'lucide-react';

export default async function AdminCourseHomePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const course = await getCourseById(courseId);
  if (!course) notFound();

  const quickLinks = [
    { href: `/cursos/admin/${courseId}/configuracion`, label: 'Configuración', icon: Settings },
    { href: `/cursos/admin/${courseId}/temario`, label: 'Temario', icon: ListTree },
    ...(course.format === 'sync'
      ? [{ href: `/cursos/admin/${courseId}/cohortes`, label: 'Cohortes', icon: UsersRound }]
      : []),
  ];

  return (
    <div>
      <AlumnoPageHeader
        title={course.title}
        description="Resumen del curso y accesos rápidos a configuración, temario y cohortes."
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--color-arena)] bg-card p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Formato</p>
          <p className="mt-1 text-lg font-semibold capitalize text-foreground">{course.format}</p>
        </div>
        <div className="rounded-xl border border-[var(--color-arena)] bg-card p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Estado</p>
          <p className="mt-1 text-lg font-semibold capitalize text-foreground">{course.status}</p>
        </div>
        <div className="rounded-xl border border-[var(--color-arena)] bg-card p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Slug</p>
          <p className="mt-1 truncate text-sm font-medium text-foreground">{course.slug}</p>
        </div>
      </div>

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

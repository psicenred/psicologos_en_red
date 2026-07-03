import { Link } from '@/i18n/routing';
import { AlumnoPageHeader } from '@/components/features/academia/alumno/AlumnoPageHeader';
import { getCourseById } from '@/lib/academia/courses';
import { BookOpen, ClipboardCheck, BarChart3, ListTree, Megaphone, Video, FileText } from 'lucide-react';

export default async function InstructorCourseHomePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const course = await getCourseById(courseId);
  if (!course) return null;

  const quickLinks = [
    { href: `/cursos/instructor/${courseId}/temario`, label: 'Temario', icon: ListTree },
    {
      href: `/cursos/instructor/${courseId}/evaluaciones`,
      label: 'Evaluaciones',
      icon: ClipboardCheck,
    },
    {
      href: `/cursos/instructor/${courseId}/entregas`,
      label: 'Entregas',
      icon: FileText,
    },
    { href: `/cursos/instructor/${courseId}/avisos`, label: 'Avisos', icon: Megaphone },
    { href: `/cursos/instructor/${courseId}/metricas`, label: 'Métricas', icon: BarChart3 },
    ...(course.format === 'sync'
      ? [{ href: `/cursos/instructor/${courseId}/en-vivo`, label: 'En vivo', icon: Video }]
      : []),
  ];

  return (
    <div>
      <AlumnoPageHeader
        title={course.title}
        description="Resumen del curso y accesos rápidos a cada sección de gestión."
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
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Precio</p>
          <p className="mt-1 text-lg font-semibold text-primary">
            {course.price_full != null
              ? `$${Number(course.price_full).toLocaleString('es-MX')} MXN`
              : course.price_monthly != null
                ? `$${Number(course.price_monthly).toLocaleString('es-MX')}/mes`
                : '—'}
          </p>
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

import Image from 'next/image';
import { Link } from '@/i18n/routing';
import type { CourseWithInstructor } from '@/lib/academia/types';
import { formatLabel, formatMxn } from '@/lib/academia/utils';

const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=800&q=80';

export function CourseCard({ course }: { course: CourseWithInstructor }) {
  const img = course.thumbnail_url?.trim() || FALLBACK_IMG;

  return (
    <article className="curso-card flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm">
      <div
        className="h-44 bg-cover bg-center"
        style={{ backgroundImage: `url('${img}')` }}
        role="img"
        aria-label={course.title}
      />
      <div className="flex flex-1 flex-col gap-2 p-4">
        {course.category ? (
          <span className="text-xs font-medium uppercase tracking-wide text-primary">
            {course.category}
          </span>
        ) : null}
        <h3 className="text-lg font-semibold text-foreground">{course.title}</h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {course.description || 'Sin descripción'}
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2 text-sm">
          <span className="rounded-full bg-muted px-2 py-0.5">
            {formatLabel(course.format)}
          </span>
          {course.level ? (
            <span className="rounded-full bg-muted px-2 py-0.5">{course.level}</span>
          ) : null}
          <span className="ml-auto font-semibold text-primary">
            {formatMxn(course.price_full)}
          </span>
        </div>
        <Link
          href={`/academia/${course.slug}`}
          className="btn-curso mt-2 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Ver curso
        </Link>
      </div>
    </article>
  );
}

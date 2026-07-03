import { Link } from '@/i18n/routing';
import type { StudentAnnouncementFeedItem } from '@/lib/academia/types';
import { Megaphone } from 'lucide-react';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-MX', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function StudentAnnouncementsFeed({
  announcements,
}: {
  announcements: StudentAnnouncementFeedItem[];
}) {
  if (announcements.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center gap-2">
        <Megaphone className="h-5 w-5 text-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Avisos de tus profesores
        </h2>
      </div>

      <ul className="space-y-3">
        {announcements.map((a) => (
          <li
            key={a.id}
            className="rounded-xl border border-primary/20 bg-primary/5 p-5 shadow-sm"
          >
            <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-primary">
                  {a.course_title}
                  {a.instructor_name ? ` · ${a.instructor_name}` : ''}
                </p>
                <h3 className="mt-0.5 font-semibold text-foreground">{a.title}</h3>
              </div>
              <time className="shrink-0 text-xs text-muted-foreground">{formatDate(a.created_at)}</time>
            </div>
            <p className="whitespace-pre-wrap text-sm text-foreground">{a.body}</p>
            <Link
              href={`/cursos/alumno/${a.course_id}`}
              className="mt-3 inline-block text-xs font-medium text-primary hover:underline"
            >
              Ir al curso →
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

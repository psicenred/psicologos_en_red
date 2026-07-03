import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { CourseEnrollSection } from '@/components/features/academia/courses/CourseEnrollSection';
import { CurriculumDisplay } from '@/components/features/academia/courses/CurriculumDisplay';
import { isAcademiaFreeEnrollmentEnabled } from '@/lib/academia/config';
import { getPublishedCourseBySlug } from '@/lib/academia/courses';
import { hasCurriculumContent, parseCurriculum } from '@/lib/academia/curriculum';
import { formatLabel, formatMxn } from '@/lib/academia/utils';

type Props = { params: Promise<{ 'course-slug': string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { 'course-slug': slug } = await params;
  const course = await getPublishedCourseBySlug(slug);
  return { title: course?.title ?? 'Curso' };
}

export default async function CourseDetailPage({ params }: Props) {
  const { 'course-slug': slug } = await params;
  const course = await getPublishedCourseBySlug(slug);
  if (!course) notFound();

  const instructorName = course.instructor?.full_name ?? 'Instructor';
  const img = course.thumbnail_url?.trim();
  const skipPayment = isAcademiaFreeEnrollmentEnabled();

  return (
    <PublicLayout>
      <article className="mx-auto max-w-4xl px-4 py-10">
        {img ? (
          <div className="relative mb-6 h-56 w-full overflow-hidden rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img} alt={course.title} className="h-full w-full object-cover" />
          </div>
        ) : null}

        <div className="mb-2 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-muted px-2 py-0.5">{formatLabel(course.format)}</span>
          {course.level ? (
            <span className="rounded-full bg-muted px-2 py-0.5">{course.level}</span>
          ) : null}
          {course.category ? (
            <span className="rounded-full bg-muted px-2 py-0.5">{course.category}</span>
          ) : null}
        </div>

        <h1 className="mb-4 text-3xl font-bold">{course.title}</h1>
        <p className="mb-6 text-muted-foreground">{course.description}</p>

        <div className="mb-8 rounded-lg border bg-muted/30 p-4">
          <p className="text-sm font-medium">Instructor</p>
          <p className="text-lg">{instructorName}</p>
          {course.instructor?.bio ? (
            <p className="mt-1 text-sm text-muted-foreground">{course.instructor.bio}</p>
          ) : null}
        </div>

        <div className="mb-8">
          <h2 className="mb-2 text-xl font-semibold">Inversión</h2>
          {skipPayment ? (
            <p className="text-lg font-medium text-secondary">Inscripción gratuita (demo)</p>
          ) : (
            <>
              <p className="text-2xl font-bold text-primary">{formatMxn(course.price_full)}</p>
              {course.format === 'sync' && course.price_monthly ? (
                <p className="text-sm text-muted-foreground">
                  o {formatMxn(course.price_monthly)}/mes ({course.duration_months} meses)
                </p>
              ) : null}
            </>
          )}
        </div>

        <CourseEnrollSection
          slug={course.slug}
          format={course.format}
          priceFull={course.price_full}
          priceMonthly={course.price_monthly}
          maxStudents={course.max_students}
          courseTitle={course.title}
          skipPayment={skipPayment}
        />

        {course.curriculum && hasCurriculumContent(parseCurriculum(course.curriculum)) ? (
          <section className="mt-10 border-t pt-8">
            <h2 className="mb-4 text-xl font-semibold">Temario</h2>
            <CurriculumDisplay raw={course.curriculum} />
          </section>
        ) : null}
      </article>
    </PublicLayout>
  );
}

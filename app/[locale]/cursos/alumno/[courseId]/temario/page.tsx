import { notFound } from 'next/navigation';
import { CourseTemarioPanel } from '@/components/features/academia/courses/CourseTemarioPanel';
import { requireAcademiaRole } from '@/lib/academia/auth';
import { getCourseById } from '@/lib/academia/courses';
import { getEnrollment } from '@/lib/academia/enrollments';

export default async function AlumnoCourseTemarioPage({
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

  return <CourseTemarioPanel courseId={courseId} mode="student" />;
}

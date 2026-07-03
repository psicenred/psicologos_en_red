import { notFound } from 'next/navigation';
import { requireAcademiaRole } from '@/lib/academia/auth';
import { isCourseInstructor } from '@/lib/academia/course-instructors';

export default async function InstructorCourseLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const session = await requireAcademiaRole('instructor');

  if (!(await isCourseInstructor(courseId, session.userId))) {
    notFound();
  }

  return children;
}

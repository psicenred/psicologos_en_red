import { NextResponse } from 'next/server';
import { getAcademiaSession } from '@/lib/academia/auth';
import { isCourseInstructor, getCourseInstructorIds } from '@/lib/academia/course-instructors';
import { getCourseById, getCourseModulesWithLessons } from '@/lib/academia/courses';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params;
  const session = await getAcademiaSession();

  const course = await getCourseById(courseId);
  if (!course) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  }

  const isAssignedInstructor =
    session?.role === 'instructor' &&
    (await isCourseInstructor(courseId, session.userId));
  const isAdmin = session?.role === 'admin';
  const isPublic = course.status === 'published';

  if (!isAssignedInstructor && !isAdmin && !isPublic) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const modules = await getCourseModulesWithLessons(courseId);
  const instructorIds =
    isAdmin || isAssignedInstructor ? await getCourseInstructorIds(courseId) : undefined;

  return NextResponse.json({ course, modules, instructor_ids: instructorIds });
}

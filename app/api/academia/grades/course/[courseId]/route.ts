import { NextResponse } from 'next/server';
import { getAcademiaSession } from '@/lib/academia/auth';
import { isCourseInstructor } from '@/lib/academia/course-instructors';
import { getCourseById } from '@/lib/academia/courses';
import { listPendingSubmissionsForCourse } from '@/lib/academia/assignments';
import { getInstructorCourseMetrics, getStudentFinalGrade, listCourseStudentGrades } from '@/lib/academia/grades';
import { setStudentPassStatus } from '@/lib/academia/pass-status';
import type { CoursePassStatus } from '@/lib/academia/types';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const session = await getAcademiaSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { courseId } = await params;
  const course = await getCourseById(courseId);

  if (session.role === 'student') {
    const grade = await getStudentFinalGrade(session.userId, courseId);
    return NextResponse.json({ grade, grading_mode: course?.grading_mode ?? 'weighted' });
  }

  if (session.role === 'instructor') {
    if (!(await isCourseInstructor(courseId, session.userId))) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
    }
    const [metrics, pending, students] = await Promise.all([
      getInstructorCourseMetrics(session.userId, courseId),
      listPendingSubmissionsForCourse(courseId, session.userId),
      listCourseStudentGrades(courseId),
    ]);
    return NextResponse.json({
      metrics,
      pending,
      students,
      grading_mode: course?.grading_mode ?? 'weighted',
    });
  }

  if (session.role === 'admin') {
    const grade = await getStudentFinalGrade(session.userId, courseId);
    return NextResponse.json({ grade, grading_mode: course?.grading_mode ?? 'weighted' });
  }

  return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const session = await getAcademiaSession();
  if (!session || session.role !== 'instructor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { courseId } = await params;
  if (!(await isCourseInstructor(courseId, session.userId))) {
    return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
  }

  const course = await getCourseById(courseId);

  const body = await request.json();
  const action = String(body.action ?? '');

  if (action === 'set_pass_status') {
    const studentId = String(body.studentId ?? '');
    const passStatus = String(body.passStatus ?? '') as CoursePassStatus;
    if (!studentId || !['pending', 'passed', 'failed'].includes(passStatus)) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }
    try {
      await setStudentPassStatus(courseId, studentId, passStatus);
      return NextResponse.json({ ok: true });
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 400 });
    }
  }

  return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
}

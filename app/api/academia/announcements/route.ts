import { NextResponse } from 'next/server';
import { getAcademiaSession } from '@/lib/academia/auth';
import {
  createAnnouncement,
  listAnnouncementsForCourse,
  listAnnouncementsForStudent,
} from '@/lib/academia/announcements';

export async function GET(request: Request) {
  const session = await getAcademiaSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const courseId = new URL(request.url).searchParams.get('courseId');

  try {
    if (session.role === 'student') {
      const announcements = await listAnnouncementsForStudent(session.userId);
      return NextResponse.json({ announcements });
    }

    if (!courseId) {
      return NextResponse.json({ error: 'courseId requerido' }, { status: 400 });
    }

    if (session.role !== 'instructor' && session.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const announcements = await listAnnouncementsForCourse(courseId);
    return NextResponse.json({ announcements });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const session = await getAcademiaSession();
  if (!session || session.role !== 'instructor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const courseId = String(body.courseId ?? '');
    const title = String(body.title ?? '');
    const message = String(body.body ?? body.message ?? '');

    const announcement = await createAnnouncement(session.userId, courseId, title, message, {
      visibleFrom: body.visibleFrom ? String(body.visibleFrom) : undefined,
      visibleUntil: body.visibleUntil ? String(body.visibleUntil) : null,
    });
    return NextResponse.json({ announcement });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

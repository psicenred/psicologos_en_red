import { NextResponse } from 'next/server';
import { getAcademiaSession } from '@/lib/academia/auth';
import { createForumThread, listForumThreads } from '@/lib/academia/forum';

export async function GET(request: Request) {
  const session = await getAcademiaSession();
  if (!session || session.role !== 'student') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const courseId = new URL(request.url).searchParams.get('courseId');
  if (!courseId) {
    return NextResponse.json({ error: 'courseId requerido' }, { status: 400 });
  }

  try {
    const threads = await listForumThreads(session.userId, courseId);
    return NextResponse.json({ threads });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const session = await getAcademiaSession();
  if (!session || session.role !== 'student') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const courseId = String(body.courseId ?? '');
    const title = String(body.title ?? '');
    const message = String(body.body ?? '');

    const thread = await createForumThread(session.userId, courseId, title, message);
    return NextResponse.json({ thread });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

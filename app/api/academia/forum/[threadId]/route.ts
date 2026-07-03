import { NextResponse } from 'next/server';
import { getAcademiaSession } from '@/lib/academia/auth';
import { createForumReply, getForumThread } from '@/lib/academia/forum';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const session = await getAcademiaSession();
  if (!session || session.role !== 'student') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { threadId } = await params;

  try {
    const thread = await getForumThread(session.userId, threadId);
    if (!thread) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }
    return NextResponse.json({ thread });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const session = await getAcademiaSession();
  if (!session || session.role !== 'student') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { threadId } = await params;

  try {
    const body = await request.json();
    const reply = await createForumReply(session.userId, threadId, String(body.body ?? ''));
    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

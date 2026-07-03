import { NextResponse } from 'next/server';
import { getAcademiaSession } from '@/lib/academia/auth';
import { updateLiveSessionScheduledAt } from '@/lib/academia/cohorts';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const session = await getAcademiaSession();
  if (!session || (session.role !== 'instructor' && session.role !== 'admin')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { sessionId } = await params;
  const body = await request.json();
  const scheduledAt = String(body.scheduled_at ?? '').trim();

  if (!scheduledAt) {
    return NextResponse.json({ error: 'Fecha requerida' }, { status: 400 });
  }

  try {
    const liveSession = await updateLiveSessionScheduledAt({
      sessionId,
      scheduledAt,
      instructorId: session.role === 'instructor' ? session.userId : undefined,
      asAdmin: session.role === 'admin',
    });
    return NextResponse.json({ session: liveSession });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

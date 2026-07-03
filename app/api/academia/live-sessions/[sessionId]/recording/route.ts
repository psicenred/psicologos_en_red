import { NextResponse } from 'next/server';
import { getAcademiaSession } from '@/lib/academia/auth';
import { setSessionRecordingUrl } from '@/lib/academia/recordings';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const session = await getAcademiaSession();
  if (!session || session.role !== 'instructor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { sessionId } = await params;
  const body = await request.json();
  const recordingUrl = String(body.recordingUrl ?? '').trim();

  if (!recordingUrl) {
    return NextResponse.json({ error: 'URL de grabación requerida' }, { status: 400 });
  }

  try {
    const liveSession = await setSessionRecordingUrl(
      session.userId,
      sessionId,
      recordingUrl,
    );
    return NextResponse.json({ session: liveSession });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

import { NextResponse } from 'next/server';
import { getAcademiaSession } from '@/lib/academia/auth';
import { getSessionAttendanceSheet, setSessionAttendance } from '@/lib/academia/attendance';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const session = await getAcademiaSession();
  if (!session || (session.role !== 'instructor' && session.role !== 'admin')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { sessionId } = await params;

  try {
    const sheet =
      session.role === 'admin'
        ? await getSessionAttendanceSheet(sessionId, { allowAdmin: true })
        : await getSessionAttendanceSheet(sessionId, { instructorId: session.userId });

    return NextResponse.json(sheet);
  } catch (err) {
    const message = (err as Error).message;
    const status = message === 'No autorizado' ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const session = await getAcademiaSession();
  if (!session || session.role !== 'instructor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { sessionId } = await params;
  const body = await request.json();
  const entries = Array.isArray(body.entries)
    ? body.entries.map((e: { student_id?: string; attended?: boolean }) => ({
        student_id: String(e.student_id ?? ''),
        attended: Boolean(e.attended),
      }))
    : [];

  if (!entries.length) {
    return NextResponse.json({ error: 'Lista de asistencia vacía' }, { status: 400 });
  }

  try {
    const sheet = await setSessionAttendance(session.userId, sessionId, entries);
    return NextResponse.json(sheet);
  } catch (err) {
    const message = (err as Error).message;
    const status = message === 'No autorizado' ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

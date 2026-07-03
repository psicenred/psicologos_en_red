import { NextResponse } from 'next/server';
import { getAcademiaSession } from '@/lib/academia/auth';
import { submitAssignment } from '@/lib/academia/assignments';
import { uploadAssignmentSubmissionPdf } from '@/lib/academia/submission-files';

export async function POST(request: Request) {
  const session = await getAcademiaSession();
  if (!session || session.role !== 'student') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const form = await request.formData();
    const file = form.get('file');
    const assignmentId = String(form.get('assignmentId') ?? '');

    if (!assignmentId) {
      return NextResponse.json({ error: 'assignmentId requerido' }, { status: 400 });
    }
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No se recibió archivo PDF' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const storedPath = await uploadAssignmentSubmissionPdf(
      session.userId,
      assignmentId,
      buffer,
      file.name || 'entrega.pdf',
    );

    const submission = await submitAssignment(session.userId, assignmentId, [storedPath]);
    return NextResponse.json({ submission, storedPath });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

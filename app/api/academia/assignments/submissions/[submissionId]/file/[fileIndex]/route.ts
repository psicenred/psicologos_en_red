import { NextResponse } from 'next/server';
import { getAcademiaSession } from '@/lib/academia/auth';
import { assertCanReadAssignmentFile } from '@/lib/academia/submission-review';
import { isExternalFileUrl } from '@/lib/academia/submission-urls';
import { storageRead } from '@/lib/storage';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ submissionId: string; fileIndex: string }> },
) {
  const session = await getAcademiaSession();
  if (!session || (session.role !== 'instructor' && session.role !== 'student')) {
    return new NextResponse('No autorizado', { status: 403 });
  }

  const { submissionId, fileIndex: fileIndexParam } = await params;
  const fileIndex = Number(fileIndexParam);
  if (!Number.isFinite(fileIndex) || fileIndex < 0) {
    return new NextResponse('Índice inválido', { status: 400 });
  }

  try {
    const { storedPath, fileName } = await assertCanReadAssignmentFile(
      submissionId,
      fileIndex,
      session.role === 'instructor' ? 'instructor' : 'student',
      session.userId,
    );

    if (isExternalFileUrl(storedPath)) {
      return NextResponse.redirect(storedPath);
    }

    const file = await storageRead(storedPath);
    if (!file) {
      return new NextResponse('Archivo no encontrado', { status: 404 });
    }

    return new NextResponse(new Uint8Array(file.data), {
      headers: {
        'Content-Type': file.contentType,
        'Content-Disposition': `inline; filename="${fileName}"`,
      },
    });
  } catch (err) {
    return new NextResponse((err as Error).message, { status: 403 });
  }
}

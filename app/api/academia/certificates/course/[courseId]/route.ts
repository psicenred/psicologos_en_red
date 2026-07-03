import { NextResponse } from 'next/server';
import { getAcademiaSession } from '@/lib/academia/auth';
import {
  getCertificateEligibility,
  getCertificatePdfForStudent,
  verifyCertificateCode,
} from '@/lib/academia/certificates';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const session = await getAcademiaSession();
  const { courseId } = await params;
  const { searchParams } = new URL(request.url);
  const verifyCode = searchParams.get('verify');

  if (verifyCode) {
    const result = await verifyCertificateCode(verifyCode);
    if (!result) {
      return NextResponse.json({ valid: false }, { status: 404 });
    }
    return NextResponse.json({ valid: true, certificate: result });
  }

  if (!session || session.role !== 'student') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const download = searchParams.get('download') === '1';

  if (download) {
    try {
      const { pdf, certificate, course } = await getCertificatePdfForStudent(
        session.userId,
        courseId,
      );
      const filename = `certificado-${course.slug}.pdf`;
      return new NextResponse(Buffer.from(pdf), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 400 });
    }
  }

  const eligibility = await getCertificateEligibility(session.userId, courseId);
  return NextResponse.json(eligibility);
}

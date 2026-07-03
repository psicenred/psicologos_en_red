import { NextResponse } from 'next/server';
import { getAcademiaSession } from '@/lib/academia/auth';
import { getInstructorRevenueReport } from '@/lib/academia/revenue';

export async function GET() {
  const session = await getAcademiaSession();
  if (!session || session.role !== 'instructor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const report = await getInstructorRevenueReport(session.userId);
  return NextResponse.json({ report });
}

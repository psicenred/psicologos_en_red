import { NextResponse } from 'next/server';
import { getAcademiaSession } from '@/lib/academia/auth';
import { adminCreateInstructor, listAdminInstructors } from '@/lib/academia/admin-instructors';

export async function GET() {
  const session = await getAcademiaSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const instructors = await listAdminInstructors();
    return NextResponse.json({ instructors });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const session = await getAcademiaSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const instructor = await adminCreateInstructor({
      email: String(body.email ?? ''),
      password: String(body.password ?? ''),
      fullName: String(body.fullName ?? ''),
      bio: body.bio ? String(body.bio) : undefined,
      revenueSharePct:
        body.revenueSharePct != null ? Number(body.revenueSharePct) : undefined,
    });
    return NextResponse.json({ instructor });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

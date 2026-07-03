import { NextResponse } from 'next/server';
import { getAcademiaSession } from '@/lib/academia/auth';
import { deleteAnnouncement } from '@/lib/academia/announcements';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ announcementId: string }> },
) {
  const session = await getAcademiaSession();
  if (!session || session.role !== 'instructor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const { announcementId } = await params;
    await deleteAnnouncement(session.userId, announcementId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

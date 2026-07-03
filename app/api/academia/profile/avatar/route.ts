import path from 'path';
import { NextResponse } from 'next/server';
import { getAcademiaSession } from '@/lib/academia/auth';
import {
  deleteStoredAvatarIfOwned,
  uploadAcademiaAvatar,
} from '@/lib/academia/avatars';
import { getInstructorProfile } from '@/lib/academia/instructors';
import { getStudentProfile } from '@/lib/academia/students';
import { getAdminProfile } from '@/lib/academia/admins';
import { updateAcademiaUserAvatarUrl } from '@/lib/academia/profile-auth';
import { isImageBuffer } from '@/lib/security/file-validation';

type AcademiaProfileRole = 'student' | 'instructor' | 'admin';

async function getProfileForRole(userId: string, role: AcademiaProfileRole) {
  if (role === 'admin') return getAdminProfile(userId);
  if (role === 'instructor') return getInstructorProfile(userId);
  return getStudentProfile(userId);
}

export async function POST(request: Request) {
  const session = await getAcademiaSession();
  if (
    !session ||
    (session.role !== 'student' && session.role !== 'instructor' && session.role !== 'admin')
  ) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const form = await request.formData();
    const file = form.get('avatar');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No se recibió imagen' }, { status: 400 });
    }

    const mime = (file.type || '').toLowerCase();
    if (!mime.startsWith('image/')) {
      return NextResponse.json({ error: 'Solo se permiten imágenes' }, { status: 400 });
    }

    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: 'La imagen no puede superar 4 MB' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!isImageBuffer(buffer, mime)) {
      return NextResponse.json({ error: 'Archivo de imagen no válido' }, { status: 400 });
    }

    const ext = (path.extname(file.name || '').toLowerCase() || '.jpg').replace(/[^a-z.]/g, '');
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? ext : '.jpg';

    const current = await getProfileForRole(session.userId, session.role);
    if (current?.avatarUrl) {
      await deleteStoredAvatarIfOwned(session.userId, current.avatarUrl);
    }

    const publicUrl = await uploadAcademiaAvatar(
      session.userId,
      buffer,
      mime || 'image/jpeg',
      safeExt,
    );
    await updateAcademiaUserAvatarUrl(publicUrl);

    const profile = await getProfileForRole(session.userId, session.role);
    return NextResponse.json({ ok: true, avatarUrl: publicUrl, profile });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || 'No se pudo subir la foto' },
      { status: 400 },
    );
  }
}

export async function DELETE() {
  const session = await getAcademiaSession();
  if (
    !session ||
    (session.role !== 'student' && session.role !== 'instructor' && session.role !== 'admin')
  ) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const current = await getProfileForRole(session.userId, session.role);
    if (current?.avatarUrl) {
      await deleteStoredAvatarIfOwned(session.userId, current.avatarUrl);
    }
    await updateAcademiaUserAvatarUrl(null);

    const profile = await getProfileForRole(session.userId, session.role);
    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || 'No se pudo eliminar la foto' },
      { status: 400 },
    );
  }
}

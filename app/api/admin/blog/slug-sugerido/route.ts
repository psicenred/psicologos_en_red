import { NextResponse } from 'next/server';
import { crearSlug, slugUnico } from '@/lib/blog/helpers';
import { databaseUnavailableJson, requireAdmin } from '@/lib/auth/api';
import { isDatabaseConfigured } from '@/lib/db';

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const base =
      crearSlug(searchParams.get('titulo') || searchParams.get('slug') || '') ||
      'articulo';
    const excludeIdRaw = searchParams.get('excludeId');
    const excludeId = excludeIdRaw ? parseInt(excludeIdRaw, 10) : null;
    const sugerido = await slugUnico(
      base,
      excludeId != null && !Number.isNaN(excludeId) ? excludeId : null,
    );
    return NextResponse.json({ slug: sugerido });
  } catch {
    return NextResponse.json(
      { error: 'No se pudo sugerir slug' },
      { status: 500 },
    );
  }
}

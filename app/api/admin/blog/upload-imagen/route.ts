import path from 'path';
import { NextResponse } from 'next/server';
import { databaseUnavailableJson, requireAdmin } from '@/lib/auth/api';
import { isDatabaseConfigured } from '@/lib/db';
import { STORAGE_BUCKETS, storageUpload } from '@/lib/storage';

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const form = await request.formData();
    const file = form.get('imagen');
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No se recibió archivo' },
        { status: 400 },
      );
    }

    const mime = (file.type || '').toLowerCase();
    if (!mime.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Solo se permiten imágenes' },
        { status: 400 },
      );
    }

    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Archivo demasiado grande (máx. 8 MB)' },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeOriginal = String(file.name || 'imagen').replace(
      /[^a-zA-Z0-9._-]/g,
      '_',
    );
    const ext = (path.extname(safeOriginal).toLowerCase() || '.jpg').replace(
      /[^a-z.]/g,
      '',
    );
    const nombre = `blog-${Date.now()}-${Math.floor(Math.random() * 10000)}${ext}`;

    const uploaded = await storageUpload(
      STORAGE_BUCKETS.blogImages,
      nombre,
      buffer,
      mime || 'image/jpeg',
    );

    const url =
      uploaded.publicUrl ||
      (uploaded.storedPath.startsWith('uploads/')
        ? '/' + uploaded.storedPath
        : `/uploads/blog/${nombre}`);

    return NextResponse.json({ url });
  } catch (e) {
    console.error('POST /api/admin/blog/upload-imagen:', e);
    return NextResponse.json(
      { error: 'No se pudo guardar la imagen' },
      { status: 500 },
    );
  }
}

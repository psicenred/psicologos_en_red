import { NextResponse } from 'next/server';
import { databaseUnavailableJson, requirePsicologoId } from '@/lib/auth/api';
import { isDatabaseConfigured, query } from '@/lib/db';
import { storageRead } from '@/lib/storage';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const auth = await requirePsicologoId(request);
  if (auth instanceof NextResponse) return auth;

  const { id: idParam } = await params;
  const id = parseInt(idParam, 10);
  if (Number.isNaN(id)) {
    return new NextResponse('ID inválido', { status: 400 });
  }

  try {
    const doc = await query(
      'SELECT ruta_archivo FROM documentos_psicologo WHERE id = $1 AND psicologo_id = $2',
      [id, auth.psicologoId],
    );
    const rutaArchivo = (
      doc.rows[0] as { ruta_archivo?: string } | undefined
    )?.ruta_archivo;
    if (!rutaArchivo) {
      return new NextResponse('Archivo no encontrado', { status: 404 });
    }

    const file = await storageRead(rutaArchivo);
    if (!file) {
      return new NextResponse('Archivo no encontrado', { status: 404 });
    }

    return new NextResponse(new Uint8Array(file.data), {
      headers: { 'Content-Type': file.contentType },
    });
  } catch (error) {
    console.error('GET /api/documentos/[id]/archivo:', error);
    return new NextResponse('Error', { status: 500 });
  }
}

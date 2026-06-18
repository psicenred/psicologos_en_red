import { NextResponse } from 'next/server';
import { databaseUnavailableJson, requireAuthUsuario } from '@/lib/auth/api';
import { isDatabaseConfigured, query } from '@/lib/db';
import { storageRead } from '@/lib/storage';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ mensajeId: string }> },
) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const auth = await requireAuthUsuario(request);
  if (auth instanceof NextResponse) return auth;

  const { mensajeId: mensajeIdParam } = await params;
  const mensajeId = parseInt(mensajeIdParam, 10);
  if (Number.isNaN(mensajeId)) {
    return new NextResponse('ID inválido', { status: 400 });
  }

  try {
    const r = await query(
      'SELECT ruta_adjunto, nombre_adjunto, remitente_id, destinatario_id FROM mensajes WHERE id = $1',
      [mensajeId],
    );
    const row = r.rows[0] as
      | {
          ruta_adjunto?: string;
          nombre_adjunto?: string;
          remitente_id: number;
          destinatario_id: number;
        }
      | undefined;

    if (!row?.ruta_adjunto) {
      return new NextResponse('Archivo no encontrado', { status: 404 });
    }

    const miId = auth.id;
    if (row.remitente_id !== miId && row.destinatario_id !== miId) {
      return new NextResponse('No autorizado', { status: 403 });
    }

    const file = await storageRead(row.ruta_adjunto);
    if (!file) {
      return new NextResponse('Archivo no encontrado', { status: 404 });
    }

    const filename = row.nombre_adjunto || 'documento.pdf';
    return new NextResponse(new Uint8Array(file.data), {
      headers: {
        'Content-Type': file.contentType,
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('GET /api/chat/archivo/[mensajeId]:', error);
    return new NextResponse('Error', { status: 500 });
  }
}

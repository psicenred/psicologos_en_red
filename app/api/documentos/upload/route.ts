import path from 'path';
import { NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { databaseUnavailableJson, requirePsicologoId } from '@/lib/auth/api';
import { isDatabaseConfigured, query } from '@/lib/db';
import {
  isDocxBuffer,
  isOleDocBuffer,
  isPdfBuffer,
} from '@/lib/security/file-validation';
import { STORAGE_BUCKETS, storageUpload } from '@/lib/storage';

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const auth = await requirePsicologoId(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const form = await request.formData();
    const file = form.get('archivo');
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No se recibió ningún archivo' },
        { status: 400 },
      );
    }

    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Archivo demasiado grande (máx. 15 MB)' },
        { status: 400 },
      );
    }

    const nombreOriginal = (file.name || 'archivo').replace(
      /[^a-zA-Z0-9._-]/g,
      '_',
    );
    const ext = path.extname(nombreOriginal).toLowerCase();
    if (!['.pdf', '.doc', '.docx'].includes(ext)) {
      return NextResponse.json(
        { error: 'Solo se permiten archivos PDF o Word (.doc, .docx)' },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (ext === '.pdf' && !isPdfBuffer(buffer)) {
      return NextResponse.json(
        { error: 'El archivo no es un PDF válido' },
        { status: 400 },
      );
    }
    if (ext === '.docx' && !isDocxBuffer(buffer)) {
      return NextResponse.json(
        { error: 'El archivo no es un DOCX válido' },
        { status: 400 },
      );
    }
    if (ext === '.doc' && !isOleDocBuffer(buffer)) {
      return NextResponse.json(
        { error: 'El archivo no es un DOC válido' },
        { status: 400 },
      );
    }

    const tipo = ext === '.pdf' ? 'pdf' : 'word';
    const nombreGuardado = Date.now() + '-' + nombreOriginal;
    const objectKey = `${auth.psicologoId}/${nombreGuardado}`;
    const contentType =
      ext === '.pdf'
        ? 'application/pdf'
        : ext === '.docx'
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : 'application/msword';

    const uploaded = await storageUpload(
      STORAGE_BUCKETS.psychologistDocs,
      objectKey,
      buffer,
      contentType,
    );

    let contenido = '';
    if (ext === '.docx' || ext === '.doc') {
      try {
        const result = await mammoth.extractRawText({ buffer });
        contenido = result.value || '';
      } catch {
        contenido = '';
      }
    }
    const titulo =
      (file.name || 'Documento').replace(/\.[^.]+$/, '') || 'Sin título';

    const maxOrden = await query(
      'SELECT COALESCE(MAX(orden), 0) + 1 AS next FROM documentos_psicologo WHERE psicologo_id = $1',
      [auth.psicologoId],
    );
    const orden = (maxOrden.rows[0] as { next: number }).next;

    const result = await query(
      `INSERT INTO documentos_psicologo (psicologo_id, titulo, contenido, tipo, ruta_archivo, orden)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        auth.psicologoId,
        titulo,
        contenido,
        tipo,
        uploaded.storedPath,
        orden,
      ],
    );
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('POST /api/documentos/upload:', error);
    return NextResponse.json(
      { error: 'Error al guardar el documento' },
      { status: 500 },
    );
  }
}

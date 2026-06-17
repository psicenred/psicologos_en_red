import { NextResponse } from 'next/server';
import {
  crearSlug,
  normalizarPalabrasClave,
  quitarEtiquetasHtml,
  slugUnico,
} from '@/lib/blog/helpers';
import {
  databaseUnavailableJson,
  parseJsonBody,
  requireAdmin,
} from '@/lib/auth/api';
import { isDatabaseConfigured, query } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id: idParam } = await params;
  const id = parseInt(idParam, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  try {
    const result = await query(
      `SELECT id, titulo, slug, autor, tiempo_lectura, meta_title, meta_description,
              palabras_clave, contenido_html, extracto, portada_url, publicado, fecha_publicacion
       FROM blog_articulos WHERE id = $1`,
      [id],
    );
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Artículo no encontrado' },
        { status: 404 },
      );
    }
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('GET /api/admin/blog/[id]:', error);
    return NextResponse.json(
      { error: 'Error al obtener el artículo' },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id: idParam } = await params;
  const id = parseInt(idParam, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  try {
    const body = await parseJsonBody<Record<string, unknown>>(request);
    const titulo = String(body.titulo || '').trim();
    const slugInput = crearSlug(body.slug || titulo);
    const autor = String(body.autor || 'Equipo Psicólogos en Red')
      .trim()
      .slice(0, 140);
    const tiempoLectura = Math.max(
      1,
      parseInt(String(body.tiempo_lectura), 10) || 5,
    );
    const metaTitle = String(body.meta_title || '').trim() || null;
    const metaDescription =
      String(body.meta_description || '').trim() || null;
    const contenidoHtml = String(body.contenido_html || '').trim();
    const extractoEntrada = String(body.extracto || '').trim();
    const portadaUrl = String(body.portada_url || '').trim() || null;
    const publicado =
      body.publicado !== false && body.publicado !== 'false';
    const fechaPublicacion = body.fecha_publicacion
      ? new Date(String(body.fecha_publicacion))
      : new Date();
    const palabrasClave = normalizarPalabrasClave(body.palabras_clave);

    if (!titulo) {
      return NextResponse.json(
        { error: 'El título es obligatorio' },
        { status: 400 },
      );
    }
    if (!slugInput) {
      return NextResponse.json(
        { error: 'El slug es obligatorio' },
        { status: 400 },
      );
    }
    if (!contenidoHtml) {
      return NextResponse.json(
        { error: 'El contenido es obligatorio' },
        { status: 400 },
      );
    }
    if (Number.isNaN(fechaPublicacion.getTime())) {
      return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 });
    }

    const slug = await slugUnico(slugInput, id);
    const textoPlano = quitarEtiquetasHtml(contenidoHtml);
    const extracto = extractoEntrada || textoPlano.slice(0, 220);

    const result = await query(
      `UPDATE blog_articulos
       SET titulo = $1, slug = $2, autor = $3, tiempo_lectura = $4,
           meta_title = $5, meta_description = $6, palabras_clave = $7,
           contenido_html = $8, extracto = $9, portada_url = $10,
           publicado = $11, fecha_publicacion = $12, updated_at = NOW()
       WHERE id = $13
       RETURNING id, titulo, slug, autor, tiempo_lectura, meta_title, meta_description, palabras_clave, extracto, portada_url, publicado, fecha_publicacion`,
      [
        titulo,
        slug,
        autor || 'Equipo Psicólogos en Red',
        tiempoLectura,
        metaTitle,
        metaDescription,
        palabrasClave,
        contenidoHtml,
        extracto,
        portadaUrl,
        publicado,
        fechaPublicacion,
        id,
      ],
    );
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Artículo no encontrado' },
        { status: 404 },
      );
    }
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('PUT /api/admin/blog/[id]:', error);
    return NextResponse.json(
      { error: 'Error al actualizar artículo' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id: idParam } = await params;
  const id = parseInt(idParam, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  try {
    const result = await query(
      'DELETE FROM blog_articulos WHERE id = $1 RETURNING id',
      [id],
    );
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Artículo no encontrado' },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('DELETE /api/admin/blog/[id]:', error);
    return NextResponse.json(
      { error: 'Error al eliminar artículo' },
      { status: 500 },
    );
  }
}

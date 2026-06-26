import { NextResponse } from 'next/server';
import { listAdminBlogArticles } from '@/lib/admin/queries';
import { sanitizeBlogHtml } from '@/lib/blog/sanitize-html';
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

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const rows = await listAdminBlogArticles();
    return NextResponse.json(rows);
  } catch (error) {
    console.error('GET /api/admin/blog:', error);
    const message =
      error instanceof Error ? error.message : 'Error al obtener artículos del blog';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

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
    const contenidoHtml = sanitizeBlogHtml(String(body.contenido_html || '').trim());
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

    const slug = await slugUnico(slugInput, null);
    const textoPlano = quitarEtiquetasHtml(contenidoHtml);
    const extracto = extractoEntrada || textoPlano.slice(0, 220);

    const result = await query(
      `INSERT INTO blog_articulos (titulo, slug, autor, tiempo_lectura, meta_title, meta_description, palabras_clave, contenido_html, extracto, portada_url, publicado, fecha_publicacion, creado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
        auth.id,
      ],
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/blog:', error);
    return NextResponse.json(
      { error: 'Error al crear artículo' },
      { status: 500 },
    );
  }
}

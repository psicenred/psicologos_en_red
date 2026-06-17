import { NextResponse } from 'next/server';
import { databaseUnavailableJson } from '@/lib/auth/api';
import { isDatabaseConfigured, query } from '@/lib/db';

export async function GET() {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();

  try {
    const result = await query(`
      SELECT id, titulo, slug, autor, tiempo_lectura, meta_title, meta_description,
             palabras_clave, contenido_html, extracto, portada_url, fecha_publicacion
      FROM blog_articulos
      WHERE publicado = true
      ORDER BY fecha_publicacion DESC, id DESC
    `);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('GET /api/blog-articulos:', error);
    return NextResponse.json(
      { error: 'Error al obtener artículos' },
      { status: 500 },
    );
  }
}

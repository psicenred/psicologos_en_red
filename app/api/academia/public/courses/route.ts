import { NextResponse } from 'next/server';
import { listPublishedCoursesForCatalog } from '@/lib/academia/catalog';

export async function GET() {
  try {
    const courses = await listPublishedCoursesForCatalog();
    return NextResponse.json({ courses });
  } catch (error) {
    console.error('GET /api/academia/public/courses:', error);
    return NextResponse.json({ error: 'Error al cargar cursos' }, { status: 500 });
  }
}

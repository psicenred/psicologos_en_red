import { NextResponse } from 'next/server';
import { databaseUnavailableJson } from '@/lib/auth/api';
import { isDatabaseConfigured, query } from '@/lib/db';

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();

  const { searchParams } = new URL(request.url);
  const inMexico = searchParams.get('inMexico');

  try {
    let sql = 'SELECT * FROM psicologos';
    if (inMexico === 'true') {
      sql += ' WHERE COALESCE(visible_mexico, true) = true';
    } else if (inMexico === 'false') {
      sql += ' WHERE COALESCE(visible_internacional, false) = true';
    } else {
      sql +=
        ' WHERE (COALESCE(visible_mexico, true) = true OR COALESCE(visible_internacional, false) = true)';
    }

    const result = await query(sql);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('GET /api/psicologos:', error);
    return NextResponse.json(
      { error: 'Error al obtener catálogo' },
      { status: 500 },
    );
  }
}

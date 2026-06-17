import { NextResponse } from 'next/server';
import { databaseUnavailableJson } from '@/lib/auth/api';
import { isDatabaseConfigured, query } from '@/lib/db';

function buildCatalogSql(inMexico: string | null, withVisibility: boolean): string {
  let sql = 'SELECT * FROM psicologos';
  if (!withVisibility) {
    return sql + ' ORDER BY nombre';
  }
  if (inMexico === 'true') {
    sql += ' WHERE COALESCE(visible_mexico, true) = true';
  } else if (inMexico === 'false') {
    sql += ' WHERE COALESCE(visible_internacional, false) = true';
  } else {
    sql +=
      ' WHERE (COALESCE(visible_mexico, true) = true OR COALESCE(visible_internacional, false) = true)';
  }
  return sql + ' ORDER BY nombre';
}

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();

  const { searchParams } = new URL(request.url);
  const inMexico = searchParams.get('inMexico');

  try {
    try {
      const result = await query(buildCatalogSql(inMexico, true));
      return NextResponse.json(result.rows);
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== '42703') throw error;
      const result = await query(buildCatalogSql(inMexico, false));
      return NextResponse.json(result.rows);
    }
  } catch (error) {
    console.error('GET /api/psicologos:', error);
    return NextResponse.json(
      { error: 'Error al obtener catálogo' },
      { status: 500 },
    );
  }
}

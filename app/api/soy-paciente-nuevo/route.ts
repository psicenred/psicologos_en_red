import { NextResponse } from 'next/server';
import { databaseUnavailableJson, requireAuthUsuario } from '@/lib/auth/api';
import { isDatabaseConfigured, query } from '@/lib/db';

export async function GET() {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();

  const auth = await requireAuthUsuario();
  if (auth instanceof NextResponse) return auth;

  if (auth.rol !== 'paciente') {
    return NextResponse.json({ nuevo: false });
  }

  try {
    const r = await query(
      'SELECT 1 FROM citas WHERE paciente_id = $1 LIMIT 1',
      [auth.id],
    );
    return NextResponse.json({ nuevo: r.rows.length === 0 });
  } catch (err) {
    console.error('Error soy-paciente-nuevo:', err);
    return NextResponse.json({ nuevo: false });
  }
}

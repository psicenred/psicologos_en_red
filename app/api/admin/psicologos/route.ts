import { NextResponse } from 'next/server';
import { listAdminPsicologos } from '@/lib/admin/queries';
import { databaseUnavailableJson, requireAdmin } from '@/lib/auth/api';
import { isDatabaseConfigured } from '@/lib/db';

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const rows = await listAdminPsicologos();
    return NextResponse.json(rows);
  } catch (error) {
    console.error('GET /api/admin/psicologos:', error);
    return NextResponse.json(
      { error: 'Error al obtener psicólogos' },
      { status: 500 },
    );
  }
}

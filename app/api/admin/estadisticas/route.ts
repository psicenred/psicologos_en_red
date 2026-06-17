import { NextResponse } from 'next/server';
import { databaseUnavailableJson, requireAdmin } from '@/lib/auth/api';
import { isDatabaseConfigured, query } from '@/lib/db';

function toObj(rows: { estado: string; total: string }[]) {
  const obj: Record<string, number> = {
    pendiente: 0,
    confirmada: 0,
    realizada: 0,
    cancelada: 0,
    'no realizada': 0,
    total: 0,
  };
  rows.forEach((r) => {
    obj[r.estado] = parseInt(r.total, 10) || 0;
    obj.total += parseInt(r.total, 10) || 0;
  });
  return obj;
}

export async function GET() {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const usuarios = await query(
      `SELECT rol, COUNT(*) as total FROM usuarios GROUP BY rol`,
    );
    const citasHoy = await query(`
      SELECT COALESCE(estado, 'pendiente') as estado, COUNT(*) as total
      FROM citas WHERE fecha = CURRENT_DATE GROUP BY estado
    `);
    const citasSemana = await query(`
      SELECT COALESCE(estado, 'pendiente') as estado, COUNT(*) as total
      FROM citas WHERE fecha >= CURRENT_DATE - INTERVAL '7 days' GROUP BY estado
    `);
    const citasMes = await query(`
      SELECT COALESCE(estado, 'pendiente') as estado, COUNT(*) as total
      FROM citas WHERE fecha >= DATE_TRUNC('month', CURRENT_DATE) GROUP BY estado
    `);
    const citasTotal = await query(`
      SELECT COALESCE(estado, 'pendiente') as estado, COUNT(*) as total
      FROM citas GROUP BY estado
    `);

    return NextResponse.json({
      usuarios: usuarios.rows,
      hoy: toObj(citasHoy.rows as { estado: string; total: string }[]),
      semana: toObj(citasSemana.rows as { estado: string; total: string }[]),
      mes: toObj(citasMes.rows as { estado: string; total: string }[]),
      historico: toObj(citasTotal.rows as { estado: string; total: string }[]),
    });
  } catch (error) {
    console.error('GET /api/admin/estadisticas:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas' },
      { status: 500 },
    );
  }
}

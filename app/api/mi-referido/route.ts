import { NextResponse } from 'next/server';
import { databaseUnavailableJson, requireAuthUsuario } from '@/lib/auth/api';
import { isDatabaseConfigured } from '@/lib/db';
import { getReferralDashboardStats } from '@/lib/referral/service';

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();

  const auth = await requireAuthUsuario(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const stats = await getReferralDashboardStats(auth.id);
    if (!stats) {
      return NextResponse.json(
        {
          disponible: false,
          mensaje:
            'Programa de referidos no disponible. Ejecuta la migración add_programa_referidos.sql.',
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      disponible: true,
      codigo_referido: stats.codigoReferido,
      total_referidos: stats.totalReferidos,
      referidos_con_cita: stats.referidosConCita,
      descuento_referidor_pendiente: stats.descuentoReferidorPendiente,
    });
  } catch (error) {
    console.error('GET /api/mi-referido:', error);
    return NextResponse.json(
      { error: 'Error al obtener datos de referidos' },
      { status: 500 },
    );
  }
}

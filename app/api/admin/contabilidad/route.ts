import { NextResponse } from 'next/server';
import {
  buildContabilidadReport,
  type ContabilidadPeriodo,
} from '@/lib/admin/contabilidad';
import { databaseUnavailableJson, requireAdmin } from '@/lib/auth/api';
import { isDatabaseConfigured } from '@/lib/db';

function parsePeriodo(value: string | null): ContabilidadPeriodo | undefined {
  if (value === 'quincena' || value === 'mes' || value === 'historico') return value;
  return undefined;
}

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const psicologoIdRaw = searchParams.get('psicologo_id');
  const psicologoId = psicologoIdRaw ? parseInt(psicologoIdRaw, 10) : undefined;

  try {
    const report = await buildContabilidadReport({
      periodo: parsePeriodo(searchParams.get('periodo')),
      fechaCitaDesde: searchParams.get('fecha_cita_desde') || undefined,
      fechaCitaHasta: searchParams.get('fecha_cita_hasta') || undefined,
      fechaPagoDesde: searchParams.get('fecha_pago_desde') || undefined,
      fechaPagoHasta: searchParams.get('fecha_pago_hasta') || undefined,
      psicologoId: Number.isFinite(psicologoId) ? psicologoId : undefined,
      incluirPrueba: searchParams.get('incluir_prueba') === 'true',
    });
    return NextResponse.json(report);
  } catch (error) {
    console.error('GET /api/admin/contabilidad:', error);
    return NextResponse.json(
      { error: 'Error al obtener contabilidad' },
      { status: 500 },
    );
  }
}

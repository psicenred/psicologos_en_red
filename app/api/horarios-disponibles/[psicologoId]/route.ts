import { NextResponse } from 'next/server';
import { databaseUnavailableJson } from '@/lib/auth/api';
import { getHorariosDisponibles } from '@/lib/citas/availability';
import { isDatabaseConfigured } from '@/lib/db';

type Params = { params: Promise<{ psicologoId: string }> };

export async function GET(request: Request, { params }: Params) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();

  const { psicologoId: raw } = await params;
  const psicologoId = parseInt(raw, 10);
  const { searchParams } = new URL(request.url);
  const fecha = searchParams.get('fecha');

  if (!fecha || Number.isNaN(psicologoId)) {
    return NextResponse.json(
      { error: 'Fecha y psicólogo son requeridos' },
      { status: 400 },
    );
  }

  try {
    const data = await getHorariosDisponibles(psicologoId, fecha);
    return NextResponse.json(data);
  } catch (error) {
    console.error('GET horarios-disponibles:', error);
    return NextResponse.json(
      { error: 'Error al obtener horarios' },
      { status: 500 },
    );
  }
}

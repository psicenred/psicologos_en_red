import { NextResponse } from 'next/server';
import { databaseUnavailableJson } from '@/lib/auth/api';
import { getDisponibilidadCalendario } from '@/lib/citas/availability';
import { isDatabaseConfigured } from '@/lib/db';

type Params = { params: Promise<{ psicologoId: string }> };

export async function GET(_request: Request, { params }: Params) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();

  const { psicologoId: raw } = await params;
  const psicologoId = parseInt(raw, 10);
  if (Number.isNaN(psicologoId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  try {
    const data = await getDisponibilidadCalendario(psicologoId);
    return NextResponse.json(data);
  } catch (error) {
    console.error('GET disponibilidad-calendario:', error);
    return NextResponse.json(
      { error: 'Error al obtener disponibilidad' },
      { status: 500 },
    );
  }
}

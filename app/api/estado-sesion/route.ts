import { NextResponse } from 'next/server';
import { getAuthUsuario } from '@/lib/auth/api';
import { isDatabaseConfigured, query } from '@/lib/db';

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ autenticado: false });
  }
  const usuario = await getAuthUsuario();
  if (!usuario) {
    return NextResponse.json({ autenticado: false });
  }
  try {
    const result = await query('SELECT nombre FROM usuarios WHERE id = $1', [
      usuario.id,
    ]);
    const nombreActualizado =
      (result.rows[0] as { nombre?: string } | undefined)?.nombre ??
      usuario.nombre;
    return NextResponse.json({
      autenticado: true,
      nombre: nombreActualizado,
      rol: usuario.rol,
    });
  } catch {
    return NextResponse.json({
      autenticado: true,
      nombre: usuario.nombre,
      rol: usuario.rol,
    });
  }
}

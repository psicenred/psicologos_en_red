import { getAuthUsuario } from '@/lib/auth/api';
import { isDatabaseConfigured, query } from '@/lib/db';

export type PublicSessionState = {
  autenticado: boolean;
  nombre?: string;
  rol?: string;
};

export async function getPublicSessionState(): Promise<PublicSessionState> {
  if (!isDatabaseConfigured()) {
    return { autenticado: false };
  }

  const usuario = await getAuthUsuario();
  if (!usuario) {
    return { autenticado: false };
  }

  try {
    const result = await query('SELECT nombre FROM usuarios WHERE id = $1', [usuario.id]);
    const nombre =
      (result.rows[0] as { nombre?: string } | undefined)?.nombre ?? usuario.nombre;
    return { autenticado: true, nombre, rol: usuario.rol };
  } catch {
    return { autenticado: true, nombre: usuario.nombre, rol: usuario.rol };
  }
}

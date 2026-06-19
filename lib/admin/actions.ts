'use server';

import {
  saveAdminVideoBoton15Min,
  updateAdminPsicologoVisibilidad,
} from '@/lib/admin/queries';
import { updateSessionNombre } from '@/lib/session';
import { updateUsuarioProfile } from '@/lib/auth/service';
import { requireAdminSession, requireSessionUsuario } from '@/lib/auth/server-session';
import { isDatabaseConfigured } from '@/lib/db';

export type AdminActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function updatePsicologoVisibilidadAction(
  id: number,
  visibleMexico: boolean,
  visibleInternacional: boolean,
): Promise<
  AdminActionResult<{
    id: number;
    visible_mexico: boolean;
    visible_internacional: boolean;
  }>
> {
  try {
    if (!isDatabaseConfigured()) {
      return { ok: false, error: 'Base de datos no configurada' };
    }

    const admin = await requireAdminSession();
    if (!admin) return { ok: false, error: 'No autorizado' };

    if (!Number.isFinite(id) || id <= 0) {
      return { ok: false, error: 'ID inválido' };
    }

    const row = await updateAdminPsicologoVisibilidad(
      id,
      visibleMexico,
      visibleInternacional,
    );
    if (!row) return { ok: false, error: 'Psicólogo no encontrado' };

    return {
      ok: true,
      data: {
        id: Number(row.id),
        visible_mexico: Boolean(row.visible_mexico),
        visible_internacional: Boolean(row.visible_internacional),
      },
    };
  } catch (error) {
    console.error('updatePsicologoVisibilidadAction:', error);
    return { ok: false, error: 'Error al actualizar visibilidad' };
  }
}

export async function saveAdminVideoConfigAction(
  videoBoton15min: boolean,
): Promise<AdminActionResult<{ video_boton_15min: boolean }>> {
  try {
    if (!isDatabaseConfigured()) {
      return { ok: false, error: 'Base de datos no configurada' };
    }

    const admin = await requireAdminSession();
    if (!admin) return { ok: false, error: 'No autorizado' };

    const data = await saveAdminVideoBoton15Min(videoBoton15min);
    return { ok: true, data: { video_boton_15min: Boolean(data.video_boton_15min) } };
  } catch (error) {
    console.error('saveAdminVideoConfigAction:', error);
    return { ok: false, error: 'Error al guardar la configuración' };
  }
}

export async function updateAdminProfileAction(input: {
  nombre: string;
  telefono?: string;
  password?: string;
}): Promise<AdminActionResult<{ success: true }>> {
  try {
    if (!isDatabaseConfigured()) {
      return { ok: false, error: 'Base de datos no configurada' };
    }

    const usuario = await requireSessionUsuario();
    if (!usuario) return { ok: false, error: 'No autorizado' };

    const result = await updateUsuarioProfile(usuario.id, usuario.nombre, {
      nombre: input.nombre,
      telefono: input.telefono,
      password: input.password,
    });

    if (!result.ok) return { ok: false, error: result.error };

    await updateSessionNombre(input.nombre.trim() || usuario.nombre);
    return { ok: true, data: { success: true } };
  } catch (error) {
    console.error('updateAdminProfileAction:', error);
    return { ok: false, error: 'Error al actualizar el perfil' };
  }
}

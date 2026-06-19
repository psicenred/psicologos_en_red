'use server';

import {
  saveAdminVideoBoton15Min,
  updateAdminPsicologoVisibilidad,
} from '@/lib/admin/queries';
import { verifyAdminMutationInDb } from '@/lib/admin/verify-mutation';
import { updateSessionNombre } from '@/lib/session';
import { updateUsuarioProfile } from '@/lib/auth/service';
import { isDatabaseConfigured, query } from '@/lib/db';

export type AdminActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const SESSION_EXPIRED_MSG = 'Sesión expirada. Recarga la página e intenta de nuevo.';

async function requireAdminMutation(
  mutationToken: string,
): Promise<number | AdminActionResult<never>> {
  const adminUserId = await verifyAdminMutationInDb(mutationToken);
  if (!adminUserId) {
    return { ok: false, error: SESSION_EXPIRED_MSG };
  }
  return adminUserId;
}

export async function updatePsicologoVisibilidadAction(input: {
  mutationToken: string;
  id: number;
  visibleMexico: boolean;
  visibleInternacional: boolean;
}): Promise<
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

    const token = input.mutationToken?.trim();
    if (!token) {
      return { ok: false, error: SESSION_EXPIRED_MSG };
    }

    const admin = await requireAdminMutation(token);
    if (typeof admin !== 'number') return admin;

    const id = input.id;
    if (!Number.isFinite(id) || id <= 0) {
      return { ok: false, error: 'ID inválido' };
    }

    const row = await updateAdminPsicologoVisibilidad(
      id,
      input.visibleMexico === true,
      input.visibleInternacional === true,
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
    if (error instanceof Error && error.message === 'missing_visibility_columns') {
      return {
        ok: false,
        error:
          'Faltan las columnas visible_mexico/visible_internacional en la base de datos.',
      };
    }
    console.error('updatePsicologoVisibilidadAction:', error);
    return { ok: false, error: 'Error al actualizar visibilidad' };
  }
}

export async function saveAdminVideoConfigAction(input: {
  mutationToken: string;
  videoBoton15min: boolean;
}): Promise<AdminActionResult<{ video_boton_15min: boolean }>> {
  try {
    if (!isDatabaseConfigured()) {
      return { ok: false, error: 'Base de datos no configurada' };
    }

    const token = input.mutationToken?.trim();
    if (!token) {
      return { ok: false, error: SESSION_EXPIRED_MSG };
    }

    const admin = await requireAdminMutation(token);
    if (typeof admin !== 'number') return admin;

    const videoBoton15min = input.videoBoton15min === true;
    const data = await saveAdminVideoBoton15Min(videoBoton15min);
    return { ok: true, data: { video_boton_15min: Boolean(data.video_boton_15min) } };
  } catch (error) {
    if (error instanceof Error && error.message === 'missing_config_plataforma_table') {
      return {
        ok: false,
        error: 'Falta la tabla config_plataforma. Ejecuta la migración SQL correspondiente.',
      };
    }
    console.error('saveAdminVideoConfigAction:', error);
    return { ok: false, error: 'Error al guardar la configuración' };
  }
}

export async function updateAdminProfileAction(input: {
  mutationToken: string;
  nombre: string;
  telefono?: string;
  password?: string;
}): Promise<AdminActionResult<{ success: true }>> {
  try {
    if (!isDatabaseConfigured()) {
      return { ok: false, error: 'Base de datos no configurada' };
    }

    const token = input.mutationToken?.trim();
    if (!token) {
      return { ok: false, error: SESSION_EXPIRED_MSG };
    }

    const adminUserId = await verifyAdminMutationInDb(token);
    if (!adminUserId) {
      return { ok: false, error: SESSION_EXPIRED_MSG };
    }

    const userRow = await query('SELECT nombre FROM usuarios WHERE id = $1', [adminUserId]);
    const currentNombre =
      (userRow.rows[0] as { nombre?: string } | undefined)?.nombre ?? input.nombre;

    const result = await updateUsuarioProfile(adminUserId, currentNombre, {
      nombre: input.nombre,
      telefono: input.telefono,
      password: input.password,
    });

    if (!result.ok) return { ok: false, error: result.error };

    try {
      await updateSessionNombre(input.nombre.trim() || currentNombre);
    } catch {
      // La cookie puede no estar disponible en POST; el perfil ya quedó guardado.
    }
    return { ok: true, data: { success: true } };
  } catch (error) {
    console.error('updateAdminProfileAction:', error);
    return { ok: false, error: 'Error al actualizar el perfil' };
  }
}

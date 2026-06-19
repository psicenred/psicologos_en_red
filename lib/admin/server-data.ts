import 'server-only';

import { redirect } from 'next/navigation';
import { normalizeRol } from '@/lib/auth/api';
import {
  loadAdminEstadisticas,
  listAdminBlogArticles,
  listAdminCartera,
  listAdminCitas,
  listAdminPacientes,
  listAdminPsicologos,
  loadAdminPlatformConfig,
  loadUsuarioTelefono,
} from '@/lib/admin/queries';
import type { AdminPanelInitialData } from '@/lib/admin/types';
import { createAdminMutationToken } from '@/lib/admin/mutation-token';
import { isDatabaseConfigured } from '@/lib/db';
import { getSession } from '@/lib/session';

export type { AdminPanelInitialData };

export async function loadAdminPanelData(): Promise<AdminPanelInitialData | null> {
  if (!isDatabaseConfigured()) return null;

  const session = await getSession();
  if (!session.usuario || normalizeRol(session.usuario.rol) !== 'admin') {
    redirect('/login?next=/panel-admin');
  }

  const [stats, citas, cartera, psicologos, pacientes, blog, platformConfig, telefono] =
    await Promise.all([
    loadAdminEstadisticas(),
    listAdminCitas(),
    listAdminCartera(),
    listAdminPsicologos(),
    listAdminPacientes(),
    listAdminBlogArticles(),
    loadAdminPlatformConfig(),
    loadUsuarioTelefono(session.usuario.id),
  ]);

  return {
    stats,
    citas: citas as Record<string, unknown>[],
    cartera,
    psicologos: psicologos as Record<string, unknown>[],
    pacientes: pacientes as Record<string, unknown>[],
    blog: blog as Record<string, unknown>[],
    config: {
      video_boton_15min: platformConfig.video_boton_15min,
      profile: {
        nombre: session.usuario.nombre,
        email: session.usuario.email,
        telefono,
      },
    },
    mutationToken: createAdminMutationToken(session.usuario.id),
  };
}

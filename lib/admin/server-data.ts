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
} from '@/lib/admin/queries';
import type { AdminPanelInitialData } from '@/lib/admin/types';
import { isDatabaseConfigured } from '@/lib/db';
import { getSession } from '@/lib/session';

export type { AdminPanelInitialData };

export async function loadAdminPanelData(): Promise<AdminPanelInitialData | null> {
  if (!isDatabaseConfigured()) return null;

  const session = await getSession();
  if (!session.usuario || normalizeRol(session.usuario.rol) !== 'admin') {
    redirect('/login?next=/panel-admin');
  }

  const [stats, citas, cartera, psicologos, pacientes, blog] = await Promise.all([
    loadAdminEstadisticas(),
    listAdminCitas(),
    listAdminCartera(),
    listAdminPsicologos(),
    listAdminPacientes(),
    listAdminBlogArticles(),
  ]);

  return {
    stats,
    citas: citas as Record<string, unknown>[],
    cartera,
    psicologos: psicologos as Record<string, unknown>[],
    pacientes: pacientes as Record<string, unknown>[],
    blog: blog as Record<string, unknown>[],
  };
}

import type { AdminCarteraItem, AdminEstadisticas } from '@/lib/admin/queries';

export type AdminPanelInitialData = {
  stats: AdminEstadisticas;
  citas: Record<string, unknown>[];
  cartera: AdminCarteraItem[];
  psicologos: Record<string, unknown>[];
  pacientes: Record<string, unknown>[];
  blog: Record<string, unknown>[];
};

import type { AdminCarteraItem, AdminEstadisticas } from '@/lib/admin/queries';

export type AdminConfigInitialData = {
  video_boton_15min: boolean;
  profile: {
    nombre: string;
    email: string;
    telefono: string;
  };
};

export type AdminPanelInitialData = {
  stats: AdminEstadisticas;
  citas: Record<string, unknown>[];
  cartera: AdminCarteraItem[];
  psicologos: Record<string, unknown>[];
  pacientes: Record<string, unknown>[];
  blog: Record<string, unknown>[];
  config: AdminConfigInitialData;
  /** Token firmado para mutaciones admin sin depender de cookie en POST. */
  mutationToken: string;
};

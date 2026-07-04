export type ContabilidadPeriodo = 'quincena' | 'mes' | 'historico';

export type ContabilidadRowRaw = {
  id: number;
  fecha: string;
  hora: string;
  paciente_id: number;
  psicologo_id: number;
  paciente_nombre: string;
  psicologo_nombre: string;
  servicio_interes: string | null;
  monto_final: number | null;
  monto_original: number | null;
  es_prueba: boolean;
  fecha_pago: string | null;
  precio_terapia_individual: number | null;
  precio_terapia_pareja: number | null;
  precio_asesoria_crianza: number | null;
  precio_terapia_individual_usd: number | null;
  precio_terapia_pareja_usd: number | null;
  precio_asesoria_crianza_usd: number | null;
  visible_internacional: boolean;
};

export type ContabilidadCalculo = {
  costo_sesion: number;
  costo_fuente: 'monto_final' | 'monto_original' | 'tarifa_mxn' | 'tarifa_usd';
  numero_cita_paciente: number;
  pct_comision: number;
  base_sin_iva: number;
  comision_bruta: number;
  isr_retenido: number;
  comision_neta: number;
  iva_reservado: number;
  stripe_fee: number;
  ganancia_plataforma: number;
};

export type ContabilidadLinea = ContabilidadRowRaw & ContabilidadCalculo;

export type ContabilidadFiltros = {
  periodo?: ContabilidadPeriodo;
  fechaCitaDesde?: string;
  fechaCitaHasta?: string;
  fechaPagoDesde?: string;
  fechaPagoHasta?: string;
  psicologoId?: number;
  incluirPrueba?: boolean;
};

export type ContabilidadResumenPsicologo = {
  psicologo_id: number;
  psicologo_nombre: string;
  citas: number;
  costo_total: number;
  comision_neta_total: number;
  iva_reservado_total: number;
  stripe_fee_total: number;
  ganancia_plataforma_total: number;
};

export type ContabilidadTotales = {
  citas: number;
  costo_total: number;
  comision_neta_total: number;
  comision_bruta_total: number;
  isr_total: number;
  iva_reservado_total: number;
  stripe_fee_total: number;
  ganancia_plataforma_total: number;
};

export type ContabilidadResponse = {
  lineas: ContabilidadLinea[];
  por_psicologo: ContabilidadResumenPsicologo[];
  totales: ContabilidadTotales;
  periodo: ContabilidadPeriodo;
};

export function formatMxn(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPct(rate: number): string {
  return `${Math.round(rate * 1000) / 10}%`;
}

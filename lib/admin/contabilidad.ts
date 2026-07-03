import { isUndefinedColumn } from '@/lib/admin/db-errors';
import {
  sessionPriceForService,
  type PsicologoPricing,
} from '@/lib/catalog-pricing';
import { query } from '@/lib/db';

export const USD_TO_MXN = 17.5;
export const IVA_DIVISOR = 1.16;
export const ISR_RATE = 0.011;
export const STRIPE_FEE_RATE = 0.05;
export const TRAMO_LIMITE = 10;
export const PCT_TRAMO_BAJO = 0.65;
export const PCT_TRAMO_ALTO = 0.7;

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

const CONTABILIDAD_SQL = `
  SELECT c.id,
         TO_CHAR(c.fecha, 'YYYY-MM-DD') AS fecha,
         c.hora::text AS hora,
         c.paciente_id,
         c.psicologo_id,
         pac.nombre AS paciente_nombre,
         psi.nombre AS psicologo_nombre,
         c.servicio_interes,
         c.monto_final,
         c.monto_original,
         COALESCE(c.contabilidad_es_prueba, false) AS es_prueba,
         c.fecha_pago::text AS fecha_pago,
         psi.precio_terapia_individual,
         psi.precio_terapia_pareja,
         psi.precio_asesoria_crianza,
         psi.precio_terapia_individual_usd,
         psi.precio_terapia_pareja_usd,
         psi.precio_asesoria_crianza_usd,
         COALESCE(psi.visible_internacional, false) AS visible_internacional
  FROM citas c
  JOIN usuarios pac ON c.paciente_id = pac.id
  JOIN psicologos psi ON c.psicologo_id = psi.id
  WHERE LOWER(TRIM(c.estado)) = 'realizada'
  ORDER BY c.fecha ASC, c.hora ASC NULLS LAST, c.id ASC
`;

const CONTABILIDAD_SQL_LEGACY = `
  SELECT c.id,
         TO_CHAR(c.fecha, 'YYYY-MM-DD') AS fecha,
         c.hora::text AS hora,
         c.paciente_id,
         c.psicologo_id,
         pac.nombre AS paciente_nombre,
         psi.nombre AS psicologo_nombre,
         c.servicio_interes,
         c.monto_final,
         c.monto_original,
         false AS es_prueba,
         c.creado_en::text AS fecha_pago,
         psi.precio_terapia_individual,
         psi.precio_terapia_pareja,
         psi.precio_asesoria_crianza,
         psi.precio_terapia_individual_usd,
         psi.precio_terapia_pareja_usd,
         psi.precio_asesoria_crianza_usd,
         COALESCE(psi.visible_internacional, false) AS visible_internacional
  FROM citas c
  JOIN usuarios pac ON c.paciente_id = pac.id
  JOIN psicologos psi ON c.psicologo_id = psi.id
  WHERE LOWER(TRIM(c.estado)) = 'realizada'
  ORDER BY c.fecha ASC, c.hora ASC NULLS LAST, c.id ASC
`;

function pricingFromRow(row: ContabilidadRowRaw): PsicologoPricing {
  return {
    precio_terapia_individual: row.precio_terapia_individual,
    precio_terapia_individual_usd: row.precio_terapia_individual_usd,
    precio_terapia_pareja: row.precio_terapia_pareja,
    precio_terapia_pareja_usd: row.precio_terapia_pareja_usd,
    precio_asesoria_crianza: row.precio_asesoria_crianza,
    precio_asesoria_crianza_usd: row.precio_asesoria_crianza_usd,
  };
}

export function resolveCostoSesion(row: ContabilidadRowRaw): {
  costo: number;
  fuente: ContabilidadCalculo['costo_fuente'];
} {
  const montoFinal =
    row.monto_final != null && Number.isFinite(Number(row.monto_final))
      ? Number(row.monto_final) / 100
      : null;
  const montoOriginal =
    row.monto_original != null && Number.isFinite(Number(row.monto_original))
      ? Number(row.monto_original) / 100
      : null;

  if (montoFinal != null && montoFinal > 0) {
    return { costo: round2(montoFinal), fuente: 'monto_final' };
  }
  if (montoOriginal != null && montoOriginal > 0) {
    return { costo: round2(montoOriginal), fuente: 'monto_original' };
  }

  const pricing = pricingFromRow(row);
  const servicio = row.servicio_interes || '';
  const mxn = sessionPriceForService(pricing, servicio, 'MXN');
  if (mxn != null && mxn > 0) {
    return { costo: round2(mxn), fuente: 'tarifa_mxn' };
  }

  const usd = sessionPriceForService(pricing, servicio, 'USD');
  if (usd != null && usd > 0) {
    return { costo: round2(usd * USD_TO_MXN), fuente: 'tarifa_usd' };
  }

  if (row.visible_internacional) {
    const usdFallback = sessionPriceForService(pricing, 'individual', 'USD');
    if (usdFallback != null && usdFallback > 0) {
      return { costo: round2(usdFallback * USD_TO_MXN), fuente: 'tarifa_usd' };
    }
  }

  return { costo: 0, fuente: 'tarifa_mxn' };
}

export function pctComisionPorNumeroCita(numero: number): number {
  return numero <= TRAMO_LIMITE ? PCT_TRAMO_BAJO : PCT_TRAMO_ALTO;
}

export function calcularComision(costoSesion: number, pctComision: number): Omit<ContabilidadCalculo, 'costo_sesion' | 'costo_fuente' | 'numero_cita_paciente' | 'pct_comision'> {
  if (costoSesion <= 0) {
    return {
      base_sin_iva: 0,
      comision_bruta: 0,
      isr_retenido: 0,
      comision_neta: 0,
      iva_reservado: 0,
      stripe_fee: 0,
      ganancia_plataforma: 0,
    };
  }

  const baseSinIva = costoSesion / IVA_DIVISOR;
  const comisionBruta = baseSinIva * pctComision;
  const isrRetenido = comisionBruta * ISR_RATE;
  const comisionNeta = comisionBruta - isrRetenido;
  const ivaReservado = costoSesion - baseSinIva;
  const stripeFee = costoSesion * STRIPE_FEE_RATE;
  const gananciaPlataforma = baseSinIva - comisionBruta - stripeFee;

  return {
    base_sin_iva: round2(baseSinIva),
    comision_bruta: round2(comisionBruta),
    isr_retenido: round2(isrRetenido),
    comision_neta: round2(comisionNeta),
    iva_reservado: round2(ivaReservado),
    stripe_fee: round2(stripeFee),
    ganancia_plataforma: round2(gananciaPlataforma),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function pairKey(pacienteId: number, psicologoId: number): string {
  return `${pacienteId}:${psicologoId}`;
}

export function enrichContabilidadRows(rows: ContabilidadRowRaw[]): ContabilidadLinea[] {
  const counters = new Map<string, number>();

  return rows.map((row) => {
    const key = pairKey(row.paciente_id, row.psicologo_id);
    const prev = counters.get(key) ?? 0;
    const numero = prev + 1;
    counters.set(key, numero);

    const pct = pctComisionPorNumeroCita(numero);
    const { costo, fuente } = resolveCostoSesion(row);
    const montos = calcularComision(costo, pct);

    return {
      ...row,
      costo_sesion: costo,
      costo_fuente: fuente,
      numero_cita_paciente: numero,
      pct_comision: pct,
      ...montos,
    };
  });
}

export function fechaPagoDia(fechaPago: string | null): string {
  if (!fechaPago) return '';
  return fechaPago.slice(0, 10);
}

export function rangoQuincenaActual(ref = new Date()): { desde: string; hasta: string } {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const day = ref.getDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  const lastDay = new Date(y, m + 1, 0).getDate();
  const monthStr = `${y}-${pad(m + 1)}`;

  if (day <= 15) {
    return { desde: `${monthStr}-01`, hasta: `${monthStr}-15` };
  }
  return { desde: `${monthStr}-16`, hasta: `${monthStr}-${pad(lastDay)}` };
}

export function rangoMesActual(ref = new Date()): { desde: string; hasta: string } {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const pad = (n: number) => String(n).padStart(2, '0');
  const lastDay = new Date(y, m + 1, 0).getDate();
  const monthStr = `${y}-${pad(m + 1)}`;
  return { desde: `${monthStr}-01`, hasta: `${monthStr}-${pad(lastDay)}` };
}

export type ContabilidadFiltros = {
  periodo?: ContabilidadPeriodo;
  fechaCitaDesde?: string;
  fechaCitaHasta?: string;
  fechaPagoDesde?: string;
  fechaPagoHasta?: string;
  psicologoId?: number;
  incluirPrueba?: boolean;
};

function inRange(fecha: string, desde?: string, hasta?: string): boolean {
  if (desde && fecha < desde) return false;
  if (hasta && fecha > hasta) return false;
  return true;
}

export function filtrarLineas(
  lineas: ContabilidadLinea[],
  filtros: ContabilidadFiltros,
): ContabilidadLinea[] {
  let fechaCitaDesde = filtros.fechaCitaDesde;
  let fechaCitaHasta = filtros.fechaCitaHasta;

  if (filtros.periodo === 'quincena') {
    const r = rangoQuincenaActual();
    fechaCitaDesde = fechaCitaDesde || r.desde;
    fechaCitaHasta = fechaCitaHasta || r.hasta;
  } else if (filtros.periodo === 'mes') {
    const r = rangoMesActual();
    fechaCitaDesde = fechaCitaDesde || r.desde;
    fechaCitaHasta = fechaCitaHasta || r.hasta;
  }

  return lineas.filter((l) => {
    if (!filtros.incluirPrueba && l.es_prueba) return false;
    if (filtros.psicologoId != null && l.psicologo_id !== filtros.psicologoId) return false;

    const fechaCita = l.fecha.slice(0, 10);
    if (!inRange(fechaCita, fechaCitaDesde, fechaCitaHasta)) return false;

    const fechaPago = fechaPagoDia(l.fecha_pago);
    if (
      (filtros.fechaPagoDesde || filtros.fechaPagoHasta) &&
      !inRange(fechaPago, filtros.fechaPagoDesde, filtros.fechaPagoHasta)
    ) {
      return false;
    }

    return true;
  });
}

export function agregarPorPsicologo(lineas: ContabilidadLinea[]): ContabilidadResumenPsicologo[] {
  const map = new Map<number, ContabilidadResumenPsicologo>();

  for (const l of lineas) {
    const prev = map.get(l.psicologo_id);
    if (!prev) {
      map.set(l.psicologo_id, {
        psicologo_id: l.psicologo_id,
        psicologo_nombre: l.psicologo_nombre,
        citas: 1,
        costo_total: l.costo_sesion,
        comision_neta_total: l.comision_neta,
        iva_reservado_total: l.iva_reservado,
        stripe_fee_total: l.stripe_fee,
        ganancia_plataforma_total: l.ganancia_plataforma,
      });
    } else {
      prev.citas += 1;
      prev.costo_total = round2(prev.costo_total + l.costo_sesion);
      prev.comision_neta_total = round2(prev.comision_neta_total + l.comision_neta);
      prev.iva_reservado_total = round2(prev.iva_reservado_total + l.iva_reservado);
      prev.stripe_fee_total = round2(prev.stripe_fee_total + l.stripe_fee);
      prev.ganancia_plataforma_total = round2(prev.ganancia_plataforma_total + l.ganancia_plataforma);
    }
  }

  return [...map.values()].sort((a, b) =>
    a.psicologo_nombre.localeCompare(b.psicologo_nombre, 'es'),
  );
}

export function agregarTotales(lineas: ContabilidadLinea[]): ContabilidadTotales {
  return lineas.reduce<ContabilidadTotales>(
    (acc, l) => {
      acc.citas += 1;
      acc.costo_total = round2(acc.costo_total + l.costo_sesion);
      acc.comision_neta_total = round2(acc.comision_neta_total + l.comision_neta);
      acc.comision_bruta_total = round2(acc.comision_bruta_total + l.comision_bruta);
      acc.isr_total = round2(acc.isr_total + l.isr_retenido);
      acc.iva_reservado_total = round2(acc.iva_reservado_total + l.iva_reservado);
      acc.stripe_fee_total = round2(acc.stripe_fee_total + l.stripe_fee);
      acc.ganancia_plataforma_total = round2(acc.ganancia_plataforma_total + l.ganancia_plataforma);
      return acc;
    },
    {
      citas: 0,
      costo_total: 0,
      comision_neta_total: 0,
      comision_bruta_total: 0,
      isr_total: 0,
      iva_reservado_total: 0,
      stripe_fee_total: 0,
      ganancia_plataforma_total: 0,
    },
  );
}

export async function listContabilidadRows(): Promise<ContabilidadRowRaw[]> {
  try {
    const result = await query(CONTABILIDAD_SQL);
    return result.rows as ContabilidadRowRaw[];
  } catch (error) {
    if (!isUndefinedColumn(error)) throw error;
    const result = await query(CONTABILIDAD_SQL_LEGACY);
    return result.rows as ContabilidadRowRaw[];
  }
}

export async function buildContabilidadReport(
  filtros: ContabilidadFiltros,
): Promise<ContabilidadResponse> {
  const raw = await listContabilidadRows();
  const enriched = enrichContabilidadRows(raw);
  const lineas = filtrarLineas(enriched, filtros);

  return {
    lineas,
    por_psicologo: agregarPorPsicologo(lineas),
    totales: agregarTotales(lineas),
    periodo: filtros.periodo ?? 'historico',
  };
}

export async function setContabilidadEsPrueba(
  citaId: number,
  esPrueba: boolean,
): Promise<{ id: number; es_prueba: boolean } | null> {
  try {
    const result = await query(
      `UPDATE citas SET contabilidad_es_prueba = $1 WHERE id = $2
       RETURNING id, contabilidad_es_prueba AS es_prueba`,
      [esPrueba, citaId],
    );
    const row = result.rows[0] as { id: number; es_prueba: boolean } | undefined;
    return row ?? null;
  } catch (error) {
    if (isUndefinedColumn(error)) {
      throw new Error('missing_contabilidad_columns');
    }
    throw error;
  }
}

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

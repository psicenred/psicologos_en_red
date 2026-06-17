import { PRECIOS_DEFAULT_MXN, PRECIOS_DEFAULT_USD } from '@/lib/geo';
import { query } from '@/lib/db';

export interface StripeAmount {
  monto: number;
  currency: 'mxn' | 'usd';
}

export async function calcularMontoStripe(
  psicologoId: number,
  servicioInteres: string | undefined,
  useUsd: boolean,
): Promise<StripeAmount | null> {
  const psiRow = await query(
    `SELECT precio_terapia_individual, precio_terapia_pareja, precio_asesoria_crianza,
            precio_terapia_individual_usd, precio_terapia_pareja_usd, precio_asesoria_crianza_usd
     FROM psicologos WHERE id = $1`,
    [psicologoId],
  );
  if (psiRow.rows.length === 0) return null;

  const p = psiRow.rows[0] as Record<string, unknown>;
  const svc = (servicioInteres || '').toLowerCase();
  let monto: number;
  let currency: 'mxn' | 'usd';

  if (useUsd) {
    const pi = Number(p.precio_terapia_individual_usd) || PRECIOS_DEFAULT_USD.individual;
    const pp = Number(p.precio_terapia_pareja_usd) ?? PRECIOS_DEFAULT_USD.pareja;
    const pc = Number(p.precio_asesoria_crianza_usd) ?? PRECIOS_DEFAULT_USD.crianza;
    monto = svc.includes('pareja') ? pp : svc.includes('crianza') ? pc : pi;
    currency = 'usd';
    monto = Math.round(monto * 100);
  } else {
    const precioIndividual =
      Number(p.precio_terapia_individual) || PRECIOS_DEFAULT_MXN.individual;
    const precioPareja =
      Number(p.precio_terapia_pareja) ?? PRECIOS_DEFAULT_MXN.pareja;
    const precioCrianza =
      Number(p.precio_asesoria_crianza) ?? PRECIOS_DEFAULT_MXN.crianza;
    monto = precioIndividual;
    if (svc.includes('pareja')) monto = precioPareja;
    else if (svc.includes('crianza')) monto = precioCrianza;
    currency = 'mxn';
    monto = Math.round(monto * 100);
  }

  const testAmountMxn = process.env.STRIPE_TEST_AMOUNT_MXN
    ? parseInt(process.env.STRIPE_TEST_AMOUNT_MXN, 10)
    : 0;
  if (testAmountMxn > 0) {
    monto = Math.max(testAmountMxn * 100, 1000);
    currency = 'mxn';
  }

  return { monto, currency };
}

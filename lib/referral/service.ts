import { query } from '@/lib/db';
import {
  generateUniqueReferralCode,
  normalizeReferralCode,
} from '@/lib/referral/codes';

export type ReferralDashboardStats = {
  codigoReferido: string;
  totalReferidos: number;
  referidosConCita: number;
  descuentoReferidorPendiente: boolean;
};

function isReferralSchemaError(err: unknown): boolean {
  const msg = (err as { message?: string }).message || '';
  return (
    msg.includes('codigo_referido') ||
    msg.includes('referido_por') ||
    msg.includes('descuento_referidor') ||
    msg.includes('referidos') ||
    msg.includes('does not exist')
  );
}

/** Asegura que el usuario tenga codigo_referido (usuarios legacy tras migración). */
export async function ensureCodigoReferido(userId: number): Promise<string | null> {
  try {
    const current = await query<{ codigo_referido: string | null }>(
      'SELECT codigo_referido FROM usuarios WHERE id = $1 LIMIT 1',
      [userId],
    );
    const existing = normalizeReferralCode(current.rows[0]?.codigo_referido);
    if (existing) return existing;

    const code = await generateUniqueReferralCode();
    await query('UPDATE usuarios SET codigo_referido = $1 WHERE id = $2', [
      code,
      userId,
    ]);
    return code;
  } catch (err) {
    if (isReferralSchemaError(err)) return null;
    throw err;
  }
}

export async function resolveReferidorCodigo(
  refCode: string | null | undefined,
): Promise<string | null> {
  const normalized = normalizeReferralCode(refCode);
  if (!normalized || normalized.length < 4) return null;

  try {
    const r = await query<{ codigo_referido: string }>(
      'SELECT codigo_referido FROM usuarios WHERE codigo_referido = $1 LIMIT 1',
      [normalized],
    );
    return r.rows[0]?.codigo_referido ?? null;
  } catch (err) {
    if (isReferralSchemaError(err)) return null;
    throw err;
  }
}

/** Tras registro exitoso: vincula referido y crea fila en referidos. Falla en silencio si el código no existe. */
export async function attachReferidoOnRegister(
  newUserId: number,
  refCode: string | null | undefined,
): Promise<void> {
  const referidorCodigo = await resolveReferidorCodigo(refCode);
  if (!referidorCodigo) return;

  try {
    const referidor = await query<{ id: number }>(
      'SELECT id FROM usuarios WHERE codigo_referido = $1 LIMIT 1',
      [referidorCodigo],
    );
    const referidorId = referidor.rows[0]?.id;
    if (!referidorId || referidorId === newUserId) return;

    await query('UPDATE usuarios SET referido_por = $1 WHERE id = $2', [
      referidorCodigo,
      newUserId,
    ]);

    await query(
      `INSERT INTO referidos (referidor_codigo, referido_user_id)
       VALUES ($1, $2)
       ON CONFLICT (referido_user_id) DO NOTHING`,
      [referidorCodigo, newUserId],
    );
  } catch (err) {
    if (isReferralSchemaError(err)) return;
    throw err;
  }
}

/** Cuando un referido agenda su primera cita: activa crédito 50% al referidor. */
export async function procesarPrimeraCitaReferido(
  pacienteId: number,
): Promise<void> {
  try {
    const pending = await query<{ id: number; referidor_codigo: string }>(
      `SELECT id, referidor_codigo FROM referidos
       WHERE referido_user_id = $1 AND descuento_referidor_otorgado = false
       LIMIT 1`,
      [pacienteId],
    );
    if (pending.rows.length === 0) return;

    const row = pending.rows[0]!;
    const updated = await query(
      `UPDATE referidos
       SET primera_cita_agendada_at = NOW(), descuento_referidor_otorgado = true
       WHERE id = $1 AND descuento_referidor_otorgado = false
       RETURNING id`,
      [row.id],
    );
    if (updated.rows.length === 0) return;

    await query(
      `UPDATE usuarios SET descuento_referidor_pendiente = true
       WHERE codigo_referido = $1`,
      [row.referidor_codigo],
    );
  } catch (err) {
    if (isReferralSchemaError(err)) return;
    console.error('procesarPrimeraCitaReferido:', err);
  }
}

export async function getReferidorDiscountForPayment(
  pacienteId: number,
): Promise<{ apply: boolean; montoOriginal: number; montoFinal: number }> {
  try {
    const r = await query<{ descuento_referidor_pendiente: boolean }>(
      `SELECT descuento_referidor_pendiente FROM usuarios WHERE id = $1 LIMIT 1`,
      [pacienteId],
    );
    const pending = r.rows[0]?.descuento_referidor_pendiente === true;
    return { apply: pending, montoOriginal: 0, montoFinal: 0 };
  } catch (err) {
    if (isReferralSchemaError(err)) {
      return { apply: false, montoOriginal: 0, montoFinal: 0 };
    }
    throw err;
  }
}

export function applyReferidorDiscountAmount(monto: number): {
  montoOriginal: number;
  montoFinal: number;
} {
  const montoOriginal = monto;
  const montoFinal = Math.max(1, Math.round(monto / 2));
  return { montoOriginal, montoFinal };
}

export async function consumeReferidorDiscount(userId: number): Promise<void> {
  try {
    await query(
      `UPDATE usuarios SET descuento_referidor_pendiente = false
       WHERE id = $1 AND descuento_referidor_pendiente = true`,
      [userId],
    );
  } catch (err) {
    if (isReferralSchemaError(err)) return;
    throw err;
  }
}

export async function getReferralDashboardStats(
  userId: number,
): Promise<ReferralDashboardStats | null> {
  try {
    const code = await ensureCodigoReferido(userId);
    if (!code) return null;

    const userRow = await query<{
      descuento_referidor_pendiente: boolean;
    }>(
      'SELECT descuento_referidor_pendiente FROM usuarios WHERE id = $1 LIMIT 1',
      [userId],
    );

    const stats = await query<{
      total: number;
      con_cita: number;
    }>(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE primera_cita_agendada_at IS NOT NULL)::int AS con_cita
       FROM referidos WHERE referidor_codigo = $1`,
      [code],
    );

    return {
      codigoReferido: code,
      totalReferidos: stats.rows[0]?.total ?? 0,
      referidosConCita: stats.rows[0]?.con_cita ?? 0,
      descuentoReferidorPendiente:
        userRow.rows[0]?.descuento_referidor_pendiente === true,
    };
  } catch (err) {
    if (isReferralSchemaError(err)) return null;
    throw err;
  }
}

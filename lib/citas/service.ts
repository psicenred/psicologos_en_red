import { getBaseUrl } from '@/lib/config';
import { query } from '@/lib/db';
import { getPrecioRegionAsync } from '@/lib/geo';
import { getStripe } from '@/lib/stripe';
import { validateSlotAvailable } from '@/lib/citas/availability';
import {
  enviarCorreosCitaAgendada,
  enviarCorreosCitaCancelada,
  enviarCorreosCitaReagendada,
} from '@/lib/citas/emails';
import { calcularMontoStripe } from '@/lib/citas/pricing';
import type Stripe from 'stripe';

function linkSesion(pacienteId: number, psicologoId: number): string {
  return `/perfil?sala=sesion-${pacienteId}-${psicologoId}`;
}

export async function insertCitaFromWebhook(params: {
  pacienteId: number;
  psicologoId: number;
  fecha: string;
  hora: string;
  paymentIntentId: string | null;
  motivoDeConsulta: string | null;
  origenConocimiento: string | null;
  recomendadoPor: string | null;
}): Promise<number | null> {
  const {
    pacienteId,
    psicologoId,
    fecha,
    hora,
    paymentIntentId,
    motivoDeConsulta,
    origenConocimiento,
    recomendadoPor,
  } = params;

  const insertWithPaymentIntent = () =>
    query(
      `INSERT INTO citas (paciente_id, psicologo_id, fecha, hora, link_sesion, zona_horaria, fecha_hora_utc, stripe_payment_intent_id, motivo_de_consulta, origen_conocimiento, recomendado_por)
       SELECT $1, $2, $3, $4, $5,
         CASE WHEN NULLIF(TRIM(p.zona_horaria), '') = 'UTC' THEN 'America/Mexico_City'
              ELSE COALESCE(NULLIF(TRIM(p.zona_horaria), ''), 'America/Mexico_City') END,
         (($3::date + $4::time) AT TIME ZONE (CASE WHEN NULLIF(TRIM(p.zona_horaria), '') = 'UTC' THEN 'America/Mexico_City'
              ELSE COALESCE(NULLIF(TRIM(p.zona_horaria), ''), 'America/Mexico_City') END))::timestamptz::text,
         $6, $7, $8, $9
       FROM psicologos p WHERE p.id = $2
       RETURNING id`,
      [
        pacienteId,
        psicologoId,
        fecha,
        hora,
        linkSesion(pacienteId, psicologoId),
        paymentIntentId,
        motivoDeConsulta,
        origenConocimiento,
        recomendadoPor,
      ],
    );

  const insertSinStripe = () =>
    query(
      `INSERT INTO citas (paciente_id, psicologo_id, fecha, hora, link_sesion, zona_horaria, fecha_hora_utc, motivo_de_consulta, origen_conocimiento, recomendado_por)
       SELECT $1, $2, $3, $4, $5,
         CASE WHEN NULLIF(TRIM(p.zona_horaria), '') = 'UTC' THEN 'America/Mexico_City'
              ELSE COALESCE(NULLIF(TRIM(p.zona_horaria), ''), 'America/Mexico_City') END,
         (($3::date + $4::time) AT TIME ZONE (CASE WHEN NULLIF(TRIM(p.zona_horaria), '') = 'UTC' THEN 'America/Mexico_City'
              ELSE COALESCE(NULLIF(TRIM(p.zona_horaria), ''), 'America/Mexico_City') END))::timestamptz::text,
         $6, $7, $8
       FROM psicologos p WHERE p.id = $2
       RETURNING id`,
      [
        pacienteId,
        psicologoId,
        fecha,
        hora,
        linkSesion(pacienteId, psicologoId),
        motivoDeConsulta,
        origenConocimiento,
        recomendadoPor,
      ],
    );

  try {
    const result = await insertWithPaymentIntent();
    return (result.rows[0] as { id: number } | undefined)?.id ?? null;
  } catch (err) {
    const msg = (err as Error).message || '';
    if (
      msg.includes('stripe_payment_intent_id') ||
      msg.includes('does not exist')
    ) {
      const result = await insertSinStripe();
      return (result.rows[0] as { id: number } | undefined)?.id ?? null;
    }
    throw err;
  }
}

export async function agendarCita(params: {
  pacienteId: number;
  psicologoId: number;
  fecha: string;
  hora: string;
  motivoDeConsulta?: string | null;
  origenConocimiento?: string | null;
  recomendadoPor?: string | null;
}): Promise<{ success: true } | { error: string; status: number }> {
  const slot = await validateSlotAvailable(
    params.psicologoId,
    params.fecha,
    params.hora,
  );
  if (!slot.ok) return { error: slot.error, status: slot.status };

  const motivo =
    params.motivoDeConsulta &&
    String(params.motivoDeConsulta).trim().length > 0 &&
    String(params.motivoDeConsulta).length <= 200
      ? String(params.motivoDeConsulta).trim()
      : null;
  const origen =
    (params.origenConocimiento &&
      String(params.origenConocimiento).trim().slice(0, 80)) ||
    null;
  const recomendado =
    (params.recomendadoPor &&
      String(params.recomendadoPor).trim().slice(0, 200)) ||
    null;

  const sqlWithMotivo = motivo
    ? `INSERT INTO citas (paciente_id, psicologo_id, fecha, hora, link_sesion, motivo_de_consulta, zona_horaria, fecha_hora_utc, origen_conocimiento, recomendado_por)
       SELECT $1, $2, $3, $4, $5, $6,
         CASE WHEN NULLIF(TRIM(p.zona_horaria), '') = 'UTC' THEN 'America/Mexico_City'
              ELSE COALESCE(NULLIF(TRIM(p.zona_horaria), ''), 'America/Mexico_City') END,
         (($3::date + $4::time) AT TIME ZONE (CASE WHEN NULLIF(TRIM(p.zona_horaria), '') = 'UTC' THEN 'America/Mexico_City'
              ELSE COALESCE(NULLIF(TRIM(p.zona_horaria), ''), 'America/Mexico_City') END))::timestamptz::text,
         $7, $8
       FROM psicologos p WHERE p.id = $2 RETURNING id`
    : `INSERT INTO citas (paciente_id, psicologo_id, fecha, hora, link_sesion, zona_horaria, fecha_hora_utc, origen_conocimiento, recomendado_por)
       SELECT $1, $2, $3, $4, $5,
         CASE WHEN NULLIF(TRIM(p.zona_horaria), '') = 'UTC' THEN 'America/Mexico_City'
              ELSE COALESCE(NULLIF(TRIM(p.zona_horaria), ''), 'America/Mexico_City') END,
         (($3::date + $4::time) AT TIME ZONE (CASE WHEN NULLIF(TRIM(p.zona_horaria), '') = 'UTC' THEN 'America/Mexico_City'
              ELSE COALESCE(NULLIF(TRIM(p.zona_horaria), ''), 'America/Mexico_City') END))::timestamptz::text,
         $6, $7
       FROM psicologos p WHERE p.id = $2 RETURNING id`;

  const sqlParams = motivo
    ? [
        params.pacienteId,
        params.psicologoId,
        params.fecha,
        params.hora,
        linkSesion(params.pacienteId, params.psicologoId),
        motivo,
        origen,
        recomendado,
      ]
    : [
        params.pacienteId,
        params.psicologoId,
        params.fecha,
        params.hora,
        linkSesion(params.pacienteId, params.psicologoId),
        origen,
        recomendado,
      ];

  const insertResult = await query(sqlWithMotivo, sqlParams);
  const citaId =
    (insertResult.rows[0] as { id?: number } | undefined)?.id ?? null;

  try {
    await enviarCorreosCitaAgendada(
      params.pacienteId,
      params.psicologoId,
      params.fecha,
      params.hora,
      citaId,
    );
  } catch (e) {
    console.error('Error enviando correos cita:', e);
  }

  return { success: true };
}

export async function reagendarCita(params: {
  pacienteId: number;
  citaId: number;
  fecha: string;
  hora: string;
}): Promise<{ success: true } | { error: string; status: number }> {
  const citaInfo = await query(
    `SELECT id, estado, EXTRACT(EPOCH FROM ((fecha + hora) - NOW())) AS seconds_until
     FROM citas WHERE id = $1 AND paciente_id = $2 LIMIT 1`,
    [params.citaId, params.pacienteId],
  );
  if (citaInfo.rows.length === 0) {
    return { error: 'Cita no encontrada', status: 404 };
  }

  const row = citaInfo.rows[0] as {
    estado: string;
    seconds_until: number;
  };
  if (!['pendiente', 'confirmada'].includes(row.estado)) {
    return {
      error: 'Solo puedes reagendar citas pendientes o confirmadas.',
      status: 403,
    };
  }
  if (Number(row.seconds_until) / 3600 < 24) {
    return {
      error: 'Solo puedes reagendar con 24 horas de anticipación.',
      status: 403,
    };
  }

  const citaData = await query(
    'SELECT psicologo_id FROM citas WHERE id = $1',
    [params.citaId],
  );
  const psicologoId = (citaData.rows[0] as { psicologo_id: number })
    .psicologo_id;

  const slot = await validateSlotAvailable(
    psicologoId,
    params.fecha,
    params.hora,
    params.citaId,
  );
  if (!slot.ok) return { error: slot.error, status: slot.status };

  const result = await query(
    `UPDATE citas c
     SET fecha = $1, hora = $2, estado = 'pendiente',
         zona_horaria = CASE WHEN NULLIF(TRIM(p.zona_horaria), '') = 'UTC' THEN 'America/Mexico_City'
                            ELSE COALESCE(NULLIF(TRIM(p.zona_horaria), ''), 'America/Mexico_City') END,
         fecha_hora_utc = (($1::date + $2::time) AT TIME ZONE (CASE WHEN NULLIF(TRIM(p.zona_horaria), '') = 'UTC' THEN 'America/Mexico_City'
                            ELSE COALESCE(NULLIF(TRIM(p.zona_horaria), ''), 'America/Mexico_City') END))::timestamptz::text
     FROM psicologos p WHERE p.id = c.psicologo_id AND c.id = $3 AND c.paciente_id = $4
       AND c.estado IN ('pendiente', 'confirmada')
       AND ($1::date + $2::time) > NOW()
     RETURNING c.id`,
    [params.fecha, params.hora, params.citaId, params.pacienteId],
  );

  if (result.rowCount === 0) {
    return { error: 'La nueva fecha/hora debe ser futura.', status: 400 };
  }

  try {
    await enviarCorreosCitaReagendada(
      params.pacienteId,
      psicologoId,
      params.fecha,
      params.hora,
      params.citaId,
    );
  } catch (e) {
    console.error('Error enviando correos reagendar:', e);
  }

  return { success: true };
}

export async function cancelarCita(params: {
  pacienteId: number;
  citaId: number;
}): Promise<
  | { success: true; reembolso_solicitado: boolean }
  | { error: string; status: number }
> {
  const citaInfo = await query(
    `SELECT id, estado, stripe_payment_intent_id,
            EXTRACT(EPOCH FROM ((fecha + hora) - NOW())) AS seconds_until
     FROM citas WHERE id = $1 AND paciente_id = $2 LIMIT 1`,
    [params.citaId, params.pacienteId],
  );

  if (citaInfo.rows.length === 0) {
    return { error: 'Cita no encontrada', status: 404 };
  }

  const row = citaInfo.rows[0] as {
    estado: string;
    seconds_until: number;
    stripe_payment_intent_id?: string | null;
  };

  if (!['pendiente', 'confirmada'].includes(row.estado)) {
    return {
      error: 'Solo puedes cancelar citas pendientes o confirmadas.',
      status: 403,
    };
  }
  if (Number(row.seconds_until) / 3600 < 36) {
    return {
      error: 'Solo puedes cancelar con 36 horas de anticipación.',
      status: 403,
    };
  }

  const paymentIntentId =
    row.stripe_payment_intent_id && String(row.stripe_payment_intent_id).trim();
  const stripe = getStripe();

  if (paymentIntentId && stripe) {
    try {
      await stripe.refunds.create({
        payment_intent: paymentIntentId,
        reason: 'requested_by_customer',
      });
    } catch (refundErr) {
      const err = refundErr as { message?: string; code?: string; type?: string };
      console.error('Stripe refund error', params.citaId, err.message);
      const code = err.code || err.type;
      const msg =
        code === 'charge_already_refunded'
          ? 'Este pago ya fue reembolsado.'
          : 'No se pudo procesar el reembolso. Intenta de nuevo o contacta a soporte.';
      return { error: msg, status: 502 };
    }
  }

  const result = await query(
    `UPDATE citas SET estado = 'cancelada'
     WHERE id = $1 AND paciente_id = $2 AND estado IN ('pendiente', 'confirmada')
     RETURNING id, fecha, hora, psicologo_id`,
    [params.citaId, params.pacienteId],
  );

  if (result.rowCount === 0) {
    return { error: 'No se pudo cancelar esta cita', status: 403 };
  }

  const cancelled = result.rows[0] as {
    fecha: Date | string;
    hora: string;
    psicologo_id: number;
  };
  let fechaCita = cancelled.fecha;
  if (fechaCita instanceof Date) {
    fechaCita = fechaCita.toISOString().slice(0, 10);
  } else if (fechaCita != null) {
    fechaCita = String(fechaCita).slice(0, 10);
  }
  const horaCita =
    cancelled.hora != null ? String(cancelled.hora).substring(0, 5) : '';

  try {
    await enviarCorreosCitaCancelada(
      params.pacienteId,
      cancelled.psicologo_id,
      fechaCita,
      horaCita,
      params.citaId,
    );
  } catch (e) {
    console.error('Error enviando correos cancelación:', e);
  }

  return { success: true, reembolso_solicitado: !!paymentIntentId };
}

export async function crearSesionPago(
  request: Request,
  params: {
    pacienteId: number;
    psicologoId: number;
    fecha: string;
    hora: string;
    servicioInteres?: string;
    motivoDeConsulta?: string;
    currency?: string;
    successUrl?: string;
    cancelUrl?: string;
    origenConocimiento?: string;
    recomendadoPor?: string;
  },
): Promise<{ url: string } | { error: string; status: number; code?: string }> {
  const stripe = getStripe();
  if (!stripe || !process.env.STRIPE_SECRET_KEY) {
    return {
      error: 'Pagos no configurados. Contacta al administrador.',
      status: 503,
    };
  }

  const servicioLower = (params.servicioInteres || '').toLowerCase();
  if (servicioLower.includes('individual')) {
    const countCitas = await query(
      'SELECT 1 FROM citas WHERE paciente_id = $1 LIMIT 1',
      [params.pacienteId],
    );
    const esPacienteNuevo = countCitas.rows.length === 0;
    const motivoTrim = params.motivoDeConsulta?.trim() || '';
    if (esPacienteNuevo && (!motivoTrim || motivoTrim.length > 200)) {
      return {
        error:
          'Para tu primera cita de terapia individual es obligatorio indicar el motivo de consulta (máximo 200 caracteres).',
        status: 400,
      };
    }
  }

  const slot = await validateSlotAvailable(
    params.psicologoId,
    params.fecha,
    params.hora,
  );
  if (!slot.ok) return { error: slot.error, status: slot.status };

  const region =
    params.currency === 'USD' || params.currency === 'MXN'
      ? {
          currency: params.currency as 'USD' | 'MXN',
          inMexico: params.currency === 'MXN',
        }
      : await getPrecioRegionAsync(request);

  if (
    ('regionUnknown' in region && region.regionUnknown) ||
    !('currency' in region && region.currency)
  ) {
    return {
      error:
        'No se pudo determinar tu región. Por favor indica si pagarás desde México (MXN) o desde otro país (USD).',
      status: 400,
      code: 'REGION_REQUIRED',
    };
  }

  const useUsd = region.currency === 'USD';
  const pricing = await calcularMontoStripe(
    params.psicologoId,
    params.servicioInteres,
    useUsd,
  );
  if (!pricing) {
    return { error: 'Psicólogo no encontrado', status: 400 };
  }

  const baseUrl = getBaseUrl();
  const successUrl =
    params.successUrl &&
    typeof params.successUrl === 'string' &&
    params.successUrl.startsWith(baseUrl)
      ? params.successUrl
      : `${baseUrl}/catalogo?pago=exito`;
  const cancelUrl =
    params.cancelUrl &&
    typeof params.cancelUrl === 'string' &&
    params.cancelUrl.startsWith(baseUrl)
      ? params.cancelUrl
      : `${baseUrl}/catalogo`;

  const testAmountMxn = process.env.STRIPE_TEST_AMOUNT_MXN
    ? parseInt(process.env.STRIPE_TEST_AMOUNT_MXN, 10)
    : 0;
  const motivoMeta = params.motivoDeConsulta?.trim().slice(0, 200) || '';

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: pricing.currency,
          unit_amount: pricing.monto,
          product_data: {
            name:
              testAmountMxn > 0
                ? `Prueba de pago (${Math.max(testAmountMxn, 10)} MXN)`
                : params.servicioInteres || 'Sesión de psicoterapia',
            description:
              testAmountMxn > 0
                ? 'Pago de prueba - quitar STRIPE_TEST_AMOUNT_MXN después'
                : `1 sesión - ${params.fecha} ${params.hora}`,
          },
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      paciente_id: String(params.pacienteId),
      psicologo_id: String(params.psicologoId),
      fecha: params.fecha,
      hora: params.hora,
      ...(params.servicioInteres && {
        servicio_interes: String(params.servicioInteres),
      }),
      ...(motivoMeta ? { motivo_de_consulta: motivoMeta } : {}),
      ...(params.origenConocimiento &&
        params.origenConocimiento.length <= 80 && {
          origen_conocimiento: String(params.origenConocimiento),
        }),
      ...(params.recomendadoPor &&
        params.recomendadoPor.length <= 200 && {
          recomendado_por: String(params.recomendadoPor),
        }),
    },
    allow_promotion_codes: true,
  });

  if (!session.url) {
    return {
      error: 'No se pudo iniciar el pago. Intenta de nuevo.',
      status: 500,
    };
  }

  return { url: session.url };
}

export async function handleStripeCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const meta = session.metadata || {};
  const pacienteId = meta.paciente_id;
  const psicologoId = meta.psicologo_id;
  const fecha = meta.fecha;
  const hora = meta.hora;

  if (!pacienteId || !psicologoId || !fecha || !hora) return;

  const origenConocimiento =
    (meta.origen_conocimiento &&
      String(meta.origen_conocimiento).trim().slice(0, 80)) ||
    null;
  const recomendadoPor =
    (meta.recomendado_por &&
      String(meta.recomendado_por).trim().slice(0, 200)) ||
    null;
  const motivoDeConsulta =
    (meta.motivo_de_consulta &&
      String(meta.motivo_de_consulta).trim().slice(0, 200)) ||
    null;

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent &&
          typeof session.payment_intent === 'object' &&
          'id' in session.payment_intent
        ? String(session.payment_intent.id)
        : null;

  const citaId = await insertCitaFromWebhook({
    pacienteId: parseInt(pacienteId, 10),
    psicologoId: parseInt(psicologoId, 10),
    fecha,
    hora,
    paymentIntentId,
    motivoDeConsulta,
    origenConocimiento,
    recomendadoPor,
  });

  try {
    await enviarCorreosCitaAgendada(
      parseInt(pacienteId, 10),
      parseInt(psicologoId, 10),
      fecha,
      hora,
      citaId,
    );
  } catch (e) {
    console.error('Error enviando correos cita (webhook):', e);
  }
}

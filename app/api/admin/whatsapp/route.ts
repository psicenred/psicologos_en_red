import { NextResponse } from 'next/server';
import {
  databaseUnavailableJson,
  parseJsonBody,
  requireAdmin,
} from '@/lib/auth/api';
import { isDatabaseConfigured } from '@/lib/db';
import {
  getBaileysWorkerStatus,
  isBaileysWorkerConfigured,
  sendViaBaileysWorker,
} from '@/lib/whatsapp/providers/baileys-api';
import { isTwilioConfigured, sendViaTwilio } from '@/lib/whatsapp/providers/twilio';

function resolveProvider(): string {
  return (process.env.WHATSAPP_PROVIDER || 'auto').trim().toLowerCase() || 'auto';
}

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const provider = resolveProvider();
  const baileysConfigured = isBaileysWorkerConfigured();
  const twilioConfigured = isTwilioConfigured();
  const worker = baileysConfigured ? await getBaileysWorkerStatus() : null;
  const workerUrl = process.env.WHATSAPP_WORKER_URL?.trim().replace(/\/$/, '') || null;

  return NextResponse.json({
    provider,
    baileysConfigured,
    twilioConfigured,
    workerUrl,
    worker,
    pairPath: workerUrl ? `${workerUrl}/pair?token=…` : null,
  });
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const body = await parseJsonBody<{ telefono?: unknown; mensaje?: unknown }>(request);
  const telefono = String(body.telefono ?? '').trim();
  const mensaje =
    String(body.mensaje ?? '').trim() ||
    'Prueba de WhatsApp desde Panel Admin · Psicólogos en Red';

  if (!telefono) {
    return NextResponse.json({ error: 'Falta el teléfono' }, { status: 400 });
  }

  const provider = resolveProvider();

  try {
    if (provider === 'none') {
      return NextResponse.json(
        { error: 'WHATSAPP_PROVIDER=none: envíos desactivados' },
        { status: 503 },
      );
    }

    if (provider === 'baileys' || (provider === 'auto' && isBaileysWorkerConfigured())) {
      const status = await getBaileysWorkerStatus();
      if (!status?.connected) {
        return NextResponse.json(
          {
            error: 'Worker Baileys no conectado. Vincula el QR en /pair.',
            worker: status,
          },
          { status: 503 },
        );
      }
      const ok = await sendViaBaileysWorker(telefono, mensaje);
      if (!ok) {
        return NextResponse.json(
          { error: 'No se pudo enviar (teléfono inválido o worker sin configurar)' },
          { status: 400 },
        );
      }
      return NextResponse.json({
        ok: true,
        via: 'baileys',
        telefono,
        mensaje,
      });
    }

    if (provider === 'twilio' || (provider === 'auto' && isTwilioConfigured())) {
      await sendViaTwilio(telefono, mensaje);
      return NextResponse.json({
        ok: true,
        via: 'twilio',
        telefono,
        mensaje,
      });
    }

    return NextResponse.json(
      {
        error:
          'WhatsApp no configurado. En Vercel: WHATSAPP_PROVIDER, WHATSAPP_WORKER_URL, WHATSAPP_WORKER_SECRET.',
      },
      { status: 503 },
    );
  } catch (error) {
    console.error('POST /api/admin/whatsapp:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Error al enviar WhatsApp' },
      { status: 500 },
    );
  }
}

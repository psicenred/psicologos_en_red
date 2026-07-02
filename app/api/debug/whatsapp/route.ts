import { NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/cron/auth';
import { getBaileysWorkerStatus } from '@/lib/whatsapp/providers/baileys-api';
import { enviarWhatsapp } from '@/lib/whatsapp';

/** Prueba de envío WhatsApp (protegido con x-cron-secret). */
export async function POST(request: Request) {
  const denied = verifyCronSecret(request);
  if (denied) return denied;

  let body: { telefono?: string; mensaje?: string };
  try {
    body = (await request.json()) as { telefono?: string; mensaje?: string };
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const telefono = String(body.telefono || '').trim();
  const mensaje =
    String(body.mensaje || '').trim() ||
    'Prueba de WhatsApp desde Psicólogos en Red. Si recibes esto, las notificaciones están activas.';

  if (!telefono) {
    return NextResponse.json({ error: 'Falta telefono' }, { status: 400 });
  }

  const status = await getBaileysWorkerStatus();
  if (!status?.connected) {
    return NextResponse.json(
      {
        error: 'Worker no conectado',
        worker: status,
      },
      { status: 503 },
    );
  }

  await enviarWhatsapp(telefono, mensaje);
  return NextResponse.json({ ok: true, telefono, mensaje });
}

export async function GET(request: Request) {
  const denied = verifyCronSecret(request);
  if (denied) return denied;

  const status = await getBaileysWorkerStatus();
  return NextResponse.json({
    provider: process.env.WHATSAPP_PROVIDER?.trim() || 'auto',
    workerConfigured: Boolean(process.env.WHATSAPP_WORKER_URL?.trim()),
    worker: status,
  });
}

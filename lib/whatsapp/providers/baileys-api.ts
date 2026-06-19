import { normalizarTelefonoE164 } from '@/lib/whatsapp/normalize';

function workerUrl(): string | null {
  const raw = process.env.WHATSAPP_WORKER_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, '');
}

export function isBaileysWorkerConfigured(): boolean {
  return Boolean(workerUrl() && process.env.WHATSAPP_WORKER_SECRET?.trim());
}

export async function sendViaBaileysWorker(
  telefono: string | null | undefined,
  mensaje: string,
): Promise<boolean> {
  if (!isBaileysWorkerConfigured()) return false;
  if (!mensaje.trim()) return false;

  const base = workerUrl()!;
  const secret = process.env.WHATSAPP_WORKER_SECRET!.trim();
  const to = normalizarTelefonoE164(telefono);
  if (!to) return false;

  const res = await fetch(`${base}/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ to, message: mensaje }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `WhatsApp worker HTTP ${res.status}`);
  }

  return true;
}

export async function getBaileysWorkerStatus(): Promise<{
  connected: boolean;
  provider: 'baileys';
} | null> {
  const base = workerUrl();
  const secret = process.env.WHATSAPP_WORKER_SECRET?.trim();
  if (!base || !secret) return null;

  const res = await fetch(`${base}/health`, {
    headers: { Authorization: `Bearer ${secret}` },
    cache: 'no-store',
  });
  if (!res.ok) return { connected: false, provider: 'baileys' };
  const data = (await res.json()) as { connected?: boolean };
  return { connected: Boolean(data.connected), provider: 'baileys' };
}

#!/usr/bin/env node
/**
 * Prueba envío vía worker Baileys (local o Railway).
 *
 * Uso:
 *   WHATSAPP_WORKER_URL=https://tu-worker.up.railway.app \
 *   WHATSAPP_WORKER_SECRET=tu_secret \
 *   node scripts/test-whatsapp-send.mjs +525551234567 "Hola prueba"
 */

const base = (process.env.WHATSAPP_WORKER_URL || 'http://127.0.0.1:4055').replace(
  /\/$/,
  '',
);
const secret = process.env.WHATSAPP_WORKER_SECRET || '';
const to = process.argv[2];
const message = process.argv[3] || 'Prueba Psicólogos en Red – Baileys OK';

if (!secret) {
  console.error('Falta WHATSAPP_WORKER_SECRET');
  process.exit(1);
}
if (!to) {
  console.error(
    'Uso: WHATSAPP_WORKER_URL=... WHATSAPP_WORKER_SECRET=... node scripts/test-whatsapp-send.mjs +52XXXXXXXXXX "mensaje"',
  );
  process.exit(1);
}

async function main() {
  console.log('Health…', base);
  const healthRes = await fetch(`${base}/health`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const health = await healthRes.json().catch(() => ({}));
  console.log('Health:', healthRes.status, health);

  if (!health.connected) {
    console.error('Worker no conectado a WhatsApp. Escanea el QR en los logs de Railway.');
    process.exit(1);
  }

  console.log('Enviando a', to, '…');
  const sendRes = await fetch(`${base}/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ to, message }),
  });
  const body = await sendRes.text();
  console.log('Send:', sendRes.status, body);
  process.exit(sendRes.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

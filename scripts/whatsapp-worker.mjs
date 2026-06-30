#!/usr/bin/env node
/**
 * Worker Baileys (WhatsApp Web) — proceso persistente.
 *
 * Uso:
 *   npm run whatsapp:worker
 * Escanea el QR en terminal la primera vez; la sesión se guarda en data/whatsapp-auth/
 *
 * Variables:
 *   WHATSAPP_WORKER_PORT=4055
 *   WHATSAPP_WORKER_SECRET=...
 *   WHATSAPP_AUTH_DIR=./data/whatsapp-auth
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import qrcode from 'qrcode-terminal';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(
  process.env.PORT || process.env.WHATSAPP_WORKER_PORT || '4055',
  10,
);
const SECRET = process.env.WHATSAPP_WORKER_SECRET || '';
const AUTH_DIR =
  process.env.WHATSAPP_AUTH_DIR ||
  path.join(__dirname, '..', 'data', 'whatsapp-auth');

if (!SECRET) {
  console.error('Falta WHATSAPP_WORKER_SECRET');
  process.exit(1);
}

fs.mkdirSync(AUTH_DIR, { recursive: true });

let sock = null;
let connected = false;
let starting = false;

function toJid(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length < 10) return null;
  return `${digits}@s.whatsapp.net`;
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (token !== SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

async function startBaileys() {
  if (starting) return;
  starting = true;

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: { level: 'silent', trace() {}, debug() {}, info() {}, warn() {}, error() {}, fatal() {}, child() { return this; } },
    browser: ['Psicologos en Red', 'Chrome', '1.0.0'],
    syncFullHistory: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\nEscanea este QR con WhatsApp (Dispositivos vinculados):\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') {
      connected = true;
      starting = false;
      console.log('[whatsapp-worker] Conectado');
    }

    if (connection === 'close') {
      connected = false;
      starting = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = code === DisconnectReason.loggedOut;
      console.warn('[whatsapp-worker] Desconectado', code ?? '');

      if (loggedOut) {
        console.error('Sesión cerrada. Borra', AUTH_DIR, 'y vuelve a escanear QR.');
        return;
      }

      setTimeout(() => {
        startBaileys().catch((err) => {
          console.error('[whatsapp-worker] Reconexión fallida:', err.message);
        });
      }, 3000);
    }
  });
}

const app = express();
app.use(express.json({ limit: '32kb' }));

app.get('/health', authMiddleware, (_req, res) => {
  res.json({ connected, provider: 'baileys', authDir: AUTH_DIR });
});

app.post('/send', authMiddleware, async (req, res) => {
  try {
    if (!sock || !connected) {
      res.status(503).json({ error: 'WhatsApp no conectado' });
      return;
    }

    const { to, message } = req.body || {};
    const jid = toJid(to);
    if (!jid || !message || typeof message !== 'string') {
      res.status(400).json({ error: 'Faltan to o message' });
      return;
    }

    await sock.sendMessage(jid, { text: message.trim() });
    res.json({ ok: true, jid });
  } catch (err) {
    console.error('[whatsapp-worker] send:', err.message);
    res.status(500).json({ error: err.message || 'Error al enviar' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[whatsapp-worker] API en http://0.0.0.0:${PORT}`);
  startBaileys().catch((err) => {
    console.error('[whatsapp-worker] init:', err.message);
    process.exit(1);
  });
});

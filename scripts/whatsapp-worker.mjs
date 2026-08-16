#!/usr/bin/env node
/**
 * Worker Baileys (WhatsApp Web) — proceso persistente.
 *
 * Setup mínimo estilo LVFW: Baileys 6.7.x, sin parches de presencia.
 *
 * Uso:
 *   npm run whatsapp:worker
 *
 * Vincular:
 *   Abre /pair?token=TU_WHATSAPP_WORKER_SECRET
 *
 * Variables:
 *   WHATSAPP_WORKER_PORT=4055
 *   WHATSAPP_WORKER_SECRET=...
 *   WHATSAPP_AUTH_DIR=./data/whatsapp-auth
 *   WHATSAPP_QR_TERMINAL=1
 *   WHATSAPP_MIN_INTERVAL_MS=10000
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import QRCode from 'qrcode';
import qrcodeTerminal from 'qrcode-terminal';
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  fetchLatestWaWebVersion,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import pino from 'pino';

/** Fallback si falla el fetch de versión (evitar 405 por WA Web viejo). */
const WA_VERSION_FALLBACK = [2, 3000, 1045318025];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(
  process.env.PORT || process.env.WHATSAPP_WORKER_PORT || '4055',
  10,
);
const SECRET = process.env.WHATSAPP_WORKER_SECRET || '';
const AUTH_DIR =
  process.env.WHATSAPP_AUTH_DIR ||
  path.join(__dirname, '..', 'data', 'whatsapp-auth');
const QR_IN_TERMINAL = process.env.WHATSAPP_QR_TERMINAL === '1';
/** Mínimo entre envíos reales (evita ráfagas / bans). Default 10 s. */
const MIN_INTERVAL_MS = Math.max(
  0,
  parseInt(process.env.WHATSAPP_MIN_INTERVAL_MS || '10000', 10) || 10000,
);

if (!SECRET) {
  console.error('Falta WHATSAPP_WORKER_SECRET');
  process.exit(1);
}

fs.mkdirSync(AUTH_DIR, { recursive: true });

let sock = null;
let connected = false;
let starting = false;
let currentQr = null;
let qrUpdatedAt = null;
let lastSendAt = 0;
let queueDepth = 0;
/** Cadena serial: un envío a la vez + gap mínimo entre ellos. */
let sendChain = Promise.resolve();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Encola un envío: nunca en paralelo y con ≥ MIN_INTERVAL_MS desde el anterior.
 */
function enqueueSend(task) {
  queueDepth += 1;
  const run = sendChain.then(async () => {
    const waitMs = Math.max(0, MIN_INTERVAL_MS - (Date.now() - lastSendAt));
    if (waitMs > 0) {
      console.log(
        `[whatsapp-worker] Cola: esperando ${waitMs}ms (intervalo ${MIN_INTERVAL_MS}ms, profundidad ${queueDepth})`,
      );
      await sleep(waitMs);
    }
    try {
      const result = await task();
      lastSendAt = Date.now();
      return result;
    } finally {
      queueDepth = Math.max(0, queueDepth - 1);
    }
  });
  sendChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function toJid(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length < 10) return null;
  return `${digits}@s.whatsapp.net`;
}

function readPairToken(req) {
  const header = req.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
  const query = String(req.query?.token || req.query?.secret || '');
  return bearer || query;
}

function authMiddleware(req, res, next) {
  if (readPairToken(req) !== SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

function pairPage(title, bodyHtml, refreshSeconds = 0) {
  const refreshMeta =
    refreshSeconds > 0
      ? `<meta http-equiv="refresh" content="${refreshSeconds}" />`
      : '';
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  ${refreshMeta}
  <title>${title} · Psicólogos en Red</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
      font-family: system-ui, -apple-system, Segoe UI, sans-serif;
      background: linear-gradient(160deg, #fff5f9 0%, #f3f7ff 100%);
      color: #333; padding: 24px;
    }
    .card {
      max-width: 420px; width: 100%; background: #fff; border-radius: 20px;
      padding: 28px 24px; box-shadow: 0 12px 40px rgba(0,0,0,.08); text-align: center;
    }
    h1 { font-size: 1.25rem; margin: 0 0 8px; color: #222; }
    p { margin: 0 0 16px; color: #666; line-height: 1.5; font-size: 0.95rem; }
    .qr-wrap {
      display: inline-block; padding: 12px; background: #fff; border-radius: 12px;
      border: 2px solid #f0d0e0; margin: 8px 0 16px;
    }
    .qr-wrap img { display: block; width: 280px; height: 280px; }
    .ok { color: #1a7f4b; font-weight: 600; }
    .wait { color: #888; font-size: 0.85rem; }
    ol { text-align: left; margin: 16px 0 0; padding-left: 20px; color: #555; font-size: 0.9rem; }
    li { margin-bottom: 6px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    ${bodyHtml}
  </div>
</body>
</html>`;
}

async function resolveWaVersion() {
  try {
    const wa = await fetchLatestWaWebVersion();
    if (Array.isArray(wa?.version) && wa.version.length === 3) {
      return { version: wa.version, source: 'wa-web', isLatest: Boolean(wa.isLatest) };
    }
  } catch (err) {
    console.warn('[whatsapp-worker] fetchLatestWaWebVersion falló:', err.message);
  }
  try {
    const b = await fetchLatestBaileysVersion();
    if (Array.isArray(b?.version) && b.version.length === 3) {
      return {
        version: b.version,
        source: 'baileys',
        isLatest: Boolean(b.isLatest),
      };
    }
  } catch (err) {
    console.warn('[whatsapp-worker] fetchLatestBaileysVersion falló:', err.message);
  }
  return { version: WA_VERSION_FALLBACK, source: 'fallback', isLatest: false };
}

async function startBaileys() {
  if (starting) return;
  starting = true;

  if (sock) {
    try {
      sock.ev?.removeAllListeners?.();
      sock.end?.(undefined);
    } catch {
      /* ignore */
    }
    sock = null;
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version, source, isLatest } = await resolveWaVersion();
  console.log(
    `[whatsapp-worker] WA version ${version.join('.')} (source=${source}, latest=${isLatest})`,
  );

  // browser Mac/Chrome mitiga 405 ("client too old" / platform WEB rechazada).
  sock = makeWASocket({
    version,
    auth: state,
    browser: ['Mac OS', 'Chrome', '20.0.04'],
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    markOnlineOnConnect: false,
    syncFullHistory: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQr = qr;
      qrUpdatedAt = Date.now();
      console.log(
        '[whatsapp-worker] QR listo → abre /pair?token=TU_SECRET en el navegador',
      );
      if (QR_IN_TERMINAL) {
        qrcodeTerminal.generate(qr, { small: true });
      }
    }

    if (connection === 'open') {
      connected = true;
      currentQr = null;
      qrUpdatedAt = null;
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
        currentQr = null;
        qrUpdatedAt = null;
        console.error('Sesión cerrada. Borra', AUTH_DIR, 'y vuelve a escanear QR.');
        return;
      }

      // 405 = WA rechaza versión/plataforma; reintentar con backoff más largo.
      const delayMs = code === 405 ? 15000 : 3000;
      if (code === 405) {
        console.warn(
          '[whatsapp-worker] 405: WhatsApp rechazó el cliente. Reintentando con versión WA Web…',
        );
      }

      setTimeout(() => {
        startBaileys().catch((err) => {
          console.error('[whatsapp-worker] Reconexión fallida:', err.message);
        });
      }, delayMs);
    }
  });
}

const app = express();
app.use(express.json({ limit: '32kb' }));

app.get('/live', (_req, res) => {
  res.json({
    ok: true,
    connected,
    queueDepth,
    minIntervalMs: MIN_INTERVAL_MS,
  });
});

app.get('/health', authMiddleware, (_req, res) => {
  res.json({
    connected,
    provider: 'baileys',
    authDir: AUTH_DIR,
    queueDepth,
    minIntervalMs: MIN_INTERVAL_MS,
    lastSendAt: lastSendAt || null,
  });
});

app.get('/pair/status', (req, res) => {
  if (readPairToken(req) !== SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  res.json({
    connected,
    hasQr: Boolean(currentQr),
    qrUpdatedAt,
  });
});

app.get('/pair', async (req, res) => {
  if (readPairToken(req) !== SECRET) {
    res
      .status(401)
      .send(
        pairPage(
          'Acceso denegado',
          '<p>Token inválido. Usa <code>/pair?token=TU_WHATSAPP_WORKER_SECRET</code></p>',
        ),
      );
    return;
  }

  if (connected) {
    res.send(
      pairPage(
        'WhatsApp conectado',
        '<p class="ok">✓ Sesión activa. Ya puedes cerrar esta página.</p><p class="wait">Las notificaciones se enviarán desde este número.</p>',
      ),
    );
    return;
  }

  if (!currentQr) {
    res.send(
      pairPage(
        'Esperando código QR',
        `<p>El worker está iniciando. Esta página se actualiza sola.</p>
         <p class="wait">Si tarda más de 2 minutos, revisa los logs del servicio.</p>`,
        3,
      ),
    );
    return;
  }

  try {
    const dataUrl = await QRCode.toDataURL(currentQr, {
      width: 280,
      margin: 2,
      color: { dark: '#333333', light: '#ffffff' },
    });
    res.send(
      pairPage(
        'Vincular WhatsApp',
        `<p>Escanea con el teléfono que enviará las notificaciones.</p>
         <div class="qr-wrap"><img src="${dataUrl}" alt="Código QR WhatsApp" width="280" height="280" /></div>
         <p class="wait">Se actualiza cada 5 s mientras no esté vinculado.</p>
         <ol>
           <li>Abre WhatsApp en el teléfono emisor</li>
           <li>Menú ⋮ → <strong>Dispositivos vinculados</strong></li>
           <li><strong>Vincular dispositivo</strong> → escanea el QR</li>
         </ol>`,
        5,
      ),
    );
  } catch (err) {
    console.error('[whatsapp-worker] QR render:', err.message);
    res.status(500).send('Error al generar QR');
  }
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

    const text = message.trim();
    if (!text) {
      res.status(400).json({ error: 'Mensaje vacío' });
      return;
    }

    const result = await enqueueSend(async () => {
      if (!sock || !connected) {
        throw new Error('WhatsApp no conectado');
      }
      await sock.sendMessage(jid, { text });
      return { ok: true, jid, queuedWaitApplied: true };
    });

    res.json(result);
  } catch (err) {
    console.error('[whatsapp-worker] send:', err.message);
    const status = String(err.message || '').includes('no conectado') ? 503 : 500;
    res.status(status).json({ error: err.message || 'Error al enviar' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[whatsapp-worker] API en http://0.0.0.0:${PORT}`);
  console.log(
    `[whatsapp-worker] Intervalo mínimo entre mensajes: ${MIN_INTERVAL_MS}ms`,
  );
  console.log('[whatsapp-worker] Baileys 6.x mínimo (sin parche de presencia)');
  console.log('[whatsapp-worker] Vincular: GET /pair?token=...');
  startBaileys().catch((err) => {
    console.error('[whatsapp-worker] init:', err.message);
    process.exit(1);
  });
});

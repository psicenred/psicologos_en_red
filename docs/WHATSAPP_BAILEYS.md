# WhatsApp con Baileys

La app **ya envía WhatsApp** en paralelo al correo cuando Baileys está configurado.

---

## Checkpoint — dónde nos quedamos

**Fecha:** 2026-06-30 · **Proyecto Railway:** `accomplished-courage` · **Servicio:** `whatsapp-worker`

### ✅ Ya hecho

| Paso | Estado |
|------|--------|
| Login Railway CLI (`motac.balam@gmail.com`) | ✅ |
| Servicio `whatsapp-worker` creado y enlazado | ✅ |
| Variables `WHATSAPP_WORKER_SECRET`, `WHATSAPP_AUTH_DIR` | ✅ |
| Variable `NIXPACKS_CONFIG_FILE=nixpacks.toml` | ✅ |
| Volumen en `/data/whatsapp-auth` | ✅ |
| Dominio público del worker | ✅ `https://whatsapp-worker-production-9b9e.up.railway.app` |
| Build corregido (Node 22, sin `next build`) | ✅ |
| Deploy subido; worker arrancó (`API en http://0.0.0.0:8080`) | ✅ |
| Intento de vincular por QR en **logs** | ⏸️ muchos QR; **sesión aún no conectada** |
| Página `/pair` en código local (`scripts/whatsapp-worker.mjs`) | ✅ escrita, **falta desplegar** |
| Variables en **Vercel** (`WHATSAPP_*`) | ❌ pendiente |
| Prueba end-to-end (health + envío WhatsApp) | ❌ pendiente |
| **Commit / push** de cambios WhatsApp al repo | ❌ pendiente |

### ▶️ Continuar desde aquí (en orden)

1. **Subir código al repo** (si aún no está en `main`):
   ```bash
   git add scripts/whatsapp-worker.mjs nixpacks.toml railway.toml package.json package-lock.json docs/WHATSAPP_BAILEYS.md
   git commit -m "Worker WhatsApp: página /pair y build Railway con nixpacks"
   git push
   ```
   *(Omitir si ya hiciste commit; si no, `railway up` desde tu máquina también sube archivos locales.)*

2. **Redesplegar el worker** con la página `/pair`:
   ```bash
   cd /Users/balam/Documents/Psic_en_red_next
   railway up --detach -s whatsapp-worker
   ```

3. **Vincular WhatsApp en el navegador** (ya no uses logs para el QR):
   ```
   https://whatsapp-worker-production-9b9e.up.railway.app/pair?token=TU_WHATSAPP_WORKER_SECRET
   ```
   Escanear → debe mostrar **WhatsApp conectado**.

4. **Comprobar worker:**
   ```bash
   curl -s https://whatsapp-worker-production-9b9e.up.railway.app/live
   ```
   Esperado: `{"ok":true,"connected":true}`

5. **Variables en Vercel** → Settings → Environment Variables → redeploy:
   ```env
   WHATSAPP_PROVIDER=baileys
   WHATSAPP_WORKER_URL=https://whatsapp-worker-production-9b9e.up.railway.app
   WHATSAPP_WORKER_SECRET=<el mismo secret de Railway>
   ```

6. **Probar desde producción:**
   ```bash
   curl -s -H "x-health-secret: TU_CRON_SECRET" https://www.psicologosenred.com/api/health
   curl -s -X POST https://www.psicologosenred.com/api/debug/whatsapp \
     -H "x-cron-secret: TU_CRON_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"telefono":"+52XXXXXXXXXX","mensaje":"Prueba Psicólogos en Red"}'
   ```

7. **Opcional:** si el contenedor reinicia en bucle antes de escanear, desactiva **Healthcheck** del servicio en Railway hasta vincular.

---

## Checklist de activación (producción)

### Railway — worker Baileys

1. **Nuevo servicio** en Railway (mismo repo; `railway.toml` incluye start command).
2. **Start command:** `npm run whatsapp:worker`
3. **Variables del worker:**

```env
WHATSAPP_WORKER_SECRET=<openssl rand -hex 32>
WHATSAPP_AUTH_DIR=/data/whatsapp-auth
```

4. **Volumen persistente** montado en `/data/whatsapp-auth`.
5. **Generar dominio público** en Railway (Settings → Networking).
6. Variable de build: `NIXPACKS_CONFIG_FILE=nixpacks.toml` (solo servicio whatsapp-worker).
7. Abrir en el navegador: `https://tu-worker.up.railway.app/pair?token=TU_WHATSAPP_WORKER_SECRET`
8. Escanear QR → la página mostrará **WhatsApp conectado**.
9. Confirmar `GET https://tu-worker.up.railway.app/live` → `{"ok":true,"connected":true}`.

### Vercel — app principal

```env
WHATSAPP_PROVIDER=baileys
WHATSAPP_WORKER_URL=https://tu-worker.up.railway.app
WHATSAPP_WORKER_SECRET=<el mismo secret del worker>
```

Redeploy en Vercel tras guardar variables.

### Verificar

```bash
# Health detallado (whatsappWorker + whatsappConnected)
curl -s -H "x-health-secret: TU_CRON_SECRET" https://www.psicologosenred.com/api/health

# Estado del worker
curl -s -H "x-cron-secret: TU_CRON_SECRET" https://www.psicologosenred.com/api/debug/whatsapp

# Enviar prueba a tu número (+52...)
curl -s -X POST https://www.psicologosenred.com/api/debug/whatsapp \
  -H "x-cron-secret: TU_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"telefono":"+525551234567","mensaje":"Prueba Psicólogos en Red"}'
```

Debe mostrar `whatsappWorker: true` y `whatsappConnected: true`.

### Build falla con `npm ci` / `@swc/helpers`

El worker usa `nixpacks.toml`: Node 22 y **sin** `next build`. Si el build falla, redeploya tras `git pull` y `railway up --detach -s whatsapp-worker`.

## Arquitectura

| Componente | Dónde corre | Rol |
|------------|-------------|-----|
| **Next.js (Vercel)** | `lib/whatsapp/send.ts` | Llama al worker vía HTTP |
| **Worker Baileys** | Railway / VPS (proceso persistente) | Mantiene sesión WhatsApp Web y envía mensajes |

Vercel **no puede** ejecutar Baileys directamente (sin proceso persistente ni disco para la sesión).

## Eventos que envían WhatsApp hoy

- Cita agendada (paciente y psicólogo)
- Cita reagendada
- Cita cancelada
- Recordatorio 30 min antes de la sesión
- Recordatorios post-cita (días 15, 30, 60)
- Nuevo mensaje en el chat (si el destinatario tiene teléfono en su perfil)

## Paso 1: Worker en Railway (referencia)

> **Nota:** Si ya seguiste el [Checkpoint](#checkpoint--dónde-nos-quedamos), salta a **continuar desde el paso 2** del checkpoint (redeploy + `/pair`).

1. Crea un **servicio nuevo** en Railway (mismo repo o solo el worker).
2. **Start command:** `npm run whatsapp:worker`
3. Variables de entorno del worker:

```env
WHATSAPP_WORKER_PORT=4055
WHATSAPP_WORKER_SECRET=<genera uno largo, ej. openssl rand -hex 32>
WHATSAPP_AUTH_DIR=/data/whatsapp-auth
```

4. Monta un **volumen persistente** en `/data/whatsapp-auth` (la sesión QR queda guardada).
5. Variable de build en el servicio **solo whatsapp-worker**: `NIXPACKS_CONFIG_FILE=nixpacks.toml` (evita `next build` y usa Node 22).
6. Despliega y abre **`/pair?token=...`** en el navegador (ver [Vincular WhatsApp](#vincular-whatsapp-página-pair)).
7. Cuando la sesión esté conectada, confirma con `/live` y configura Vercel.

## Paso 2: Variables en Vercel

```env
WHATSAPP_PROVIDER=baileys
WHATSAPP_WORKER_URL=https://tu-worker.up.railway.app
WHATSAPP_WORKER_SECRET=<el mismo secret del worker>
```

- `WHATSAPP_PROVIDER=auto` → intenta Baileys y, si falla, Twilio (si está configurado).
- `WHATSAPP_PROVIDER=none` → desactiva WhatsApp.

## Paso 3: Probar

```bash
# Local (worker en otra terminal)
WHATSAPP_WORKER_SECRET=test123 npm run whatsapp:worker

# En otra terminal, con el worker conectado:
curl -s -H "Authorization: Bearer test123" http://127.0.0.1:4055/health

curl -s -X POST http://127.0.0.1:4055/send \
  -H "Authorization: Bearer test123" \
  -H "Content-Type: application/json" \
  -d '{"to":"+525551234567","message":"Prueba Psicólogos en Red"}'
```

Health detallado de la app (con secret):

```bash
curl -H "x-health-secret: TU_CRON_SECRET" https://psicologos-en-red.vercel.app/api/health
```

Debe mostrar `whatsappWorker: true` y `whatsappConnected: true`.

## Teléfonos en base de datos

Los usuarios necesitan **teléfono** en `usuarios.telefono` (10 dígitos México → se normaliza a `+52...`). Sin teléfono solo se envía correo.

## Vincular WhatsApp (página /pair)

El QR **ya no se imprime en logs** (salvo `WHATSAPP_QR_TERMINAL=1`). Abre en el navegador:

```
https://whatsapp-worker-production-9b9e.up.railway.app/pair?token=TU_WHATSAPP_WORKER_SECRET
```

La página se refresca sola hasta que la sesión quede conectada. **No compartas esa URL** (el token es secreto).

## Si la sesión se cierra

Si en logs aparece `loggedOut`, borra el contenido de `WHATSAPP_AUTH_DIR` y vuelve a escanear el QR.

## Twilio (alternativa de pago)

Si prefieres API oficial en lugar de Baileys:

```env
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
WHATSAPP_FROM=+525530776194
```

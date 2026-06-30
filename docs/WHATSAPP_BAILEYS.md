# WhatsApp con Baileys

La app **ya envía WhatsApp** en paralelo al correo cuando Baileys está configurado.

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

## Paso 1: Worker en Railway (o VPS)

1. Crea un **servicio nuevo** en Railway (mismo repo o solo el worker).
2. **Start command:** `npm run whatsapp:worker`
3. Variables de entorno del worker:

```env
WHATSAPP_WORKER_PORT=4055
WHATSAPP_WORKER_SECRET=<genera uno largo, ej. openssl rand -hex 32>
WHATSAPP_AUTH_DIR=/data/whatsapp-auth
```

4. Monta un **volumen persistente** en `/data/whatsapp-auth` (la sesión QR queda guardada).
5. Despliega y abre **logs** → escanea el **QR** con WhatsApp del número que enviará (Dispositivos vinculados).
6. Cuando veas `[whatsapp-worker] Conectado`, copia la **URL pública** del servicio (ej. `https://whatsapp-worker-production.up.railway.app`).

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

Debe mostrar `whatsappWorker: true`.

## Teléfonos en base de datos

Los usuarios necesitan **teléfono** en `usuarios.telefono` (10 dígitos México → se normaliza a `+52...`).

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

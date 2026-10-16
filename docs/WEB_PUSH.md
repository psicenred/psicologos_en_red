# Web Push (PWA) — Camino A

Notificaciones push en la app instalada (Android Chrome e iPhone Safari 16.4+ con “Añadir a pantalla de inicio”).

## Setup

1. **SQL en Supabase** — ejecutar `migrations/add_push_subscriptions.sql`.

2. **Claves VAPID** (una vez):

```bash
npx web-push generate-vapid-keys
```

3. **Vercel → Environment Variables** (Production y Preview):

| Variable | Valor |
|----------|--------|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public Key |
| `VAPID_PRIVATE_KEY` | Private Key |
| `VAPID_SUBJECT` | `mailto:contacto@psicologosenred.com` |

4. Redesplegar. Sin estas variables, la UI muestra “no configuradas” y no se envían pushes.

## Uso

- Paciente: **Perfil → Configuración** → “Activar notificaciones”.
- Psicólogo: **Agenda → Mi Perfil** → misma tarjeta.
- En iPhone: instalar la PWA y abrirla desde el icono antes de activar.

## Eventos que disparan push

- Nuevo mensaje de chat (mismo flujo que correo/WhatsApp).
- Cita agendada (paciente y psicólogo).
- Recordatorio de cita ~30 min antes (cron existente).

## Archivos clave

- `public/sw.js` — Service Worker + `push` / `notificationclick`
- `lib/push/*` — VAPID, suscripciones, envío
- `app/api/push/*` — subscribe / unsubscribe / public key
- `components/features/push/PushNotificationsCard.tsx` — opt-in

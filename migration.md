# Migración Psicólogos en Red — Documento de referencia

> **Estrategia obligatoria:** todo el trabajo se hace en este repo **sandbox**. No tocar producción hasta confirmar cutover end-to-end. No implementar fases sin aprobación explícita (`adelante Fase X`).

**Stack origen:** Node.js + Express (`server.js`) · HTML en `views/` · JS en `public/` · PostgreSQL (Railway) · Hosting Railway

**Stack destino:** Next.js 15 full-stack (App Router) · Supabase (Postgres + Storage, sin Auth) · iron-session · Vercel · Stripe Connect · Daily.co · Twilio · Resend/Nodemailer · Groq · cron-job.org

**Estimación (1 dev):** migración completa ~14–22 semanas · MVP híbrido (público + blog + academia) ~6–8 semanas

---

## Índice

0. [Decisiones arquitectónicas fijas](#0-decisiones-arquitectónicas-fijas)
1. [Estado actual del sandbox](#1-estado-actual-del-sandbox)
2. [Archivos clave](#2-archivos-clave)
3. [Inventario de páginas](#3-inventario-de-páginas)
4. [Inventario de rutas API](#4-inventario-de-rutas-api)
5. [Base de datos](#5-base-de-datos)
6. [Integraciones y variables de entorno](#6-integraciones-y-variables-de-entorno)
7. [Archivos y Storage](#7-archivos-y-storage)
8. [Jobs en background](#8-jobs-en-background)
9. [Sesiones y auth](#9-sesiones-y-auth)
10. [Plan por fases](#10-plan-por-fases)
11. [Entregables Fase 1 (pendiente aprobación)](#11-entregables-fase-1-pendiente-aprobación)
12. [Reglas de trabajo](#12-reglas-de-trabajo)
13. [Riesgos principales](#13-riesgos-principales)
14. [Cutover (solo cuando se apruebe)](#14-cutover-solo-cuando-se-apruebe)

---

## 0. Decisiones arquitectónicas fijas

> **No sugerir alternativas** a lo siguiente. Si algo se desvía, avisar explícitamente antes de implementar.

### Stack

| Componente | Decisión |
|------------|----------|
| **App** | Next.js 15 full-stack (App Router) — reemplaza Express **y** el frontend HTML |
| **DB + archivos** | Supabase Postgres + Storage (**NO** Supabase Auth) |
| **Sesiones** | iron-session — payload `{ id, nombre, email, rol }` |
| **Hosting** | Vercel |
| **Crons** | **cron-job.org** → route handlers Next (NO `setInterval`, NO Vercel Cron por ahora) |
| **Pagos** | Stripe Connect (mantener integración actual) |
| **Video** | Daily.co (mantener) |
| **WhatsApp** | Twilio (mantener) |
| **Email** | Resend o Nodemailer/Zoho (mantener) |
| **Chatbot** | Groq (mantener) |
| **Estructura repo** | NO monorepo, NO backend separado — **todo en Next.js** |

### Auth y sesiones

- `SESSION_SECRET` en `.env` (nunca hardcodeado).
- Cookie: `secure: true`, `sameSite: 'lax'`.
- Auth propio: tabla `usuarios` + bcrypt (como hoy).
- Supabase Auth: **no usar**.

### Supabase

- Solo Postgres + Storage en fases iniciales.
- RLS: **desactivado** por ahora.
- Conexión: directa vía `pg` o `@supabase/supabase-js` con **service role** (`lib/supabase.ts`).

### Stripe webhook

- Ruta: `app/api/webhook/stripe/route.ts`
- `export const runtime = 'nodejs'`
- Body parser desactivado en ese route (body raw para verificar firma).

### Crons

- Route handlers protegidos con header **`x-cron-secret`** (valor en `.env` → `CRON_SECRET`).
- Disparador externo: **cron-job.org** cada 5 min (recordatorios).
- Lógica recordatorio 30 min:
  1. Consultar citas con `fecha_hora_utc BETWEEN now() AND now() + interval '35 minutes'` y `recordatorio_enviado_at IS NULL`.
  2. Enviar email + WhatsApp.
  3. Marcar `recordatorio_enviado_at = now()`.

### Storage (3 buckets)

| Bucket | Visibilidad |
|--------|-------------|
| `blog-images` | Público |
| `psychologist-docs` | Privado (signed URLs) |
| `chat-attachments` | Privado |

Imágenes estáticas del sitio (`/images/*`): seguir en `public/` (no bucket dedicado).

### Cifrado

- Mensajes y notas clínicas: AES-256-GCM con `MENSAJES_ENCRYPTION_KEY` (mantener lógica legacy).

### Legacy en paralelo

- `npm run dev:legacy` → `node server.js` debe seguir funcionando **hasta Fase 7**.
- En desarrollo, `next.config.ts` con rewrites `/legacy/*` → Express (puerto legacy).

### Seguridad urgente (Fase 1 — primera prioridad)

En producción Express el secret está hardcodeado:

```javascript
secret: 'mi-clave-secreta-psicologos'
```

**Corregir en Fase 1** moviendo a `SESSION_SECRET` en variables de entorno (Next + legacy Express durante transición).

---

## 1. Estado actual del sandbox

| Capa | Estado |
|------|--------|
| **Legacy Express** | ~~Activo~~ **Eliminado (Fase 8)** — `server.js`, `db.js`, `views/` archivados |
| **Frontend** | **100% React/TSX** — Tailwind v4 + shadcn/ui; sin puente HTML |
| **Next.js** | 17 páginas TSX + 77+ APIs en `app/api/` |
| **Arranque** | `npm run dev` → Next :3000 (único servidor) |
| **DB** | Postgres vía `lib/db.ts` + `DATABASE_URL`; dump en `railway_full_dump.sql` + 15 migraciones |
| **Uploads** | Locales en `uploads/` (gitignored) y `public/uploads/blog/` |

---

## 2. Archivos clave

| Archivo / carpeta | Rol |
|-------------------|-----|
| `app/` | Páginas y route handlers Next.js |
| `components/` | UI shadcn, layout, features (catálogo, auth, dashboards, chat) |
| `lib/` | Sesión, DB, auth, citas, Stripe, storage |
| `app/globals.css` | Design tokens marca + Tailwind |
| `public/` | Assets estáticos, PWA, imágenes |
| `utils/dbHelpers.js` | Helpers DB (ej. `hasHadAppointment`) |
| `migrations/*.sql` | Migraciones incrementales del esquema |
| `railway_full_dump.sql` | Dump base de referencia |
| `.env` / `.env.example` | Secretos (no commitear `.env`) |
| `docs/` | Guías operativas (Stripe, Daily, Resend, etc.) |

---

## 3. Inventario de páginas

| Ruta | Vista | Auth / rol |
|------|-------|------------|
| `/` | `index.html` | — |
| `/catalogo` | `catalogo.html` | — |
| `/nosotros` | `nosotros.html` | — |
| `/contacto` | `contacto.html` | — |
| `/trabaja-con-nosotros` | `trabaja-con-nosotros.html` | — |
| `/academia` | `academia.html` | — |
| `/blog` | `blog.html` | — |
| `/blog/:slug` | `blog.html` (dinámico) | — |
| `/terminos-condiciones` | `terminos-condiciones.html` | — |
| `/aviso-privacidad` | `aviso-privacidad.html` | — |
| `/registro` | `registro.html` | — |
| `/registro-exitoso` | `registro-exitoso.html` | — |
| `/login` | `login.html` | — |
| `/verificar-email` | HTML inline en `server.js` | — |
| `/reenviar-verificacion` | HTML inline en `server.js` | — |
| `/reestablecer-password` | `reestablecer-password.html` | — |
| `/perfil` | `perfil.html` (~1.300 líneas, SPA-like) | auth |
| `/panel-doctor` | `panel-doctor.html` | auth + `psicologo` |
| `/panel-admin` | `panel-admin.html` (~1.970 líneas, Quill) | auth + `admin` |

**Complejidad UI alta:** `perfil`, `panel-doctor`, `panel-admin` (calendario Flatpickr, Daily.co, chat, Stripe embebido).

### Assets cliente (`public/`)

| Archivo | Uso |
|---------|-----|
| `estilos.css` | Diseño global |
| `manifest.json` | PWA |
| `pwa-register.js`, `pwa-standalone.js`, `pwa-notif-mensajes.js` | PWA |
| `i18n.js` | Internacionalización ES/EN |
| `chat-widget.js` + `chat-widget.css` | Chatbot Groq |
| `formatear-cita-hora.js` | Formato de horas de citas |
| `video-fullscreen.js` | Videollamada fullscreen |

**Nota:** imágenes referenciadas como `/images/*` — pueden no estar en el repo (verificar en prod antes de Fase 2).

---

## 4. Inventario de rutas API

Total: **103 handlers** en `server.js`.

### Webhook (body raw — crítico)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/webhook/stripe` | `checkout.session.completed` → inserta cita + emails/WhatsApp |

### Auth y usuarios

| Método | Ruta | Auth |
|--------|------|------|
| POST | `/registrar-usuario` | — |
| POST | `/auth/login` | — |
| POST | `/auth/olvide-password` | — |
| POST | `/auth/update-password-forgotten` | — |
| GET | `/logout` | — |
| GET | `/verificar-email` | — |
| GET | `/reenviar-verificacion` | — |
| GET | `/reestablecer-password` | — |
| GET | `/api/estado-sesion` | — |
| GET | `/api/user-data` | — |
| GET | `/api/quien-soy` | auth |

### Público / catálogo / contenido

| Método | Ruta | Auth |
|--------|------|------|
| GET | `/api/psicologos` | — |
| GET | `/api/psicologo/:id` | — |
| GET | `/api/precio-region` | — |
| GET | `/api/disponibilidad-calendario/:psicologoId` | — |
| GET | `/api/horarios-disponibles/:psicologoId` | — |
| GET | `/api/diplomados` | — |
| GET | `/api/blog-articulos` | — |
| GET | `/api/testimonios-encuesta` | — |
| GET | `/api/config/video-boton-15min` | — |
| POST | `/api/contacto` | — |
| POST | `/api/aplicacion-trabajo` | — |
| POST | `/api/chat` | — (Groq) |

### Citas y pagos

| Método | Ruta | Auth |
|--------|------|------|
| POST | `/api/crear-sesion-pago` | auth (Stripe Checkout) |
| POST | `/api/agendar-cita` | auth |
| POST | `/api/reagendar-cita` | auth |
| POST | `/api/cancelar-cita` | auth |
| GET | `/api/mis-citas-paciente` | auth |
| GET | `/api/mis-citas-doctor` | auth |
| GET | `/api/soy-paciente-nuevo` | auth |
| GET | `/api/citas/:citaId/notas` | auth |
| POST | `/api/citas/:citaId/notas` | auth |
| POST | `/api/citas/:citaId/registrar-entrada` | auth |

### Video

| Método | Ruta | Auth |
|--------|------|------|
| POST | `/api/daily-meeting` | auth (Daily.co — activo) |
| GET | `/api/jaas-config` | — (Jitsi legacy) |
| GET | `/api/jaas-jwt` | auth (Jitsi legacy) |

### Perfil y agenda (psicólogo / paciente)

| Método | Ruta | Auth |
|--------|------|------|
| POST | `/api/update-profile` | auth |
| GET | `/api/mi-zona-horaria` | auth |
| PUT | `/api/mi-zona-horaria` | auth |
| POST | `/api/mi-zona-horaria/detectar` | auth |
| GET | `/api/horario-laboral` | auth |
| POST | `/api/horario-laboral` | auth |
| PUT | `/api/horario-laboral/:id` | auth |
| DELETE | `/api/horario-laboral/:id` | auth |
| GET | `/api/vacaciones` | auth |
| POST | `/api/vacaciones` | auth |
| DELETE | `/api/vacaciones/:id` | auth |
| DELETE | `/api/borrar-fecha-especifica/:id` | auth |

### Documentos psicólogo

| Método | Ruta | Auth |
|--------|------|------|
| GET | `/api/documentos` | auth |
| POST | `/api/documentos` | auth |
| POST | `/api/documentos/upload` | auth |
| PUT | `/api/documentos/orden` | auth |
| GET | `/api/documentos/:id` | auth |
| PUT | `/api/documentos/:id` | auth |
| DELETE | `/api/documentos/:id` | auth |
| GET | `/api/documentos/:id/archivo` | auth |

### Chat / mensajes

| Método | Ruta | Auth |
|--------|------|------|
| GET | `/api/mis-psicologos-contacto` | auth |
| GET | `/api/mensajes/:destinatarioId` | auth |
| POST | `/api/enviar-mensaje` | auth |
| GET | `/api/mensajes-no-leidos` | auth |
| GET | `/api/mensajes-no-leidos-por-contacto` | auth |
| POST | `/api/chat/adjunto` | auth |
| GET | `/api/chat/archivo/:mensajeId` | auth |

### Opiniones y encuesta

| Método | Ruta | Auth |
|--------|------|------|
| GET | `/api/debo-opinar-psicologo` | auth |
| POST | `/api/dejar-opinion` | auth |
| GET | `/api/encuesta-satisfaccion/estado` | auth |
| POST | `/api/encuesta-satisfaccion` | auth |

### Panel psicólogo

| Método | Ruta | Auth |
|--------|------|------|
| GET | `/api/doctor/pacientes` | auth + `psicologo` |

### Panel admin

| Método | Ruta | Auth |
|--------|------|------|
| GET | `/api/admin/estadisticas` | auth + `admin` |
| GET | `/api/admin/citas` | auth + `admin` |
| GET | `/api/admin/psicologos` | auth + `admin` |
| PUT | `/api/admin/psicologos/:id/visibilidad` | auth + `admin` |
| GET | `/api/admin/cartera-psicologos` | auth + `admin` |
| GET | `/api/admin/pacientes` | auth + `admin` |
| GET | `/api/admin/config` | auth + `admin` |
| POST | `/api/admin/config` | auth + `admin` |
| GET | `/api/debug/recordatorios` | auth + `admin` |
| GET | `/api/admin/blog` | auth + `admin` |
| GET | `/api/admin/blog/:id` | auth + `admin` |
| POST | `/api/admin/blog` | auth + `admin` |
| PUT | `/api/admin/blog/:id` | auth + `admin` |
| DELETE | `/api/admin/blog/:id` | auth + `admin` |
| POST | `/api/admin/blog/upload-imagen` | auth + `admin` |
| GET | `/api/admin/blog/slug-sugerido` | auth + `admin` |

### Estáticos / misc

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/manifest.json` | PWA manifest |
| GET | `/favicon.ico` | Favicon |

---

## 5. Base de datos

### Tablas base (`railway_full_dump.sql`)

| Tabla | Descripción |
|-------|-------------|
| `usuarios` | Auth, roles, verificación email, reset password |
| `psicologos` | Perfil profesional, precios MXN/USD, visibilidad |
| `citas` | Agenda, estados, links sesión, notas |
| `mensajes` | Chat paciente ↔ psicólogo (cifrado opcional) |
| `opiniones` | Reseñas de psicólogos |
| `documentos_psicologo` | Documentos clínicos (texto/Word/PDF) |
| `horario_laboral` | Disponibilidad semanal |
| `vacaciones` | Bloqueos de fechas |
| `diplomados` | Academia / cursos |
| `encuestas_satisfaccion` | Encuesta post-login |
| `chat_notificacion_email` | Throttle emails de chat |

**Vista:** `vista_psicologos` (join `psicologos` + `usuarios`)

### Extensiones vía `migrations/` y docs

| Objeto | Origen | Campos / notas |
|--------|--------|----------------|
| `blog_articulos` | `create_blog_articulos.sql` | Blog con slug, SEO, HTML |
| `config_plataforma` | `config_plataforma_video_15min.sql` | Config key-value (ej. botón video 15 min) |
| `recordatorio_post_cita` | `docs/recordatorio_post_cita.sql` | Emails día 15/30/60 post-cita |
| `citas.zona_horaria` | `add_zona_horaria_citas_psicologos.sql` | IANA timezone |
| `citas.fecha_hora_utc` | `add_fecha_hora_utc_citas.sql` | Recordatorios precisos |
| `citas.stripe_payment_intent_id` | `add_stripe_payment_intent_id_citas.sql` | Reembolsos Stripe |
| `citas.motivo_de_consulta` | `docs/agregar_motivo_consulta_citas.sql` | Primera cita |
| `citas.origen_conocimiento`, `recomendado_por` | `add_origen_conocimiento_citas.sql` | Marketing |
| `citas.recordatorio_enviado_at` | `add_recordatorio_cita.sql` | Job 30 min |
| `psicologos.zona_horaria` | `add_zona_horaria_citas_psicologos.sql` | TZ del psicólogo |
| `psicologos.zona_horaria_actualizada_at` | `add_zona_horaria_actualizada_at_psicologos.sql` | Auto-detect IP |
| `psicologos.visible_mexico`, `visible_internacional` | `visible_mexico_internacional_psicologos.sql` | Catálogo por región |
| `psicologos.zoho_*` | `add_zoho_meeting_psicologos.sql` | Legacy links |
| `usuarios.contacto_emergencia` | `add_contacto_emergencia_usuarios.sql` | Perfil paciente |

### Roles

Valores en `usuarios.rol`: `paciente` | `psicologo` | `admin` (normalizado a minúsculas en login).

### Esquema consolidado (pendiente Fase 0)

Acción: unificar `railway_full_dump.sql` + todas las migraciones → un solo `schema.sql` versionado.

---

## 6. Integraciones y variables de entorno

### Servicios

| Servicio | Uso en la app |
|----------|---------------|
| **Stripe Connect** | Checkout Session + webhook crea cita tras pago |
| **Twilio** | WhatsApp: citas agendadas/reagendadas/canceladas, recordatorios |
| **Nodemailer / Zoho** | Emails transaccionales (fallback) |
| **Resend** | Emails transaccionales (preferido si `RESEND_API_KEY`) |
| **Daily.co** | Videollamadas |
| **Groq** | Chatbot del sitio |
| **AES-256-GCM** | Cifrado mensajes + notas clínicas (`MENSAJES_ENCRYPTION_KEY`) |
| **cron-job.org** | Dispara endpoints cron de Next (header `x-cron-secret`) |

### Variables de entorno (`.env.example` — completar en Fase 1)

```env
# ── App / sitio ──
BASE_URL=http://localhost:3000
PUBLIC_URL=http://localhost:3000
NODE_ENV=development

# ── Sesión (URGENTE: reemplaza secret hardcodeado en Express) ──
SESSION_SECRET=

# ── Supabase ──
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # opcional en fases iniciales (RLS off)
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=                      # connection string Postgres (pooler recomendado)

# ── Stripe Connect ──
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
# STRIPE_TEST_AMOUNT_MXN=1

# ── Email (Resend — preferido) ──
RESEND_API_KEY=
RESEND_FROM=

# ── Email (Nodemailer / Zoho — fallback) ──
EMAIL_HOST=smtp.zoho.com
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASS=

# ── WhatsApp (Twilio) ──
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
WHATSAPP_FROM=+525530776194

# ── Videollamadas (Daily.co) ──
DAILY_API_KEY=

# ── Jitsi legacy (fallback, opcional) ──
JAAS_APP_ID=
JAAS_KID=
JAAS_PRIVATE_KEY=

# ── Cifrado chat / notas clínicas ──
MENSAJES_ENCRYPTION_KEY=

# ── Chatbot (Groq) ──
GROQ_API_KEY=
CHAT_WHATSAPP_NUMBER=5215530776194

# ── Crons (cron-job.org) ──
CRON_SECRET=

# ── Legacy Express (solo desarrollo / transición) ──
LEGACY_PORT=3001
PORT=3000
```

---

## 7. Archivos y Storage

### Ubicaciones actuales

| Ubicación | Contenido | Rutas |
|-----------|-----------|-------|
| `uploads/documentos/{psicologoId}/` | Word/PDF psicólogo | `/api/documentos/*` |
| `uploads/chat/{userId}/` | PDF adjuntos chat | `/api/chat/adjunto`, `/api/chat/archivo/:id` |
| `public/uploads/blog/` | Imágenes blog admin | `/api/admin/blog/upload-imagen` |
| `/images/*` | Logos, hero, fotos, diplomados | HTML + columnas `imagen_url`, `url_imagen` |

`uploads/` está en `.gitignore`.

### Buckets Supabase Storage (decisión fija — 3 buckets)

| Bucket | Visibilidad | Uso |
|--------|-------------|-----|
| `blog-images` | Público | Portadas y contenido blog |
| `psychologist-docs` | Privado (signed URLs) | Documentos clínicos Word/PDF |
| `chat-attachments` | Privado | PDFs en mensajes |

Estáticos del sitio (`/images/*`): permanecen en `public/` de Next.js.

### Migración de archivos (Fase 6)

1. Inventariar `uploads/` y `/images/` en producción.
2. Subir a Storage con script.
3. Actualizar `ruta_archivo`, `ruta_adjunto`, `portada_url`, `imagen_url` en DB.
4. Mantener URLs compatibles vía rewrite/redirect donde sea posible.

---

## 8. Jobs en background

### Legacy (Express — `setInterval`, a reemplazar)

| Job | Frecuencia legacy | Función |
|-----|-------------------|---------|
| `ejecutarRecordatoriosCitas` | cada 5 min | Email + WhatsApp ~30 min antes; usa `fecha_hora_utc` |
| `ejecutarRecordatoriosPostCita` | cada 24 h | Emails re-agendar día 15/30/60 post última cita |
| `marcarCitasNoRealizadas` | on-demand en APIs | Marca `no realizada` tras 15 min gracia |
| `asegurarTablaBlogArticulos` | al arrancar | Crea/migra tabla blog |

### Destino (Next.js + cron-job.org)

| Endpoint | Schedule (cron-job.org) | Auth |
|----------|-------------------------|------|
| `GET/POST /api/cron/recordatorios-citas` | cada 5 min | header `x-cron-secret` |
| `GET/POST /api/cron/recordatorios-post-cita` | 1×/día (definir hora) | header `x-cron-secret` |

**Lógica recordatorio citas (fija):**

```sql
SELECT * FROM citas
WHERE fecha_hora_utc BETWEEN now() AND now() + interval '35 minutes'
  AND recordatorio_enviado_at IS NULL
  AND estado IN ('pendiente', 'confirmada');
-- → email + WhatsApp → UPDATE recordatorio_enviado_at = now()
```

- **NO** usar `setInterval` en Next/Vercel.
- **NO** usar Vercel Cron por ahora.
- Configurar jobs en [cron-job.org](https://cron-job.org) apuntando a la URL desplegada + header `x-cron-secret: ${CRON_SECRET}`.

---

## 9. Sesiones y auth

### Implementación legacy (Express — a migrar)

```javascript
// server.js — ⚠️ SECRET HARDCODEADO EN PROD
app.use(session({
    secret: 'mi-clave-secreta-psicologos',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

req.session.usuario = { id, nombre, email, rol };
```

### Implementación destino (Next.js — iron-session)

```typescript
// lib/session.ts — decisión fija
// SESSION_SECRET desde process.env
// cookie: { secure: true, sameSite: 'lax', httpOnly: true }
// session.usuario = { id, nombre, email, rol }
```

- **NO** Supabase Auth.
- Middleware Next equivalente a `authRequired` + checks de rol (`admin`, `psicologo`).
- Flujos custom sin cambios de negocio:
  - Registro → `token_verificacion` en `usuarios`
  - Login → bcrypt; admin exento de verificación email
  - Reset password → `token_reset_password`
  - Redirect post-login: admin → `/panel-admin`, psicologo → `/panel-doctor`, resto → `/perfil`

---

## 10. Plan por fases

> **Orden estricto.** Gate: no implementar fase N hasta decir **"adelante Fase N"**.

```
Fase 1 (Fundación) → Fase 2 (Público) → Fase 3 (Auth) → Fase 4 (Citas/Pagos)
→ Fase 5 (Paneles) → Fase 6 (Chat/Video/Storage) → Fase 7 (QA/Cutover) → Fase 8 (UI React)
```

| Fase | Alcance | Entregable |
|------|---------|------------|
| **1** | Bootstrap Next + Supabase + env + session secret | `app/`, `lib/supabase.ts`, `lib/session.ts`, `.env.example`, `next.config.ts` |
| **2** | Páginas públicas con paridad visual | index, catálogo, nosotros, contacto, blog, academia, términos, aviso, trabaja-con-nosotros |
| **3** | Auth y perfil paciente | login, registro, verificación email, reset password, `/perfil` |
| **4** | Citas y pagos | calendario, Stripe checkout, webhook, emails, WhatsApp, crons |
| **5** | Paneles | `panel-doctor`, `panel-admin` (Quill editor) |
| **6** | Chat, Storage, video | mensajes, buckets Supabase, Daily.co |
| **7** | QA + cutover | Paridad API, health, scripts QA/migración, checklist cutover (§11h) |
| **8** | UI React/TSX | 17 páginas TSX, Tailwind+shadcn, eliminar legacy HTML/Express (§11i) |

Legacy Express eliminado en **Fase 8**.

---

## 11. Entregables Fase 1

| Entregable | Estado |
|------------|--------|
| `app/layout.tsx` | ✅ |
| `app/page.tsx` | ✅ index (legacy bridge) |
| `app/globals.css` | ✅ |
| `next.config.ts` | ✅ rewrites dev: `/legacy/*`, `/api/*`, paneles → Express |
| `.env.example` | ✅ completo |
| `lib/supabase.ts` | ✅ service role |
| `lib/session.ts` | ✅ iron-session |
| `lib/db.ts` | ✅ pool `pg` |
| `server.js` → `SESSION_SECRET` | ✅ sin hardcode en prod |
| `package.json` → `dev:legacy` puerto 3001 | ✅ |

**Prioridad #1 completada:** `server.js` ya no usa `'mi-clave-secreta-psicologos'` en producción (exit si falta `SESSION_SECRET`).

### Desarrollo local (dos terminales)

```bash
# Terminal 1 — Next.js (puerto 3000)
npm run dev

# Terminal 2 — Express legacy (puerto 3001)
npm run dev:legacy
```

- Next: http://localhost:3000
- Legacy vía proxy: http://localhost:3000/legacy/
- Legacy directo: http://localhost:3001
- **En dev, levantar ambos** solo si necesitas comparar con Express vía `/legacy/*` (las APIs ya están en Next)

---

## 11b. Pasos manuales pendientes (bloqueantes para prod, no para desarrollo UI)

> Desarrollo continúa en sandbox; estos pasos se ejecutan **antes del cutover (Fase 7)** o cuando se necesite DB real en Next.

| # | Paso | Cuándo | Estado |
|---|------|--------|--------|
| 1 | Copiar `.env.example` → `.env` | Antes de probar auth/DB en Next | ⬜ pendiente |
| 2 | Generar `SESSION_SECRET` (`openssl rand -hex 32`) | Antes de deploy | ⬜ pendiente |
| 3 | Crear proyecto **Supabase sandbox** (separado de prod) | Antes de migrar APIs a Next | ⬜ pendiente |
| 4 | Importar schema: `railway_full_dump.sql` + `migrations/*.sql` | Tras crear Supabase | ⬜ pendiente |
| 5 | Completar `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Tras Supabase | ⬜ pendiente |
| 6 | Crear buckets Storage: `blog-images`, `psychologist-docs`, `chat-attachments` | Fase 6 (cutover) | ⬜ pendiente manual prod |
| 7 | Copiar assets `/images/*` y `uploads/` desde producción | Paridad visual completa | ⬜ pendiente |
| 8 | Configurar Stripe webhook sandbox apuntando a Next | Fase 4 | ⬜ pendiente |
| 9 | Configurar cron-job.org con `x-cron-secret` | Fase 4 | ⬜ pendiente |
| 10 | Variables en Vercel (Production / Preview) | Antes de deploy | ⬜ pendiente |

**Nota dev:** sin `.env` ni legacy corriendo, las páginas públicas se ven pero secciones dinámicas (equipo, catálogo, blog, diplomados) quedan vacías o fallan fetch silenciosamente.

---

## 11c. Entregables Fase 2

| Entregable | Estado |
|------------|--------|
| `/` (index) | ✅ |
| `/catalogo` | ✅ |
| `/nosotros` | ✅ |
| `/contacto` | ✅ |
| `/blog`, `/blog/[slug]` | ✅ |
| `/academia` | ✅ |
| `/terminos-condiciones` | ✅ |
| `/aviso-privacidad` | ✅ |
| `/trabaja-con-nosotros` | ✅ |
| `lib/legacy-view.ts` | ✅ lee `views/*.html` en build/runtime servidor |
| `components/legacy/LegacyPageClient.tsx` | ✅ monta HTML + scripts |
| `next.config.ts` rewrites `/api/*` en dev | ✅ |
| Estilos globales (`estilos.css`, chat, i18n, PWA) | ✅ en `app/layout.tsx` |

**Estrategia Fase 2:** puente HTML legacy → React (paridad visual inmediata). Refactor a componentes React nativos es opcional y puede hacerse página a página en fases posteriores.

### Pendiente post-Fase 2 (Fase 3+)

- [x] Migrar `/login`, `/registro`, `/perfil` (auth) — **Fase 3**
- [ ] Migrar APIs restantes de `/api/*` a route handlers Next (Fases 4–6)
- [ ] Pasos manuales sección 11b

---

## 11d. Entregables Fase 3

| Entregable | Estado |
|------------|--------|
| `lib/session.ts` — `setSessionUsuario`, `updateSessionNombre`, `destroySession` | ✅ |
| `lib/config.ts`, `lib/email.ts`, `lib/crypto/messages.ts` | ✅ |
| `lib/auth/api.ts`, `lib/auth/service.ts` | ✅ |
| `middleware.ts` — protege `/perfil/:path*` | ✅ |
| `/login`, `/registro`, `/registro-exitoso`, `/reestablecer-password`, `/perfil` | ✅ (puente legacy HTML) |
| `/auth/login`, `/auth/olvide-password`, `/auth/update-password-forgotten` | ✅ |
| `/registrar-usuario`, `/verificar-email`, `/reenviar-verificacion`, `/logout` | ✅ |
| APIs perfil (iron-session): `estado-sesion`, `user-data`, `quien-soy`, `update-profile` | ✅ |
| APIs perfil: `mis-citas-paciente`, encuesta, opiniones, mensajes-no-leidos, contactos | ✅ |
| `next.config.ts` — auth/registro en Next; rewrites dev solo paneles + APIs no migradas | ✅ |
| `npm run build` | ✅ |

**Flujos portados:** registro (bcrypt + token verificación), login (redirect por rol), verificar-email, reenviar-verificación, olvidé-password, reset password, logout.

**Redirect post-login:** admin → `/panel-admin`, psicólogo → `/panel-doctor` (legacy, Fase 5), paciente → `/perfil`.

### Limitaciones Fase 3 (esperadas)

El HTML de `/perfil` sigue siendo legacy y llama a muchas APIs. Las **migradas a Next** funcionan con iron-session. Las **aún en Express** no comparten sesión con Next y fallarán hasta Fases 4–6:

| Área | APIs / rutas aún en legacy | Fase prevista |
|------|---------------------------|---------------|
| Calendario / citas nuevas | `/api/disponibilidad-calendario`, `crear-sesion-pago`, etc. | ~~4~~ ✅ Fase 4 |
| Pagos Stripe | checkout, webhook | ~~4~~ ✅ Fase 4 |
| Video Daily.co | sala, tokens | 6 |
| Chat | mensajes, adjuntos | 6 |
| Paneles | `/panel-admin`, `/panel-doctor` | ~~5~~ ✅ Fase 5 |

**Dev local Fase 3:** además de los dos servidores de Fase 2, configurar `DATABASE_URL` + `SESSION_SECRET` en `.env` para probar auth y perfil básico. Sin DB, auth responde 503 / HTML informativo.

**Nota:** en dev, `/panel-admin` y `/panel-doctor` se proxean a Express (`:3001`); el login Next redirige ahí pero la sesión legacy **no** se comparte con iron-session — login admin/psicólogo en Next crea sesión Next; el panel legacy requerirá re-login o migración en Fase 5.

---

## 11e. Entregables Fase 4

| Entregable | Estado |
|------------|--------|
| `lib/geo.ts` — IP cliente, precio por región | ✅ |
| `lib/stripe.ts`, `lib/whatsapp.ts` | ✅ |
| `lib/citas/*` — disponibilidad, pricing, emails, service, recordatorios | ✅ |
| `lib/cron/auth.ts` — header `x-cron-secret` | ✅ |
| GET `/api/disponibilidad-calendario/[psicologoId]` | ✅ |
| GET `/api/horarios-disponibles/[psicologoId]` | ✅ |
| GET `/api/precio-region`, GET `/api/soy-paciente-nuevo` | ✅ |
| POST `/api/crear-sesion-pago` (Stripe Checkout) | ✅ |
| POST `/api/agendar-cita`, `/api/reagendar-cita`, `/api/cancelar-cita` | ✅ |
| POST `/api/webhook/stripe` (`runtime: nodejs`, body raw) | ✅ |
| GET/POST `/api/cron/recordatorios-citas` | ✅ |
| GET/POST `/api/cron/recordatorios-post-cita` | ✅ |
| Emails + WhatsApp en agendar/reagendar/cancelar/recordatorio | ✅ |
| Reembolso Stripe al cancelar (≥36 h) | ✅ |
| `npm run build` — 45 rutas | ✅ |

**Webhook Stripe (cutover):** configurar en Stripe Dashboard la URL `https://<dominio>/api/webhook/stripe` (ya no `/webhook/stripe` legacy). Evento: `checkout.session.completed`.

**Crons (cron-job.org):**

| URL | Frecuencia | Header |
|-----|------------|--------|
| `/api/cron/recordatorios-citas` | cada 5 min | `x-cron-secret: ${CRON_SECRET}` |
| `/api/cron/recordatorios-post-cita` | 1×/día | `x-cron-secret: ${CRON_SECRET}` |

**Pendiente post-Fase 4:** video Daily.co, chat, paneles admin/doctor (Fases 5–6). Catálogo/blog/diplomados siguen en proxy legacy en dev.

**Variables requeridas para Fase 4:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CRON_SECRET`, email (`RESEND_API_KEY` o SMTP), Twilio opcional para WhatsApp.

---

## 11f. Entregables Fase 5

| Entregable | Estado |
|------------|--------|
| `/panel-admin`, `/panel-doctor` (puente legacy HTML) | ✅ |
| `middleware.ts` — protege paneles por rol (`admin` / `psicologo`) | ✅ |
| `lib/auth/api.ts` — `requireAdmin`, `requirePsicologo`, `requirePsicologoId` | ✅ |
| APIs admin: config, estadísticas, citas, psicólogos, visibilidad, cartera, pacientes | ✅ |
| APIs admin blog: CRUD, slug-sugerido, upload-imagen (Quill) | ✅ |
| APIs doctor: pacientes, horario-laboral, vacaciones, documentos, zona horaria | ✅ |
| APIs doctor: mis-citas-doctor, notas por cita, registrar-entrada | ✅ |
| Chat/video panel-doctor: daily-meeting, mensajes, adjuntos PDF | ✅ |
| `next.config.ts` — sin rewrites de paneles a legacy | ✅ |
| `npm run build` — 69 rutas | ✅ |

**Login admin/psicólogo** redirige a paneles en Next con **iron-session** compartida con todas las APIs del panel.

**Storage local (sandbox):** documentos en `uploads/documentos/`, chat en `uploads/chat/`, imágenes blog en `public/uploads/blog/`. Con Supabase configurado, `lib/storage` usa buckets automáticamente (Fase 6 ✅).

**Pendiente post-Fase 5:** ~~APIs públicas en proxy legacy~~ — migradas en Fase 6.

---

## 11g. Entregables Fase 6

| Entregable | Estado |
|------------|--------|
| `lib/storage/` — `storageUpload`, `storageRead`, `storageSignedUrl`, `storageResolvePublicUrl` | ✅ |
| Buckets: `blog-images`, `psychologist-docs`, `chat-attachments` (Supabase o disco local) | ✅ |
| `lib/public/forms.ts` — escape HTML formularios | ✅ |
| `lib/chat/groq.ts` — chatbot Redi (Groq) | ✅ |
| GET `/api/psicologos`, `/api/psicologo/[id]` | ✅ |
| GET `/api/blog-articulos`, `/api/diplomados`, `/api/testimonios-encuesta` | ✅ |
| POST `/api/contacto`, `/api/aplicacion-trabajo` | ✅ |
| POST `/api/chat` (Groq; distinto de `/api/chat/adjunto`) | ✅ |
| GET `/api/debug/recordatorios` (solo admin) | ✅ |
| Uploads integrados con Storage: blog, documentos psicólogo, adjuntos chat | ✅ |
| `next.config.ts` — solo rewrite `/legacy/*` en dev (sin proxy `/api/*`) | ✅ |
| `npm run build` — 77 rutas | ✅ |

**Referencias en DB:**

| Tipo | Campo | Valor local (sandbox) | Valor Supabase |
|------|-------|----------------------|----------------|
| Blog | URL en Quill | `/uploads/blog/...` | URL pública del bucket |
| Documentos | `ruta_archivo` | `documentos/{psicologoId}/...` | `sb://psychologist-docs/...` |
| Chat PDF | `ruta_adjunto` | `chat/{remitenteId}/...` | `sb://chat-attachments/...` |

**Pasos manuales Supabase (cutover):**

1. Crear proyecto Supabase y buckets `blog-images` (público), `psychologist-docs` y `chat-attachments` (privados).
2. Añadir en Vercel: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
3. Ejecutar inventario + script de migración de archivos locales → Storage (§7).
4. Actualizar filas en DB con refs `sb://bucket/key` donde corresponda.

**Dev local:** sin Supabase, los archivos se guardan en `public/uploads/blog/`, `uploads/documentos/` y `uploads/chat/`. Express legacy sigue disponible en `:3001` vía `/legacy/*` hasta Fase 7.

**Pendiente post-Fase 6:** ~~QA integral, cutover DNS, migración delta datos, apagar Express~~ — entregables sandbox en Fase 7 (§11h).

---

## 11h. Entregables Fase 7

| Entregable | Estado |
|------------|--------|
| Paridad API legacy ↔ Next (`npm run check-api-parity`) | ✅ 77/77 rutas `/api/*` |
| Rutas faltantes portadas: `jaas-config`, `jaas-jwt`, `borrar-fecha-especifica` | ✅ |
| GET `/api/health` — readiness (DB, session, Stripe, cron, Storage) | ✅ |
| `scripts/smoke-test.mjs` — smoke test endpoints públicos | ✅ |
| `scripts/migrate-storage.mjs` — migración archivos locales → Supabase | ✅ |
| `scripts/check-api-parity.mjs` — auditoría rutas | ✅ |
| `npm run build` — 80 rutas | ✅ |

### QA manual (checklist pre-cutover)

| Área | Prueba | Estado |
|------|--------|--------|
| Público | Catálogo, blog, academia, contacto cargan datos | ⬜ |
| Auth | Registro, login, verificación email, reset password | ⬜ |
| Paciente | Perfil, agendar cita, pagar (Stripe test), cancelar/reagendar | ⬜ |
| Video | Daily.co desde perfil y panel-doctor | ⬜ |
| Chat | Mensajes + adjunto PDF entre paciente y psicólogo | ⬜ |
| Doctor | Horario, vacaciones, documentos, notas de cita | ⬜ |
| Admin | Estadísticas, citas, psicólogos, blog Quill + upload imagen | ⬜ |
| Crons | `recordatorios-citas` y `recordatorios-post-cita` con `x-cron-secret` | ⬜ |
| Webhook | Stripe `checkout.session.completed` → cita creada | ⬜ |

### Comandos útiles

```bash
# Paridad rutas (debe salir 0)
npm run check-api-parity

# Smoke test (servidor corriendo en :3000)
npm run smoke-test

# Migración archivos → Supabase (dry-run primero)
npm run migrate-storage:dry-run
npm run migrate-storage
```

### Cutover producción (§14 — ejecutar solo con "listo para producción")

Los pasos de DNS, Vercel env, Stripe webhook, cron-job.org, migración delta DB y apagar Railway **no se ejecutan desde el sandbox**. Ver [§14 Cutover](#14-cutover-solo-cuando-se-apruebe).

**Post-cutover:** Express legacy eliminado; solo Next.js en producción y desarrollo.

---

## 11i. Entregables Fase 8 — UI React/TSX (sin legacy)

| Entregable | Estado |
|------------|--------|
| Tailwind v4 + shadcn/ui + tokens marca (`app/globals.css`) | ✅ |
| `SiteHeader`, `SiteFooter`, `PublicLayout`, `AuthLayout`, `DashboardShell` | ✅ |
| `RediWidget` React (reemplaza `chat-widget.js`) | ✅ |
| 9 páginas públicas TSX (index, catálogo, blog, academia, contacto, nosotros, legales, trabaja) | ✅ |
| 4 páginas auth TSX (login, registro, reestablecer-password, registro-exitoso) | ✅ |
| 3 paneles TSX (`/perfil`, `/panel-doctor`, `/panel-admin`) | ✅ |
| `npm run build` | ✅ |
| Eliminado: `views/`, `components/legacy/`, `lib/legacy-view.ts`, `server.js`, `db.js` | ✅ |
| Eliminado: `estilos.css`, `chat-widget.js/css`, `i18n.js`, rewrites `/legacy/*` | ✅ |
| `next-intl` + `messages/es.json`, `messages/en.json` | ✅ |
| Rutas bajo `app/[locale]/` con `localePrefix: as-needed` | ✅ |
| `LanguageSwitcher` en header | ✅ |

### Checklist por página (Fase 8)

| Ruta | Componente | Legacy eliminado |
|------|------------|------------------|
| `/` | `HomePage` | ✅ |
| `/catalogo` | `CatalogoClient` | ✅ |
| `/blog`, `/blog/[slug]` | `BlogList`, `BlogArticle` | ✅ |
| `/academia` | `AcademiaGrid` | ✅ |
| `/contacto` | `ContactoForm` | ✅ |
| `/nosotros` | `PublicLayout` + contenido | ✅ |
| `/trabaja-con-nosotros` | `TrabajaForm` | ✅ |
| `/aviso-privacidad`, `/terminos-condiciones` | `LegalDocument` | ✅ |
| `/registro-exitoso` | estática TSX | ✅ |
| `/login`, `/registro`, `/reestablecer-password` | forms React + zod | ✅ |
| `/perfil` | `PerfilApp` | ✅ |
| `/panel-doctor` | `PanelDoctorApp` | ✅ |
| `/panel-admin` | `PanelAdminApp` | ✅ |

### Pendiente post-Fase 8 (mejoras incrementales)

- [x] Paridad funcional paneles: video Daily.co, reagendar, chat PDF, notas clínicas, horario/vacaciones/documentos doctor, Tiptap blog CMS admin
- [x] Auth forms con zod + react-hook-form
- [x] Paridad sitio público: home wizard encuesta, testimonios, FAQ; catálogo con calendario y filtros; nosotros carrusel
- [x] i18n ES/EN con `next-intl` (`/en/*`, selector ES/EN en header)
- [ ] QA manual checklist §11h en staging

---

## 12. Reglas de trabajo

1. **No escribir código de una fase** sin **"adelante Fase X"**.
2. **No tocar producción** ni el repo original — solo este sandbox.
3. Si algo se desvía de las [decisiones fijas](#0-decisiones-arquitectónicas-fijas), **avisar explícitamente** antes de implementar.
4. Mantener **`MIGRATION.md`** actualizado con cada decisión.
5. Si hay ambigüedad en código legacy, **preguntar** antes de asumir.
6. Legacy Express **eliminado** en Fase 8; solo `npm run dev` (Next :3000).
7. **No commits** salvo petición explícita del owner.

---

## 13. Riesgos principales

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Session secret hardcodeado | Sesiones falsificables en prod | **Fase 1 prioridad #1:** `SESSION_SECRET` en env |
| Stripe webhook | Citas pagadas sin crear cita | Body raw, tests CLI, idempotencia |
| Crons | Sin recordatorios 30 min | cron-job.org + `x-cron-secret`; no `setInterval` |
| Archivos locales | Links rotos post-migración | Inventario prod + buckets Storage (Fase 6) |
| Zona horaria | Recordatorios incorrectos | `fecha_hora_utc`; query fija en cron |
| Cifrado mensajes | Datos ilegibles | Misma `MENSAJES_ENCRYPTION_KEY` en Vercel |
| Paneles monolíticos | Fases 5–6 largas | Migrar por sección |
| Assets `/images` | UI rota en sandbox | Copiar desde prod antes de Fase 2 |
| 103 rutas de golpe | Regresiones | Fases incrementales; legacy paralelo hasta Fase 7 |

---

## 14. Cutover (solo cuando se apruebe)

Checklist documental — **no ejecutar hasta "listo para producción"**:

- [ ] DNS → Vercel
- [ ] Variables env producción en Vercel
- [ ] Stripe: cambiar URL webhook a dominio prod
- [ ] Configurar cron-job.org apuntando a endpoints `/api/cron/*` en dominio prod
- [ ] Twilio/WhatsApp: verificar `BASE_URL` en mensajes
- [ ] Migración delta de datos (último dump → Supabase prod)
- [ ] Migración archivos `uploads/` → Storage prod
- [ ] Smoke test E2E en prod (login, agendar, pagar, video, chat)
- [ ] Ventana de mantenimiento comunicada
- [ ] Rollback plan: Railway Express activo N días con DNS revertible
- [ ] Apagar Express/Railway tras validación

---

## Historial

| Fecha | Notas |
|-------|-------|
| 2026-06-01 | Documento inicial — inventario sandbox y plan Fase 0 |
| 2026-06-01 | **Fase 2 completada:** 9 páginas públicas via puente legacy HTML; rewrites `/api/*` en dev; sección pasos manuales pendientes (11b). |
| 2026-06-01 | **Fase 3 completada:** auth iron-session, perfil paciente, middleware, APIs perfil básicas; build OK; limitaciones chat/video/pagos documentadas (§11d). |
| 2026-06-01 | **Fase 4 completada:** calendario, Stripe checkout/webhook, agendar/reagendar/cancelar, crons recordatorios, emails/WhatsApp; webhook en `/api/webhook/stripe` (§11e). |
| 2026-06-01 | **Fase 5 completada:** paneles admin/doctor en Next, middleware por rol, 32+ APIs paneles/chat/video; build 69 rutas (§11f). |
| 2026-06-01 | **Fase 6 completada:** APIs públicas, Storage integrado, 77 rutas; proxy `/api/*` eliminado en dev (§11g). |
| 2026-06-17 | **i18n completado:** next-intl ES/EN, rutas `[locale]`, traducciones nav/home/catálogo/auth. |

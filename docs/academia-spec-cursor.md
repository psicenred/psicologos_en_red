# Spec técnico: Módulo Academia — Psicólogos en Red

Documento de referencia para el desarrollo del módulo Academia en la rama `feature/academia`.

## Alcance Fase 1 (implementado en código)

- Auth Supabase (`auth.users`) con registro/login en `/academia/login`
- Perfiles `course_student_profiles` / `course_instructor_profiles` / `course_admin_profiles`
- CRUD de cursos (admin) + catálogo público `/academia`
- Inscripción + pago único Stripe (cursos async)
- Módulos/lecciones + tracking de progreso
- Panel básico de alumno (`/cursos/alumno`)

## Alcance Fase 2 (implementado en código)

- Cohortes para cursos **síncronos** (`course_cohorts`)
- Sesiones en vivo con **Daily.co** (`course_live_sessions`) + asistencia (`course_attendance`)
- Inscripción sync con selección de cohorte y plan **pago completo** o **mensualidades**
- Pagos mensuales programados + API para pagar cuotas pendientes
- Cron de pagos vencidos (5 días de gracia → `payment_overdue`)
- Panel admin: gestión de cohortes en `/cursos/admin/[courseId]`
- Panel alumno: calendario de sesiones + botón Unirse (Daily iframe)
- Panel instructor: listado de sesiones + iniciar clase como anfitrión

## Alcance Fase 3 (implementado en código)

- **Exámenes**: opción múltiple + desarrollo, auto-calificación MC, liberación de nota por instructor
- **Tareas**: entregas con URL, penalización por tardanza configurable
- **Calificación final ponderada** (`course_final_grades`) según `weight_pct` de exámenes y tareas
- **Panel instructor**: 5 métricas (pendientes, promedio, asistencia, riesgo abandono, % avance)
- **Panel alumno**: tomar exámenes, entregar tareas, ver calificación final liberada

## Alcance Fase 4 (implementado en código)

- **Certificados PDF** al cumplir calificación ≥70 y curso completo (`course_certificates`)
- Verificación pública por código (`GET .../certificates/course/[id]?verify=PER-...`)
- **Reporte de ingresos** del instructor (% `revenue_share_pct` sobre pagos `paid`)
- **Grabaciones** de sesiones en vivo: sync automático desde Daily.co + enlace manual del instructor

## Setup requerido — migraciones SQL

Ejecutar en **Supabase SQL Editor**, en este orden:

| # | Archivo | Contenido |
|---|---------|-----------|
| 1 | `migrations/add_course_academia_phase1.sql` | Perfiles, cursos, lecciones, inscripciones |
| 2 | `migrations/add_course_admin_profiles.sql` | Rol admin academia |
| 3 | `migrations/add_course_academia_phase2.sql` | Cohortes, sesiones Daily, asistencia |
| 4 | `migrations/add_course_academia_phase3.sql` | Exámenes, tareas, calificación final |
| 5 | `migrations/add_course_academia_phase4.sql` | Certificados |

> Si aún no corriste las fases 2–4, puedes ejecutar los archivos 3, 4 y 5 en una sola sesión (en orden), después de 1 y 2.

## Setup requerido — variables y servicios
2. Habilitar **Supabase Auth** (Email) en el proyecto
3. Configurar `NEXT_PUBLIC_SUPABASE_ANON_KEY` en Vercel y `.env`
4. Stripe: webhook → `POST /api/academia/webhook/stripe`  
   Variable: `STRIPE_ACADEMIA_WEBHOOK_SECRET` (o reutilizar `STRIPE_WEBHOOK_SECRET`)
5. Daily.co: `DAILY_API_KEY` para crear salas y tokens de reunión
   - Opcional: `DAILY_COURSE_RECORDING=true` para grabación en la nube al crear salas
6. Cron pagos vencidos (Vercel Cron o similar):
   - `GET` o `POST` `/api/cron/academia-payments-overdue`
   - Header: `x-cron-secret: <CRON_SECRET>` (misma variable que otros crons del proyecto)
7. Cron grabaciones (opcional, cada hora o tras cada clase):
   - `GET` o `POST` `/api/cron/academia-sync-recordings`
   - Header: `x-cron-secret: <CRON_SECRET>`

## Rutas

| Ruta | Descripción |
|------|-------------|
| `/academia` | Catálogo público + diplomados legacy |
| `/academia/[course-slug]` | Detalle del curso + inscripción (async o sync) |
| `/academia/login` | Login/registro academia |
| `/cursos` | Redirige a alumno, instructor o admin |
| `/cursos/alumno` | Mis cursos, progreso y mensualidades |
| `/cursos/alumno/[courseId]` | Contenido + sesiones en vivo |
| `/cursos/instructor` | Lista de cursos del instructor |
| `/cursos/instructor/[courseId]` | Contenido + sesiones en vivo |
| `/cursos/admin` | Panel admin: cursos |
| `/cursos/admin/[courseId]` | Editar curso + cohortes (sync) |

## APIs Fase 2

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/academia/cohorts/by-slug/[slug]` | Cohortes abiertas para inscripción |
| GET/POST | `/api/academia/admin/cohorts/[courseId]` | Listar/crear cohortes (admin) |
| GET | `/api/academia/live-sessions/course/[courseId]` | Sesiones del alumno |
| GET | `/api/academia/live-sessions/instructor/course/[courseId]` | Sesiones del instructor |
| POST | `/api/academia/live-sessions/[sessionId]/join` | Token Daily + asistencia |
| POST | `/api/academia/checkout/payment` | Pagar cuota mensual pendiente |
| GET/POST | `/api/cron/academia-payments-overdue` | Marcar vencidos y pausar acceso |

## APIs Fase 3

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET/POST | `/api/academia/exams` | Listar / crear exámenes y preguntas |
| GET | `/api/academia/exams/[examId]` | Detalle del examen |
| GET/POST | `/api/academia/exams/[examId]/submit` | Ver/enviar entrega alumno |
| GET | `/api/academia/exams/[examId]/submissions` | Entregas (instructor) |
| GET/POST | `/api/academia/exams/submissions/[submissionId]` | Calificar / liberar |
| GET/POST | `/api/academia/assignments` | Listar / crear / entregar tareas |
| GET | `/api/academia/assignments/[assignmentId]` | Entrega del alumno |
| GET | `/api/academia/assignments/[assignmentId]/submissions` | Entregas (instructor) |
| POST | `/api/academia/assignments/submissions/[submissionId]` | Calificar tarea |
| GET | `/api/academia/grades/course/[courseId]` | Calificación final o métricas instructor |

## APIs Fase 4

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/academia/certificates/course/[courseId]` | Elegibilidad o descarga PDF (`?download=1`) |
| GET | `/api/academia/certificates/course/[courseId]?verify=CODE` | Verificar certificado (público) |
| GET | `/api/academia/instructor/revenue` | Reporte de ingresos del instructor |
| POST | `/api/academia/live-sessions/[sessionId]/recording` | Instructor: pegar URL de grabación |
| GET/POST | `/api/cron/academia-sync-recordings` | Sincronizar grabaciones desde Daily.co |

## Módulo completo

Con las fases 1–4 el módulo Academia cubre: catálogo, inscripción, cohortes síncronas, pagos mensuales, sesiones en vivo, exámenes, tareas, calificación, certificados e ingresos.

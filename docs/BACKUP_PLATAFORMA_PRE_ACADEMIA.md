# Copia de seguridad — plataforma antes de Academia

Punto de restauración creado **antes** de la expansión grande de la sección Academia.  
Sirve para volver al código de la plataforma de psicólogos tal como estaba en ese momento.

---

## Datos del respaldo

| Campo | Valor |
|-------|--------|
| **Fecha** | 2026-07-01 |
| **Commit** | `f5447b1` |
| **Mensaje del commit** | Corregir filtro de Ayúdame a elegir y avanzar worker WhatsApp. |
| **Rama de backup** | `backup/plataforma-pre-academia-2026-07-01` |
| **Tag** | `backup/plataforma-pre-academia-2026-07-01` |
| **Repositorio** | https://github.com/psicenred/psicologos_en_red |

**Qué incluye este snapshot:** catálogo, citas, pagos Stripe, perfiles paciente/psicólogo, chat, referidos, recordatorios, worker WhatsApp (Baileys), videollamadas Daily, panel admin, academia en su versión **actual** (antes de los cambios grandes).

---

## Antes de restaurar

1. **Guarda o commitea** lo que tengas en curso si no quieres perderlo:
   ```bash
   git status
   git stash push -m "WIP antes de restaurar backup"
   ```
2. **Avisa al equipo** si alguien más está desplegando en `main`.
3. Restaurar código **no revierte** la base de datos ni variables en Vercel/Railway; solo el código del repo.

---

## Opción A — Solo revisar el código antiguo (sin cambiar `main`)

Útil para comparar o copiar archivos. No modifica tu rama actual de trabajo.

```bash
cd /Users/balam/Documents/Psic_en_red_next
git fetch origin
git checkout backup/plataforma-pre-academia-2026-07-01
```

Para volver a seguir trabajando en `main`:

```bash
git checkout main
```

---

## Opción B — Nueva rama desde el backup (recomendado)

Creas una rama de trabajo a partir del snapshot **sin tocar** `main`.

```bash
cd /Users/balam/Documents/Psic_en_red_next
git fetch origin
git checkout -b recuperacion-desde-backup backup/plataforma-pre-academia-2026-07-01
```

Trabaja ahí, prueba, y luego decide si haces merge a `main` o un deploy desde esa rama.

---

## Opción C — Dejar `main` exactamente como el backup

Usa esto solo si quieres **descartar** todos los commits de `main` posteriores al backup.

```bash
cd /Users/balam/Documents/Psic_en_red_next
git fetch origin
git checkout main
git reset --hard backup/plataforma-pre-academia-2026-07-01
```

Si `main` ya estaba en GitHub con commits más nuevos, para publicar el retroceso:

```bash
git push --force-with-lease origin main
```

**Cuidado:** `--force-with-lease` reescribe el historial remoto de `main`. Hazlo solo si estás seguro.

---

## Opción D — Restaurar desde GitHub (sin tener el repo local)

1. Abre: https://github.com/psicenred/psicologos_en_red/tree/backup/plataforma-pre-academia-2026-07-01  
2. **Code → Download ZIP** (copia estática), **o**
3. Crear una rama nueva en GitHub desde esa rama/tag y abrir un PR hacia `main`.

---

## Después de restaurar código en `main`

1. **Vercel** — redeploy de `main` (Deployments → Redeploy).
2. **Railway** — el worker `whatsapp-worker` no cambia solo; redeploy si tocaste su código.
3. **Supabase** — si aplicaste migraciones nuevas después del backup, la DB puede no coincidir con el código viejo. En ese caso:
   - o reviertes migraciones a mano,
   - o restauras un dump de DB de la misma fecha (si tienes uno).

---

## Comandos rápidos de comprobación

Ver que estás en el commit correcto:

```bash
git rev-parse --short HEAD
# Debe mostrar: f5447b1
```

Ver ramas y tag de backup:

```bash
git branch -a | grep backup/plataforma-pre-academia
git tag -l 'backup/plataforma-pre-academia-*'
```

---

## Resumen en una frase

| Objetivo | Comando clave |
|----------|----------------|
| Mirar el código viejo | `git checkout backup/plataforma-pre-academia-2026-07-01` |
| Trabajar desde el backup | `git checkout -b mi-rama backup/plataforma-pre-academia-2026-07-01` |
| Resetear `main` al backup | `git checkout main && git reset --hard backup/plataforma-pre-academia-2026-07-01` |

---

*Creado: 2026-07-01. Si haces un nuevo backup antes de otro cambio grande, duplica este archivo con una fecha nueva.*

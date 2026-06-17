# Troubleshooting: correos de recordatorio (30 min antes)

## Cómo funciona el envío

- **Job:** cada **5 minutos** se ejecuta `ejecutarRecordatoriosCitas()`.
- **Condición:** se envían recordatorios para citas que:
  - Están en estado `pendiente` o `confirmada`
  - No tienen `recordatorio_enviado_at` (aún no se envió)
  - Tienen **`citas.fecha_hora_utc`** no nulo (se rellena al agendar/reagendar)
  - `fecha_hora_utc` está entre **25 y 35 minutos en el futuro** respecto a `NOW()` (UTC en Railway).

El job usa **solo** la columna `fecha_hora_utc` (instante UTC de la cita). Esa columna se calcula al crear o reagendar la cita a partir de `fecha` + `hora` en la zona del psicólogo. Si la columna no existe, el job hace fallback a `(fecha + hora) AT TIME ZONE zona_horaria`.

---

## Paso 1: Endpoint de diagnóstico (solo admin)

Con la sesión iniciada como **administrador**, abre en el navegador:

```
https://tu-dominio.com/api/debug/recordatorios
```

(o `http://localhost:3000/api/debug/recordatorios` en local)

La respuesta incluye:

- **servidor_utc_iso:** hora actual del servidor en UTC (ISO).
- **usa_fecha_hora_utc:** si el endpoint y el job usan la columna `fecha_hora_utc`.
- **citas_pendientes_sin_recordatorio:** todas las citas pendientes/confirmadas sin recordatorio, con:
  - `fecha`, `hora`, `zona_horaria`, **`fecha_hora_utc`** (ISO en UTC)
  - `minutos_desde_ahora`: minutos entre “ahora” y la cita (positivo = futura)
  - `dispararia_ahora`: `true` si la cita está en la ventana 25–35 min
- **candidatas_futuras_log:** citas que aparecerían en el log del job (futuras, con `fecha_hora_utc` no nulo).
- **citas_que_dispararian_ahora:** las que dispararían el envío en esta ejecución.

**Qué revisar:**

1. **Hora del servidor:** `servidor_utc_iso` debe ser coherente con la hora real en UTC (ej. compárala con [time.is/UTC](https://time.is/UTC)).
2. **Zona de cada cita:** en `citas_pendientes_sin_recordatorio`, cada fila debe tener la `zona_horaria` correcta (ej. `America/Mexico_City`). Si ves `(null)` o `(columna no existe)`, hay que asegurar la columna y/o el valor.
3. **Ventana 25–35 min:** para una cita a las 11:00 en Mexico (16:00 UTC en invierno), el recordatorio debe dispararse cuando `minutos_desde_ahora` esté entre 25 y 35. Si `minutos_desde_ahora` está bien pero el correo no llega, el fallo puede estar en el envío (SMTP, cola, etc.).
4. Si **no existe** la columna `citas.zona_horaria`:** la respuesta usará `cita_sin_tz` y la comparación en el job se hace en hora del servidor (UTC), por lo que las citas guardadas en hora México se interpretarían mal; hay que tener la columna y datos correctos.

---

## Paso 2: Logs del job en Railway

En **Railway → tu proyecto → Logs**, cada vez que el job encuentra citas para recordatorio verás líneas como:

```
[Recordatorios] 2026-02-20T22:30:00.000Z fecha_hora_utc= true → citas a enviar= 1 ids= [ 123 ]
```

- **fecha_hora_utc=true** → el job usa la columna `citas.fecha_hora_utc` (correcto).
- **fecha_hora_utc=false** → fallback a `(fecha + hora) AT TIME ZONE zona_horaria` (columna aún no existe).
- **candidatas (fecha_hora_utc):** id X en Y min → citas futuras con `fecha_hora_utc` que aún no están en la ventana 25–35 min.
- Si aparece **"hay N citas sin fecha_hora_utc"** → esas citas no entran al recordatorio hasta que tengan la columna rellenada (agendar nueva o migración de backfill).

Si no ves “citas a enviar”, revisa el endpoint del paso 1 y que las citas tengan `fecha_hora_utc` no nulo.

---

## Paso 3: Checklist rápido

| Revisión | Acción |
|----------|--------|
| Columna `citas.fecha_hora_utc` existe | En Railway (solo text/integer): crear a mano con **Name** `fecha_hora_utc`, **Type** `text`, **Default** (vacío o null), **Constraint** (ninguno). O ejecutar la migración si tu BD acepta `ADD COLUMN fecha_hora_utc TEXT DEFAULT NULL`. El job usa esta columna (en consultas se hace `::timestamptz` para comparar con NOW()). |
| Citas sin `fecha_hora_utc` | Citas antiguas: la migración hace backfill. Citas nuevas se rellenan al agendar/reagendar. Si una cita tiene `fecha_hora_utc` NULL no entra en candidatas (el log puede mostrar “hay N citas sin fecha_hora_utc”). |
| Columna `citas.zona_horaria` | Se sigue guardando para el horario “original”; el recordatorio ya no depende de ella (usa `fecha_hora_utc`). |
| Hora del servidor (Railway) | Es UTC. `fecha_hora_utc` está en UTC; la comparación con `NOW()` es directa. |
| Ventana 25–35 min | El job corre cada 5 min. Revisa `minutos_desde_ahora` y `fecha_hora_utc` en `/api/debug/recordatorios`. |

---

## Resumen

1. Ejecuta la migración **`add_fecha_hora_utc_citas.sql`** si aún no existe la columna.
2. Entra como **admin** y abre **GET /api/debug/recordatorios**; revisa **usa_fecha_hora_utc**, **fecha_hora_utc** de cada cita y **minutos_desde_ahora**.
3. En **Railway** revisa los logs `[Recordatorios]` con **fecha_hora_utc=** y **candidatas (fecha_hora_utc)**.
4. Las citas nuevas y las reagendadas tendrán `fecha_hora_utc` rellenado; las antiguas se rellenan con el UPDATE de la migración.

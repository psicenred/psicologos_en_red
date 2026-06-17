# Crear columna motivo_de_consulta en Railway

## En Railway (Postgres)

1. Entra a tu proyecto en [Railway](https://railway.app).
2. Abre el servicio **PostgreSQL** (tu base de datos).
3. Pestaña **"Data"** o **"Query"** (según tu versión).
4. En **Query** pega y ejecuta:

```sql
ALTER TABLE citas
ADD COLUMN IF NOT EXISTS motivo_de_consulta VARCHAR(200);

COMMENT ON COLUMN citas.motivo_de_consulta IS 'Motivo de consulta elegido por el paciente (solo primera cita, terapia individual).';
```

5. Pulsa **Run** / **Execute**. No hace falta reiniciar el servidor; la columna quedará disponible de inmediato.

## Comprobar

Puedes verificar que la columna existe con:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'citas' AND column_name = 'motivo_de_consulta';
```

Debe devolver una fila con `motivo_de_consulta` y `character varying`.

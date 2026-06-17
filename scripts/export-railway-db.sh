#!/usr/bin/env bash
# Exporta la base Postgres actual de Railway a un archivo .sql
#
# Requisitos: railway CLI (https://docs.railway.com/guides/cli) + pg_dump
#
# Uso:
#   railway login
#   railway link          # elige proyecto + servicio Postgres
#   ./scripts/export-railway-db.sh
#
# Salida: railway_export_YYYYMMDD_HHMMSS.sql en la raíz del repo

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/railway_export_$(date +%Y%m%d_%H%M%S).sql"

if command -v railway >/dev/null 2>&1; then
  RAILWAY=(railway)
elif [[ -x "$HOME/.npm-global/bin/railway" ]]; then
  RAILWAY=("$HOME/.npm-global/bin/railway")
else
  RAILWAY=(npx @railway/cli)
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "❌ pg_dump no encontrado. brew install libpq && brew link --force libpq"
  exit 1
fi

echo "→ Exportando desde Railway (servicio enlazado)..."
echo "  Archivo: $OUT"
echo "  Tip: enlaza el servicio Postgres → npx @railway/cli service Postgres"

# Preferir URL pública (funciona desde tu Mac). DATABASE_URL interna solo vive en Railway.
"${RAILWAY[@]}" run bash -c '
  URL="${DATABASE_PUBLIC_URL:-$DATABASE_URL}"
  if [[ "$URL" == *railway.internal* ]]; then
    echo "❌ DATABASE_URL es interna. Ejecuta: npx @railway/cli service Postgres"
    exit 1
  fi
  pg_dump "$URL" \
    --no-owner \
    --no-acl \
    --clean \
    --if-exists \
    --format=plain \
    --file="'"$OUT"'"
'

echo "✅ Listo: $OUT"
echo ""
echo "Importar en Supabase (conexión directa :5432):"
echo "  psql \"postgresql://postgres.[ref]:[password]@db.[ref].supabase.co:5432/postgres\" -f \"$OUT\""
echo ""
echo "Luego ejecuta: scripts/supabase-post-dump.sql (migraciones que falten)"

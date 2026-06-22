#!/usr/bin/env bash
# =============================================================================
# setup-db.sh — Inicializa la base de datos DoonFlow en un proyecto Supabase.
#
# Requisitos:
#   - packages/db/.env con DATABASE_URL y DIRECT_URL configurados (ver docs/setup-supabase.md)
#   - Node.js >=20, pnpm disponible (npx pnpm si no está instalado globalmente)
#   - (Opcional) Supabase CLI para aplicar RLS automáticamente:
#       npm install -g supabase  →  supabase login
#
# Uso:
#   pnpm run setup:db
#   bash scripts/setup-db.sh
# =============================================================================

set -e  # Abortar si cualquier comando falla

RESET="\033[0m"
VERDE="\033[32m"
AMARILLO="\033[33m"
ROJO="\033[31m"
AZUL="\033[34m"

info()  { echo -e "${AZUL}[setup-db]${RESET} $1"; }
ok()    { echo -e "${VERDE}[setup-db] ✓${RESET} $1"; }
warn()  { echo -e "${AMARILLO}[setup-db] ⚠${RESET} $1"; }
error() { echo -e "${ROJO}[setup-db] ✗${RESET} $1"; exit 1; }

# ------------------------------------------------------------------------------
# 0. Verificar que packages/db/.env existe
# ------------------------------------------------------------------------------
DB_ENV="packages/db/.env"
if [ ! -f "$DB_ENV" ]; then
  error "No se encontró $DB_ENV. Seguir los pasos 2-3 de docs/setup-supabase.md."
fi

source "$DB_ENV" 2>/dev/null || true

if [ -z "$DATABASE_URL" ] || [[ "$DATABASE_URL" == *"placeholder"* ]]; then
  error "DATABASE_URL no está configurado en $DB_ENV. Ver docs/setup-supabase.md Paso 2."
fi

ok "Variables de entorno cargadas desde $DB_ENV."

# ------------------------------------------------------------------------------
# 1. Migración de Prisma
# ------------------------------------------------------------------------------
info "Paso 1/3 — Aplicando migraciones de Prisma..."
npx --yes pnpm@9 --filter @doonflow/db migrate:dev --name init_auth 2>&1 || \
  npx --yes pnpm@9 --filter @doonflow/db migrate:dev 2>&1
ok "Migraciones aplicadas."

# ------------------------------------------------------------------------------
# 2. Políticas RLS (requiere Supabase CLI o aplicación manual)
# ------------------------------------------------------------------------------
info "Paso 2/3 — Aplicando políticas RLS..."

RLS_FILE="packages/db/sql/rls/auth_rls.sql"

if command -v supabase &>/dev/null; then
  PROJECT_REF=$(echo "$DIRECT_URL" | grep -oP '(?<=@)[^.]+(?=\.supabase\.co)')
  if [ -n "$PROJECT_REF" ]; then
    supabase db push --db-url "$DIRECT_URL" --file "$RLS_FILE" 2>&1 && \
      ok "RLS aplicado vía Supabase CLI." || \
      warn "No se pudo aplicar RLS automáticamente. Ver instrucción manual abajo."
  else
    warn "No se pudo detectar el project-ref de Supabase en DIRECT_URL."
  fi
else
  warn "Supabase CLI no encontrado — aplicar RLS manualmente:"
  echo ""
  echo "  1. Ir a Supabase Dashboard → SQL Editor"
  echo "  2. Copiar y ejecutar el contenido de:"
  echo "     $RLS_FILE"
  echo ""
fi

# ------------------------------------------------------------------------------
# 3. Seed
# ------------------------------------------------------------------------------
info "Paso 3/3 — Ejecutando seed (roles del sistema, empresa demo, usuario admin demo)..."
npx --yes pnpm@9 --filter @doonflow/db seed 2>&1
ok "Seed completado."

# ------------------------------------------------------------------------------
# Resumen
# ------------------------------------------------------------------------------
echo ""
echo -e "${VERDE}============================================================${RESET}"
echo -e "${VERDE} Setup completado 🚀${RESET}"
echo -e "${VERDE}============================================================${RESET}"
echo ""
echo "  Próximo paso: crear el usuario admin en Supabase Auth."
echo "  Ver docs/setup-supabase.md → Paso 5."
echo ""
echo "  Para levantar el proyecto:"
echo "    pnpm dev"
echo ""
echo "  Login:  http://localhost:3000/auth/login"
echo "  API:    http://localhost:4000/salud"
echo ""

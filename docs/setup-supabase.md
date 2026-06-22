# Guía de configuración de Supabase para DoonFlow

Esta guía lleva desde cero hasta tener la base de datos lista para desarrollo local. Una vez completada, ejecuta `pnpm run setup:db` y el script hace lo demás automáticamente.

---

## Paso 1 — Crear proyecto en Supabase

1. Ir a [https://supabase.com](https://supabase.com) → **Start your project** (cuenta gratuita suficiente para desarrollo).
2. Crear una **nueva organización** (ej. "DoonFlow").
3. Crear un **nuevo proyecto**:
   - Nombre: `doonflow-dev`
   - Contraseña de BD: guardarla en un gestor de contraseñas (se necesitará para `DATABASE_URL`).
   - Región: la más cercana (ej. `us-east-1` o la disponible en Latinoamérica).
4. Esperar ~2 minutos a que el proyecto termine de aprovisionarse (barra de progreso en el dashboard).

---

## Paso 2 — Obtener las credenciales

En el dashboard de Supabase, ir a **Project Settings → Data API** (o Settings → API):

| Variable | Dónde encontrarla |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Project URL** (ej. `https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **anon / public** key |
| `SUPABASE_SERVICE_ROLE_KEY` | **service_role** key (¡mantener privada!) |

Para las variables de base de datos, ir a **Project Settings → Database → Connection String**:

| Variable | Instrucción |
|---|---|
| `DATABASE_URL` | Seleccionar **Transaction mode** (puerto 6543), reemplazar `[YOUR-PASSWORD]` con la contraseña del Paso 1 |
| `DIRECT_URL` | Seleccionar **Session mode** (puerto 5432), misma contraseña |

> Nota: `DATABASE_URL` (transaction mode, pooler) la usa Prisma para queries normales. `DIRECT_URL` (session mode, directo) la usa Prisma para migraciones. Ambas son necesarias.

---

## Paso 3 — Configurar variables de entorno locales

Copiar el archivo de ejemplo y completarlo con los valores del Paso 2:

```bash
# En la raíz del monorepo
cp .env.example .env.local

# En packages/db (para que prisma migrate dev funcione)
cp .env.example packages/db/.env
```

Editar ambos archivos con los valores reales:

```env
DATABASE_URL=postgresql://postgres.xxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres.xxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres

NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...
SUPABASE_SERVICE_ROLE_KEY=eyJhb...
```

> ⚠️ Nunca commitear estos archivos (ya están en `.gitignore`).

---

## Paso 4 — Ejecutar el setup automatizado

Con las credenciales en su lugar, un solo comando hace todo lo demás:

```bash
pnpm run setup:db
```

Este script (`scripts/setup-db.sh`) hace en orden:
1. `prisma migrate dev` — crea todas las tablas en Supabase.
2. Aplica las políticas RLS (`packages/db/sql/rls/auth_rls.sql`) directamente en Supabase vía Supabase CLI.
3. `prisma db seed` — inserta los 5 roles del sistema, empresa demo y usuario admin demo.

Ver `scripts/setup-db.sh` para el detalle.

---

## Paso 5 — Crear el usuario admin en Supabase Auth

El seed de Prisma crea la fila en la tabla `usuario` con un `authUserId` de demo (`00000000-0000-0000-0000-0000000000aa`). Para poder iniciar sesión de verdad necesitas un usuario real en Supabase Auth:

1. En el dashboard: **Authentication → Users → Add user** (o "Invite user").
2. Email: `admin@doonflow.demo`, contraseña: la que quieras.
3. Copiar el **UUID** que Supabase asigna al nuevo usuario.
4. Actualizar el `authUserId` en la tabla `usuario` de ese registro:
   ```sql
   -- En Supabase → SQL Editor
   UPDATE usuario
   SET auth_user_id = '<UUID-COPIADO>'
   WHERE email = 'admin@doonflow.demo';
   ```

Desde ahí ya puedes iniciar sesión en `http://localhost:3000/auth/login`.

---

## Verificación final

```bash
# Levantar API y Web en paralelo
pnpm dev

# En otro terminal: verificar que la API responde
curl http://localhost:4000/salud
# → {"data":{"estado":"ok"}}

# Abrir el navegador en:
# http://localhost:3000/auth/login
```

Deberías ver la página de login de DoonFlow. Al iniciar sesión con el usuario del Paso 5, redirige al dashboard (`/`).

---

## Troubleshooting frecuente

| Síntoma | Causa probable | Solución |
|---|---|---|
| `Error: Environment variable not found: DATABASE_URL` | Falta `packages/db/.env` | Crear el archivo con las vars de BD |
| `invalid_grant` en login | `authUserId` del seed no coincide con el de Supabase Auth | Actualizar con el SQL del Paso 5 |
| `403 usuario_sin_perfil` en login | El usuario existe en Auth pero no en la tabla `usuario` | Correr seed o crear la fila manualmente |
| RLS bloquea todas las queries | No se aplicó `auth_rls.sql` o `empresa_id` nulo | Verificar que el seed corrió; revisar Supabase → Authentication → Policies |

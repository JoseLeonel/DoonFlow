# Registro de cambios de base de datos

Ver formato y diferencia con `packages/db/produccion/` en `memoria/cambios_db/README.md`. Más reciente arriba.

---

## [2026-06-16] Esquema inicial — Empresa, Usuario, Rol, Permiso

- Tipo: tabla nueva (x4) + tabla puente
- Módulo: auth (transversal — Empresa es la raíz de aislamiento multiempresa)
- Detalle: `Empresa` (raíz multiempresa), `Rol` (catálogo fijo: administrador/productor/operario/auditor/cliente_externo), `Permiso` (catálogo de acciones), `RolPermiso` (puente), `Usuario` (con `authUserId` enlazando a Supabase Auth, `empresaId`, `rolId`). Seed agrega los 5 roles del sistema + empresa demo + usuario administrador demo.
- Migración/archivo: `packages/db/prisma/schema.prisma`, `packages/db/prisma/seed.ts`, RLS en `packages/db/sql/rls/auth_rls.sql`
- Estado: en desarrollo — falta correr `prisma migrate dev` contra una base real (no hay `DATABASE_URL` configurado en este entorno) y aplicar `auth_rls.sql` manualmente en Supabase.

<!-- Agregar entradas nuevas arriba de esta línea -->

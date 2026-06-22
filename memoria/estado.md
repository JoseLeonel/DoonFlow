# Estado del proyecto — DoonFlow

> Última actualización: 2026-06-16

Este archivo es la "foto" actual del proyecto: qué existe, qué está en progreso y qué falta. Cada agente debe actualizarlo al terminar una tarea relevante (no para cambios triviales).

---

## Fase actual

**Levantamiento de requerimientos y arquitectura inicial.** Aún no hay código de aplicación (`apps/`, `packages/`) — solo gobierno del proyecto (`CLAUDE.md`, agentes, memoria).

---

## Hecho

- [x] `CLAUDE.md` con visión, stack, convenciones, arquitectura hexagonal (backend), arquitectura por capas (frontend), sistema de diseño (plantilla `nextjs-admin-dashboard-main`) y objetivo responsive tablet/desktop.
- [x] 11 subagentes definidos en `.claude/agents/` (6 técnicos: arquitecto, frontend, backend, basededatos, produccion, qa — 5 de dominio: fincas, trazabilidad, inventario, analisis, auth).
- [x] Convención de procedimientos almacenados (SP) y carpeta `packages/db/produccion/` para historial de cambios de BD.
- [x] Carpeta `memoria/` (este árbol) para registrar estado, decisiones, errores conocidos y solicitudes de integración entre módulos.
- [x] `memoria/cambios_db/` — bitácora de `agente-basededatos` para todo cambio de esquema (separada de `packages/db/produccion/`, que es solo lo validado para producción).
- [x] Scaffolding real del monorepo: raíz (`package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`), `packages/config`, `packages/shared`, `packages/ui` (Boton/GrupoInput/Casilla), `packages/db` (ver abajo), `apps/api`, `apps/web`.
- [x] `packages/db/prisma/schema.prisma`: `Empresa`, `Rol`, `Permiso`, `RolPermiso`, `Usuario` (multiempresa, enlazado a Supabase Auth vía `authUserId`). Seed con los 5 roles del sistema + empresa/usuario demo. RLS en `packages/db/sql/rls/auth_rls.sql` (sin aplicar — falta BD real).
- [x] `apps/api` módulo `auth` completo en arquitectura hexagonal (domain/application/infrastructure): caso de uso `IniciarSesionUseCase`, adaptador Supabase, repositorio Prisma, controller/router en `/auth/login`. Middleware `autenticacion`/`autorizacion` (guard de roles) en `apps/api/src/middleware/`.
- [x] `apps/web` página de login con arquitectura por capas (`_servicios`, `_hooks`, `_components`), estilo de la plantilla (dos columnas, panel de marca desde `md:`). Middleware JWT verifica cookie `doonflow_token`.
- [x] **Login end-to-end funcionando** — PostgreSQL 13 local (puerto 5433), sin Supabase. `LocalAuthAdapter` (bcrypt + JWT propio). Migración `init_auth` aplicada. Seed con 5 roles + empresa demo + usuario `admin@doonflow.demo` / `Admin2026!`.
- [x] Route Handler `POST /api/auth/login` (Next.js) actúa de proxy → API Express → setea cookie `httpOnly`.
- [x] `apps/api` corriendo en `http://localhost:4000` modo LOCAL. `apps/web` en `http://localhost:3000`.

## En progreso

_Nada activo actualmente._

## Pendiente (no iniciado)

- [ ] Primer módulo de dominio funcional más allá de auth (candidato: `fincas`, es la base de los demás).
- [ ] Pipeline de CI/CD en `.github/workflows/` (`agente-produccion`).
- [ ] Definir proveedor de hosting para `apps/api` (pendiente, ver `Claude.md` → Despliegue).
- [ ] Tests unitarios del módulo auth (`agente-qa`): casos de uso con mocks de puertos, componente/hook de login con Vitest + RTL.

---

## Cómo actualizar este archivo

- Mover ítems de "Pendiente" a "En progreso" cuando un agente empieza la tarea.
- Mover de "En progreso" a "Hecho" cuando termina y está verificado (no solo "escrito").
- Si una tarea se bloquea, anótalo en `errores_conocidos.md` con referencia desde aquí, no dupliques el detalle.

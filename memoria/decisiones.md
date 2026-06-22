# Decisiones — DoonFlow

Registro de decisiones de arquitectura/negocio no triviales, en orden cronológico (más reciente arriba). Formato corto tipo ADR: contexto, decisión, consecuencias. Cualquier agente puede agregar una entrada; `agente-arquitecto` resuelve si hay contradicción entre dos decisiones registradas.

---

## 2026-06-16 — Responsive: tablet y desktop, no teléfono

- **Contexto:** se pidió que `agente-frontend` desarrolle explícitamente para tablet y desktop.
- **Decisión:** breakpoints objetivo `md:`/`lg:`/`xl:` (≥768px tablet, ≥1280px desktop). No se optimiza para teléfono (<768px); degradación ahí no es bug bloqueante.
- **Consecuencias:** el panel de marca del login (y patrones similares de dos columnas) se muestra desde `md:` en vez de `xl:` como en la plantilla original. Si se requiere soporte real de teléfono más adelante, es una decisión nueva, no una extensión silenciosa de esta.

## 2026-06-16 — Arquitectura por capas en el FrontEnd (no monolítica)

- **Contexto:** la arquitectura hexagonal solo estaba definida para `apps/api`; el frontend no tenía una separación formal y corría riesgo de volverse monolítico (componentes llamando `fetch`/Supabase directamente).
- **Decisión:** cada módulo de `apps/web` se separa en `_servicios/` (acceso a datos), `_hooks/` (estado/orquestación) y `_components/` (presentación pura), con `page.tsx` como composición. Regla de dependencia: `page` → `_hooks` → `_servicios`; los componentes no llaman servicios directamente.
- **Consecuencias:** mismo espíritu que la arquitectura hexagonal del backend pero adaptada a Next.js/React (no son los mismos nombres de capa porque el frontend no tiene "dominio" propio, solo presentación + acceso a datos + estado). `agente-qa` vigila esta separación igual que vigila la hexagonal.

## 2026-06-16 — Stored procedures para lógica de BD crítica + carpeta de producción

- **Contexto:** se necesitaba definir si el agente de base de datos trabaja solo vía Prisma o también con SQL nativo, y cómo se rastrean los cambios de BD camino a producción.
- **Decisión:** la lógica de BD crítica/transaccional (cálculos agregados, validaciones atómicas, reportes pesados) se construye como **stored procedures de PostgreSQL** (`packages/db/sql/procedimientos/`), invocados solo desde `infrastructure/`. Los cambios validados se registran en `packages/db/produccion/CHANGELOG.md` antes de aplicarse a producción.
- **Consecuencias:** el CRUD simple sigue siendo Prisma ORM normal; los SP son la excepción para lo que requiere atomicidad o performance. `agente-basededatos` prepara el changelog, `agente-produccion` lo aplica y lo marca.

## 2026-06-16 — Organización de agentes en dos niveles (técnico + dominio)

- **Contexto:** se pidieron agentes por capa técnica (FrontEnd, BackEnd, Base de Datos, Análisis, Producción, QA) además de los ya existentes por dominio (fincas, trazabilidad, inventario, analytics, auth).
- **Decisión:** mantener ambos niveles. Los agentes técnicos son dueños de la infraestructura transversal de su capa (UI compartida, base de la API, esquema global de BD, CI/CD, suite de tests); los de dominio implementan features dentro de esas convenciones, sin redefinirlas.
- **Consecuencias:** más agentes que coordinar, pero separación de responsabilidades más clara. Regla de prioridad: `agente-arquitecto` > `agente-qa` (puede bloquear merge) > agente técnico dueño de la capa > agente de dominio.

## 2026-06-16 — Sistema de diseño basado en plantilla externa

- **Contexto:** se necesitaba una base de estilos/tablas/dashboard/login en vez de diseñar desde cero.
- **Decisión:** usar `nextjs-admin-dashboard-main` (local, fuera del monorepo) como referencia de patrones — tokens de Tailwind, primitivas de tabla, layout de dashboard y de login. Se porta el patrón, no el contenido/datos demo de la plantilla.
- **Consecuencias:** `agente-frontend` es responsable de portar y mantener estos patrones en `packages/ui`; ningún otro agente debe reimplementar estilos en paralelo.

## 2026-06-16 — Arquitectura hexagonal en el backend

- **Contexto:** se pidió evitar código espagueti explícitamente.
- **Decisión:** `apps/api` sigue arquitectura hexagonal (`domain/application/infrastructure` por módulo). Regla de dependencia: siempre hacia el dominio. Prohibido importar `express`/`@prisma/client` fuera de `infrastructure/`.
- **Consecuencias:** estructura de archivos por módulo cambia de flat (`router/controller/service/schema/types/test`) a las 3 carpetas por capa. `agente-qa` vigila el cumplimiento.

## 2026-06-16 — Aislamiento multiempresa: RLS + filtro de aplicación

- **Contexto:** `empresa_id` está en todas las tablas de dominio, pero no estaba definido el mecanismo de aislamiento.
- **Decisión:** defensa en profundidad — RLS de Supabase como primera línea, filtro explícito por `empresaId` en cada repositorio Prisma como segunda línea. No depender solo de RLS.
- **Consecuencias:** cada método de repositorio recibe `empresaId` obligatoriamente.

## 2026-06-16 — Backend fijado en Express (no Fastify)

- **Contexto:** el borrador inicial dejaba la elección abierta ("Express o Fastify").
- **Decisión:** Express, para consistencia con la estructura de adaptadores HTTP documentada.
- **Consecuencias:** ninguna ambigüedad futura sobre qué framework usar en `apps/api`.

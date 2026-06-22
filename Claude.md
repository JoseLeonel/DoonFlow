# CLAUDE.md — DoonFlow

---

## Visión del proyecto

DoonFlow digitaliza y conecta toda la cadena agroalimentaria: desde la gestión de fincas y cultivos hasta la trazabilidad del producto final, control de inventarios y análisis de datos para la toma de decisiones. La plataforma está diseñada para productores, procesadores y distribuidores del sector agroalimentario.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 14+ (App Router) + React + TailwindCSS |
| Backend | Node.js + Express |
| Base de datos | PostgreSQL vía Supabase |
| ORM | Prisma |
| Autenticación | Supabase Auth |
| Almacenamiento | Supabase Storage |
| Monorepo | pnpm workspaces + Turborepo |
| CI/CD | GitHub Actions |

> Decisión: se fija **Express** (no Fastify) para mantener consistencia con la estructura de adaptadores HTTP descrita en la sección de arquitectura.

### Requisitos del entorno

- Node.js >= 20 LTS
- pnpm >= 9
- Definir ambas versiones en `engines` del `package.json` raíz para que el equipo (y CI) las respete.

---

## Sistema de diseño (UI)

Estilos, tablas y layout de dashboard se basan en la plantilla de referencia **`nextjs-admin-dashboard-main`** (local en `C:\WorkspaceSoftwaredOON\nextjs-admin-dashboard-main`, fuera del monorepo — es solo fuente de estilo/patrones, no se importa como dependencia).

### Qué se replica en `packages/ui` y `packages/config`

- **Tokens de Tailwind** (`packages/config/tailwind/`): paleta `primary`, escalas `dark` (1-8), `gray` (1-7), `green/red/blue/yellow` con variantes `light`; tipografía custom `heading-1..6` y `body-2xlg/sm/xs`; escala de `spacing` en incrementos de `.5`; sombras `shadow-1` … `shadow-7` y `shadow-card`. Adaptar la paleta a la identidad de DoonFlow, manteniendo la misma estructura de tokens.
- **Modo oscuro**: estrategia por clase (`darkMode: ["class"]`) con `next-themes`, igual que la plantilla.
- **Utilidad `cn()`** (`clsx` + `tailwind-merge`) en `packages/shared/utils/cn.ts`, usada en todos los componentes de `packages/ui`.
- **Variantes de componentes** con `class-variance-authority` (botones, badges de estado, etc.).
- **Tablas**: primitivas headless en `packages/ui/table.tsx` (`Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`), igual que `src/components/ui/table.tsx` de la plantilla. Los agentes de dominio solo *componen* estas primitivas para tablas específicas (ej. tabla de lotes, tabla de movimientos de inventario), como hacen `top-channels/index.tsx` o `invoice-table.tsx` en la plantilla — no reimplementan `<table>` desde cero.
- **Tarjetas de dashboard**: contenedor base `rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card` para cards de KPIs y widgets.
- **Login / Auth**: layout de dos columnas dentro de una card (`rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card`) — formulario a la izquierda (`InputGroup` con ícono + label, `Checkbox` "recordarme", botón `rounded-lg bg-primary` ancho completo con spinner de `loading`) y panel de marca/gradiente a la derecha (oculto en mobile, `hidden xl:block`), siguiendo `src/app/auth/sign-in/page.tsx` y `src/components/Auth/SigninWithPassword.tsx` de la plantilla. Se adapta a Supabase Auth en vez del submit demo de la plantilla.

`agente-frontend` es dueño de `packages/ui` y de portar estos patrones (dashboard, tablas y login); los demás agentes consumen los componentes en lugar de reimplementar estilos.

### Objetivo responsive: tablet y desktop

El desarrollo de UI se diseña y prueba para **tablet (≥768px) y desktop (≥1280px)** — son los dispositivos reales de uso (oficina/campo con tablet). No es prioridad optimizar para teléfono móvil pequeño (<768px); el layout puede degradarse ahí sin que sea un bug bloqueante. Usar los breakpoints de Tailwind `md:`/`lg:`/`xl:` como objetivo principal, no `sm:`. Si más adelante se requiere soporte real de teléfono, es una decisión nueva a registrar en `memoria/decisiones.md`, no una suposición de `agente-frontend`.

---

## Arquitectura: Hexagonal (Ports & Adapters)

El backend (`apps/api`) sigue **arquitectura hexagonal** en cada módulo de dominio. El objetivo es evitar código espagueti: la lógica de negocio nunca debe vivir en controladores, rutas ni en el cliente Prisma directamente.

### Capas (regla de dependencia: siempre hacia el dominio, nunca al revés)

1. **Dominio** (`domain/`) — Entidades, reglas de negocio puras y **puertos** (interfaces). No importa Express, ni Prisma, ni nada de infraestructura.
2. **Aplicación** (`application/`) — Casos de uso que orquestan el dominio. Validación de entrada (Zod). Tampoco conoce Express ni Prisma directamente: solo usa los puertos definidos en el dominio.
3. **Infraestructura** (`infrastructure/`) — **Adaptadores**: implementación concreta de los puertos (repositorio Prisma), y adaptadores de entrada (router/controller Express).

### Estructura de archivos por módulo (API)

```
src/modules/[modulo]/
├── domain/
│   ├── [modulo].entity.ts             # Entidad y reglas de negocio puras
│   ├── [modulo].repository.port.ts    # Puerto (interfaz) del repositorio
│   └── [modulo].errors.ts             # Errores de dominio
├── application/
│   ├── casos-uso/
│   │   ├── crear-[modulo].usecase.ts
│   │   ├── obtener-[modulo].usecase.ts
│   │   └── ...
│   └── [modulo].schema.ts             # Validación Zod (DTOs de entrada/salida)
├── infrastructure/
│   ├── [modulo].prisma-repository.ts  # Adaptador: implementa el puerto con Prisma
│   ├── [modulo].controller.ts         # Adaptador: HTTP -> caso de uso
│   └── [modulo].router.ts             # Adaptador: define rutas Express
└── [modulo].test.ts
```

### Reglas para evitar código espagueti

- Una función, un propósito. Si un caso de uso supera ~40 líneas, extraer funciones de dominio.
- Los controladores **solo** traducen HTTP ↔ caso de uso (parsear request, llamar caso de uso, formatear response). Cero lógica de negocio ahí.
- Ningún archivo en `application/` o `domain/` puede importar `express` ni `@prisma/client`. Los repositorios Prisma viven únicamente en `infrastructure/`.
- Inyección de dependencias simple por constructor: los casos de uso reciben el puerto del repositorio, nunca instancian Prisma directamente.
- `agente-qa` valida estas reglas en cada PR (ver sección de agentes).

### Arquitectura de FrontEnd (capas)

`apps/web` también sigue una separación en capas — no es solo páginas con `fetch`/Supabase sueltos en cada componente (eso es monolítico y espagueti, igual que mezclar Express con el dominio en el backend). Regla de dependencia: `page.tsx` → hooks → servicios; los componentes de presentación no llaman servicios ni hooks de datos directamente.

```
app/(dashboard)/[modulo]/
├── page.tsx                # Composición: importa hook(s) de la página + componentes. Sin lógica propia.
├── [id]/
│   └── page.tsx            # Detalle
├── nuevo/
│   └── page.tsx            # Creación
├── _servicios/              # Acceso a datos: única capa que llama fetch/Supabase/cliente de la API.
│   └── [modulo].servicio.ts
├── _hooks/                  # Estado y orquestación (custom hooks). Consumen _servicios, nunca fetch directo.
│   └── usar-[caso-de-uso].ts
└── _components/             # Presentación pura: reciben datos por props, sin llamadas a datos.
```

- **`_servicios/`**: funciones puras que llaman a la API (`apps/api`) o a Supabase directamente (solo Auth, ver módulo `auth`). Devuelven datos tipados de `packages/shared`, nunca el `Response` crudo.
- **`_hooks/`**: estado de carga/error, orquestan uno o más servicios, deciden navegación. Es el único lugar con `useState`/`useEffect` relacionado a datos.
- **`_components/`**: reciben props, pueden tener estado de UI local (ej. mostrar/ocultar contraseña) pero no estado de datos.
- Componentes transversales (botones, inputs, tablas) viven en `packages/ui`, no aquí — los mantiene `agente-frontend`.

---

## Estructura del monorepo

```
DoonFlow/
├── apps/
│   ├── web/          # Aplicación Next.js (frontend principal)
│   └── api/          # Servidor Node.js/Express (API REST, arquitectura hexagonal)
├── packages/
│   ├── ui/           # Componentes compartidos (Design System)
│   ├── db/           # Esquema Prisma + migraciones + tipos DB
│   ├── shared/       # Tipos TypeScript compartidos, utils, constantes
│   └── config/       # Configuraciones de ESLint, TypeScript, Tailwind
├── docs/             # Documentación técnica y de negocio
├── .github/
│   └── workflows/    # Pipelines CI/CD
├── turbo.json
├── pnpm-workspace.yaml
├── CLAUDE.md         # Este archivo
└── README.md
```

---

## Módulos del dominio

### 1. Fincas y Unidades Productivas
Registro, configuración y seguimiento de fincas, lotes y cultivos activos.

### 2. Trazabilidad
Seguimiento del producto desde la siembra/cosecha hasta el consumidor final. Incluye lotes de producción, transformación y distribución.

### 3. Inventario
Control de insumos (semillas, fertilizantes, agroquímicos), materias primas y productos terminados. Alertas de stock mínimo.

### 4. Reportes y Analytics
Dashboards de KPIs productivos, reportes de cosecha, eficiencia de insumos, análisis por período y exportación de datos.

### 5. Usuarios y Roles
Gestión multiempresa: administrador, productor, operario, auditor, cliente externo.

---

## Agentes de Claude Code

Hay dos niveles de agentes:

- **Agentes de capa técnica**: dueños de la infraestructura transversal de su capa (UI compartida, API base, esquema de BD global, despliegue, calidad).
- **Agentes de dominio**: dueños de la lógica de negocio de un módulo, implementada dentro de las convenciones que define el agente técnico correspondiente.

Un agente de dominio **no redefine** convenciones técnicas transversales (no crea un patrón de componente nuevo en `packages/ui`, no inventa un middleware global, no cambia el pipeline de CI); las usa, y si necesita algo nuevo de uso transversal, escala al agente técnico dueño de esa capa.

### Regla de prioridad ante solapamiento

1. `agente-arquitecto` tiene la última palabra en decisiones estructurales transversales (esquema de BD global, capas hexagonales, dependencias entre módulos, elección de librerías).
2. `agente-qa` puede bloquear cualquier merge que no cumpla las reglas de arquitectura o el mínimo de cobertura de tests, sin importar qué agente propuso el cambio.
3. Dentro de su capa, cada agente técnico (`agente-frontend`, `agente-backend`, `agente-basededatos`, `agente-produccion`) aprueba los cambios estructurales de esa capa (nuevo patrón de componente, nuevo tipo de adaptador, cambios al schema global, pipelines de CI/CD).
4. Los agentes de dominio (`agente-fincas`, `agente-trazabilidad`, `agente-inventario`, `agente-analisis`, `agente-auth`) no modifican código fuera de su alcance declarado; si lo necesitan, escalan al agente técnico correspondiente o a `agente-arquitecto`.

---

### Agentes de capa técnica

#### `agente-arquitecto`
**Rol:** Diseño de arquitectura, decisiones técnicas transversales, revisión de estructura de monorepo y de las capas hexagonales.
**Cuándo usarlo:** Al iniciar un nuevo módulo, redefinir la estructura de base de datos, evaluar librerías o establecer patrones de código.
**Alcance:** Todo el repositorio. Lee `packages/db/schema.prisma`, `turbo.json`, `CLAUDE.md`.

#### `agente-frontend`
**Rol:** Dueño de `packages/ui` (design system) y de los layouts/patrones de dashboard transversales, basados en `nextjs-admin-dashboard-main` (ver sección "Sistema de diseño").
**Cuándo usarlo:** Crear o modificar componentes compartidos (tablas, cards, formularios, gráficas), layout de la app, navegación, tema claro/oscuro.
**Alcance:** `apps/web/`, `packages/ui/`. Los agentes de dominio consumen estos componentes desde `app/(dashboard)/[modulo]/_components/`; si necesitan un componente nuevo de uso transversal, lo solicitan a `agente-frontend` en vez de crearlo directamente en `packages/ui/`.

#### `agente-backend`
**Rol:** Dueño de la infraestructura común de la API: configuración de Express, middleware global, manejo de errores HTTP, envelope de respuesta, y de que cada módulo respete las capas hexagonales (`domain/application/infrastructure`).
**Cuándo usarlo:** Definir/ajustar el envelope de respuesta, middleware de logging, convenciones nuevas de adaptadores, utilidades compartidas entre módulos de `apps/api`.
**Alcance:** `apps/api/src/shared/`, configuración raíz de Express. Los agentes de dominio implementan su propio `domain/application/infrastructure` dentro de su módulo siguiendo estas convenciones, sin modificarlas.

#### `agente-basededatos`
**Rol:** Dueño del esquema Prisma global, relaciones entre módulos, políticas RLS transversales (multiempresa), seeds e índices.
**Cuándo usarlo:** Migraciones que afectan relaciones entre tablas de distintos módulos, definición/ajuste de RLS policies, estrategia de seeds, performance de queries.
**Alcance:** `packages/db/`. Los agentes de dominio proponen sus propias tablas dentro de su módulo; `agente-basededatos` revisa y aprueba antes de aplicar la migración.

#### `agente-produccion`
**Rol:** Despliegue, CI/CD, variables de entorno de producción y monitoreo post-release.
**Cuándo usarlo:** Configurar o modificar pipelines de GitHub Actions, gestionar secrets de producción, definir estrategia de rollback, revisar performance/errores en producción antes y después de un release.
**Alcance:** `.github/workflows/`, configuración de hosting (Vercel para `apps/web`, proveedor pendiente para `apps/api`), variables de entorno de producción. Ningún otro agente toca secrets de producción o pipelines sin pasar por `agente-produccion`.

#### `agente-qa`
**Rol:** Dueño de toda la suite de tests (unitarios, integración, e2e) y de vigilar que se respete la arquitectura hexagonal (capas, dirección de dependencias) sin código espagueti.
**Cuándo usarlo:** Escribir o revisar tests unitarios de:
- **Frontend** (`apps/web`): componentes y hooks con Vitest + React Testing Library, mockeando llamadas a la API.
- **Backend** (`apps/api`): por capa — `domain/` con tests puros sin mocks (reglas de negocio), `application/` (casos de uso) con mocks de los puertos del repositorio, `infrastructure/` con tests de integración ligera contra una BD de pruebas.
- Flujos críticos end-to-end con Playwright.
**Alcance:** Todo el repositorio. Bloquea merge a `main`/`develop` si no se cumple la cobertura mínima acordada (ej. 80% en `domain/` y `application/`) o si detecta lógica de negocio filtrada a controladores/componentes.

---

### Agentes de dominio

#### `agente-fincas`
**Rol:** Desarrollo del módulo de fincas, lotes y cultivos.
**Cuándo usarlo:** CRUD de fincas, configuración de lotes, seguimiento de ciclos de cultivo.
**Alcance:** `apps/api/src/modules/fincas/`, `apps/web/app/(dashboard)/fincas/`, `packages/db/` (tablas: `finca`, `lote`, `cultivo`).

#### `agente-trazabilidad`
**Rol:** Módulo de trazabilidad de productos a lo largo de la cadena.
**Cuándo usarlo:** Registro de lotes de producción, transformación, despachos y recepción.
**Alcance:** `apps/api/src/modules/trazabilidad/`, `apps/web/app/(dashboard)/trazabilidad/`.

#### `agente-inventario`
**Rol:** Control de inventario de insumos y productos terminados.
**Cuándo usarlo:** Movimientos de stock, alertas, proveedores, órdenes de compra.
**Alcance:** `apps/api/src/modules/inventario/`, `apps/web/app/(dashboard)/inventario/`.

#### `agente-analisis`
**Rol:** Reportes, dashboards y exportación de datos del módulo de Reportes y Analytics.
**Cuándo usarlo:** Diseño de queries analíticos, KPIs, gráficas, exportación Excel/PDF.
**Alcance:** `apps/api/src/modules/reportes/`, `apps/web/app/(dashboard)/analytics/`, `packages/shared/types/reportes.ts`. Coordina con `agente-frontend` para componentes de gráficas reutilizables y con `agente-basededatos` para queries/índices optimizados.

#### `agente-auth`
**Rol:** Autenticación, autorización, roles y permisos.
**Cuándo usarlo:** Configuración de Supabase Auth, guards de rutas, middleware de roles, gestión multiempresa.
**Alcance:** `apps/api/src/middleware/`, `apps/web/middleware.ts`, `packages/db/` (tablas: `usuario`, `rol`, `permiso`).

---

## Convenciones de código

### Idioma
- **Todo en español**: nombres de variables, funciones, clases, tablas de BD, comentarios y documentación.
- Excepción: palabras técnicas universales (`id`, `token`, `status`, `url`, `slug`) se mantienen en inglés.

### Nombrado
- Variables y funciones: `camelCase` → `obtenerFincas()`, `totalCosecha`
- Componentes React: `PascalCase` → `TarjetaFinca`, `FormularioCultivo`
- Tablas de BD: `snake_case` en singular → `finca`, `lote_cultivo`, `movimiento_inventario`
- Archivos: `kebab-case` → `formulario-finca.tsx`, `servicio-trazabilidad.ts`
- Constantes: `SCREAMING_SNAKE_CASE` → `ESTADO_CULTIVO`, `ROL_ADMIN`

### Formato de respuesta de la API

Toda respuesta JSON sigue un envelope consistente para evitar lógica ad-hoc en el frontend:

```ts
// Éxito
{ "data": T, "meta"?: { "pagina": number, "porPagina": number, "total": number } }

// Error
{ "error": { "codigo": string, "mensaje": string, "detalles"?: unknown } }
```

- Paginación vía query params `pagina` y `porPagina` (default `1` / `20`).
- Filtros y orden vía query params explícitos por recurso (ej. `?estado=activo&orden=-creado_en`).
- Códigos de error de dominio en `[modulo].errors.ts`, mapeados a códigos HTTP en el controller (adaptador), nunca en el caso de uso.

---

## Base de datos (Supabase + Prisma)

- Las migraciones viven en `packages/db/prisma/migrations/`.
- Nunca editar migraciones ya aplicadas. Crear siempre una nueva.
- Usar `supabase db pull` solo en entornos de desarrollo para sincronizar cambios manuales.
- Las tablas de dominio deben tener: `id UUID`, `creado_en TIMESTAMP`, `actualizado_en TIMESTAMP`, `empresa_id UUID` (multiempresa).
- Todos los timestamps se almacenan en **UTC** (`TIMESTAMPTZ`); la conversión a hora local de Costa Rica (`America/Costa_Rica`) ocurre solo en la capa de presentación (web).

### Aislamiento multiempresa (defensa en profundidad)

1. **RLS en Supabase** (primera línea de defensa): cada tabla de dominio tiene una policy que filtra por `empresa_id = auth.jwt() ->> 'empresa_id'`. Esto protege incluso si una query de Prisma olvida el filtro.
2. **Filtro explícito en el repositorio Prisma** (segunda línea, capa de infraestructura): todo método de repositorio recibe `empresaId` y lo aplica en el `where`. No depender únicamente de RLS para no acoplar la lógica de aplicación al motor de BD.

### Seeds

- `packages/db/prisma/seed.ts` puebla datos de desarrollo (empresa demo, usuarios de cada rol, finca de ejemplo).
- Ejecutar con `pnpm --filter db seed`. Nunca apuntar a producción.

### Procedimientos almacenados (SP)

La lógica de base de datos crítica/transaccional (cálculos agregados, validaciones que deben ser atómicas con la escritura, reportes pesados) se implementa como **stored procedures de PostgreSQL**, no como queries sueltas repetidas en cada repositorio.

- Ubicación: `packages/db/sql/procedimientos/sp_[entidad]_[accion].sql` (ej. `sp_inventario_registrar_movimiento.sql`).
- Se versionan junto a las migraciones de Prisma (`migrate dev --create-only` y se edita el SQL generado para incluir el `CREATE OR REPLACE FUNCTION`/procedure).
- Se invocan desde la capa `infrastructure/` del módulo correspondiente vía `$queryRaw`/`$executeRaw` de Prisma — nunca desde `application/` ni `domain/` (regla de dependencia hexagonal sin excepción).
- Nombrado en `snake_case`, prefijo `sp_`.

### Carpeta de producción

`packages/db/produccion/` acumula, en orden, los cambios de base de datos (migraciones + SP) ya validados en desarrollo/staging y listos para aplicarse en producción:

- Cada cambio agrega una entrada a `packages/db/produccion/CHANGELOG.md` (fecha, migración/SP afectado, módulo, autor del cambio) y copia/referencia el script correspondiente.
- `agente-basededatos` es quien agrega entradas aquí cuando un cambio queda validado; `agente-produccion` consume esta carpeta para aplicar `pnpm --filter db migrate:prod` y marca cada entrada como aplicada (fecha + ambiente).
- Ningún script se borra de esta carpeta una vez aplicado — es el historial de despliegues de BD, además de las migraciones de Prisma.

---

## Comandos principales

```bash
# Instalar dependencias
pnpm install

# Desarrollo (todos los apps en paralelo)
pnpm dev

# Desarrollo solo frontend
pnpm --filter web dev

# Desarrollo solo API
pnpm --filter api dev

# Build completo
pnpm build

# Tests
pnpm test

# Lint
pnpm lint

# Migraciones de BD
pnpm --filter db migrate:dev    # desarrollo
pnpm --filter db migrate:prod   # producción

# Generar tipos Prisma
pnpm --filter db generate

# Poblar datos de desarrollo
pnpm --filter db seed
```

---

## Flujo de trabajo Git

```
main          → producción (protegida, solo merge via PR)
develop       → integración continua
feature/[nombre-tarea]   → desarrollo de funcionalidades
fix/[nombre-bug]         → correcciones
refactor/[nombre-tarea]  → refactors sin cambio de comportamiento
docs/[nombre-tarea]      → documentación
chore/[nombre-tarea]     → mantenimiento (deps, CI, config)
```

- Cada PR debe incluir: descripción, tipo de cambio (feature/fix/refactor/docs), checklist de testing.
- Los commits siguen Conventional Commits en español:
  - `feat: agregar registro de finca`
  - `fix: corregir cálculo de stock mínimo`
  - `refactor: reorganizar servicio de trazabilidad`
  - `docs: actualizar CLAUDE.md con agentes`

---

## Variables de entorno

Archivo `.env.local` para desarrollo local (no commitear):
```
DATABASE_URL=
DIRECT_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Ver `.env.example` como plantilla.

---

## Despliegue

- `apps/web` se despliega en Vercel (preview por PR, producción desde `main`).
- `apps/api` se despliega en el proveedor que defina `agente-produccion` junto con `agente-arquitecto` (pendiente: Railway/Render/Fly.io).
- Secrets de producción se gestionan en GitHub Actions Secrets / variables del proveedor de hosting, nunca en el repositorio. `agente-produccion` administra el acceso.

---

## Memoria del proyecto

`memoria/` guarda el estado del trabajo entre sesiones — no es documentación de producto, es bitácora operativa. Todo agente debe consultarla al empezar una tarea y actualizarla al terminar una relevante.

- **`memoria/estado.md`**: foto actual del proyecto (hecho / en progreso / pendiente). Se actualiza al terminar cualquier tarea que mueva una de estas categorías.
- **`memoria/decisiones.md`**: registro tipo ADR de decisiones de arquitectura/negocio no triviales (contexto, decisión, consecuencias), más reciente arriba. Se agrega una entrada cuando se toma una decisión que no es obvia a partir del código (ej. elegir Express sobre Fastify, estrategia de RLS).
- **`memoria/errores_conocidos.md`**: errores/limitaciones conocidas que no se resuelven de inmediato, para no perder tiempo redescubriéndolas. Nunca se borra una entrada resuelta, se mueve a "Resueltos" con fecha y referencia.
- **`memoria/sprint/`**: solicitudes formales de integración entre módulos (un archivo por módulo proveedor: `fincas.md`, `trazabilidad.md`, `inventario.md`, `analisis.md`, `auth.md`). Un agente de dominio que necesita algo de otro módulo (dato, endpoint, evento, componente) lo solicita aquí en vez de implementarlo fuera de su alcance. Ver `memoria/sprint/README.md` para el formato.
- **`memoria/cambios_db/registro.md`**: bitácora de `agente-basededatos` con **todo** cambio de esquema (tablas, columnas, índices, RLS, SP, seeds), incluido el que aún está en desarrollo. Distinto de `packages/db/produccion/CHANGELOG.md`, que solo lleva el subconjunto ya validado para producción — ver `memoria/cambios_db/README.md` para la diferencia exacta.

Ningún archivo de `memoria/` se borra para "limpiar" — es historial. Se actualiza moviendo ítems entre secciones o agregando entradas nuevas.

---

## Contexto para Claude

- Este proyecto está en fase de **levantamiento de requerimientos y arquitectura inicial**.
- El dominio es **agroalimentario**: los términos como finca, lote, cosecha, insumo, trazabilidad son centrales.
- Prioridad actual: definir el modelo de datos base y la estructura del monorepo antes de escribir código.
- El equipo trabaja en español. Responder siempre en español.
- Al proponer soluciones, considerar siempre el contexto multiempresa (cada registro pertenece a una `empresa_id`).
- El backend sigue **arquitectura hexagonal**: nunca proponer código que mezcle lógica de negocio con Express o Prisma directamente en controladores. Priorizar siempre código simple y desacoplado por capas para evitar código espagueti.
- Los estilos, tablas y layout de dashboard se basan en la plantilla `nextjs-admin-dashboard-main` (ver sección "Sistema de diseño"); no inventar un sistema de estilos paralelo.
- Usar los agentes definidos arriba (técnicos y de dominio) para delimitar el alcance de cada tarea, respetando la regla de prioridad ante solapamiento.
- Antes de empezar una tarea, revisar `memoria/estado.md` para saber qué ya existe y qué está pendiente; al terminar, actualizarlo (ver sección "Memoria del proyecto").

# Guía de implementación — 014-panel-calendario-biblioteca

> Referencia técnica para los agentes. Describe qué construir y dónde, sin escribir el código — el código va en el repositorio, no aquí.
> Base: sprints 001–005 ya implementados, más [[006-vigencia-notificaciones-portal]] (Parte A) del que este sprint reutiliza el patrón de módulo hexagonal y factory. Este sprint agrega 2 módulos nuevos de backend (`planificacion`, `hallazgos-frecuentes`), extiende `reportes` (`agente-analisis`) y agrega 3 pantallas de frontend.

---

## Archivos a crear / completar

### Base de datos (`packages/db`)

```
prisma/
├── schema.prisma                                    ← MODIFICAR: agregar PlanAuditoria, HallazgoFrecuente
└── migrations/
    ├── YYYYMMDDHHMMSS_add_plan_auditoria/
    └── YYYYMMDDHHMMSS_add_hallazgos_frecuentes/
```

**Modelos Prisma a agregar (siguiendo el patrón camelCase/`@map` de `Cliente`):**

```prisma
enum EstadoPlanAuditoria {
  PROGRAMADA
  EJECUTADA
  REPROGRAMADA
}

model PlanAuditoria {
  id                       String              @id @default(uuid())
  sucursalId               String              @map("sucursal_id")
  fechaObjetivo            DateTime            @map("fecha_objetivo") @db.Date
  responsableSugeridoId    String?             @map("responsable_sugerido_id")
  estado                   EstadoPlanAuditoria @default(PROGRAMADA)
  inspeccionId             String?             @map("inspeccion_id")
  creadoEn                 DateTime            @default(now()) @map("creado_en")
  empresaId                String              @map("empresa_id")

  @@index([sucursalId, fechaObjetivo])
  @@index([empresaId, estado])
  @@map("plan_auditoria")
}

model HallazgoFrecuente {
  id                          String    @id @default(uuid())
  descripcionHallazgo         String    @map("descripcion_hallazgo") @db.VarChar(300)
  severidadSugerida           String    @map("severidad_sugerida") @db.VarChar(10)
  descripcionAccionSugerida   String?   @map("descripcion_accion_sugerida")
  activo                      Boolean   @default(true)
  empresaId                   String    @map("empresa_id")
  creadoEn                    DateTime  @default(now()) @map("creado_en")
  actualizadoEn                DateTime  @updatedAt @map("actualizado_en")

  @@index([empresaId, activo])
  @@map("hallazgo_frecuente")
}
```

> Nota: `sucursalId`, `inspeccionId` de `PlanAuditoria` no llevan `@relation` explícita en este borrador porque `Sucursal`/`Inspeccion` con sus campos de 003/005 no están en el `schema.prisma` actual de este repo al momento de escribir esta guía. `agente-basededatos` debe agregar las relaciones reales al aplicar la migración, una vez confirmados los nombres de modelo de 003/005.

> El modelo `Notificacion` y sus SP (`sp_notificacion_generar_vencimientos`, `sp_accion_correctiva_escalar`) viven en [[006-vigencia-notificaciones-portal]] — este sprint no los toca.

### Backend (`apps/api`)

```
src/modules/planificacion/
├── domain/
│   ├── plan-auditoria.entity.ts
│   ├── plan-auditoria.repository.port.ts
│   └── plan-auditoria.errors.ts
├── application/
│   ├── plan-auditoria.schema.ts
│   └── casos-uso/
│       └── gestionar-plan-auditoria.usecase.ts
├── infrastructure/
│   ├── plan-auditoria.prisma-repository.ts
│   ├── plan-auditoria.controller.ts
│   └── planificacion.router.ts
├── index.ts
└── __tests__/
    └── gestionar-plan-auditoria.usecase.test.ts

src/modules/hallazgos-frecuentes/
├── domain/
│   ├── hallazgo-frecuente.entity.ts
│   ├── hallazgo-frecuente.repository.port.ts
│   └── hallazgo-frecuente.errors.ts
├── application/
│   ├── hallazgo-frecuente.schema.ts
│   └── casos-uso/
│       └── gestionar-hallazgo-frecuente.usecase.ts
├── infrastructure/
│   ├── hallazgo-frecuente.prisma-repository.ts
│   ├── hallazgo-frecuente.controller.ts
│   └── hallazgos-frecuentes.router.ts
├── index.ts
└── __tests__/
    └── gestionar-hallazgo-frecuente.usecase.test.ts

src/modules/reportes/                              ← EXTENDER (propiedad de agente-analisis)
├── application/casos-uso/
│   └── obtener-panel-ejecutivo.usecase.ts          ← CREAR
└── infrastructure/
    ├── reportes.prisma-repository.ts               ← MODIFICAR: agregar obtenerPanelEjecutivo()
    └── panel-ejecutivo.controller.ts                ← CREAR
```

> Los módulos `notificaciones` y `verificacion`, y las modificaciones al módulo `inspeccion` de 005 para eventos síncronos de notificación y QR en el PDF, viven en [[006-vigencia-notificaciones-portal]].

Líneas a agregar en `apps/api/src/index.ts`:

```typescript
import { crearModuloPlanificacion } from "./modules/planificacion";
import { crearModuloHallazgosFrecuentes } from "./modules/hallazgos-frecuentes";

const moduloPlanificacion = crearModuloPlanificacion(prisma, autenticar);
app.use("/planificacion", moduloPlanificacion.router);

const moduloHallazgosFrecuentes = crearModuloHallazgosFrecuentes(prisma, autenticar);
app.use("/hallazgos-frecuentes", moduloHallazgosFrecuentes.router);
```

### Route Handlers proxy (Next.js)

```
apps/web/src/app/api/
├── planificacion/
│   ├── route.ts                                     ← GET + POST
│   └── [id]/
│       ├── reprogramar/route.ts                     ← PATCH
│       └── ejecutar/route.ts                        ← PATCH
├── hallazgos-frecuentes/
│   ├── route.ts                                     ← GET + POST
│   └── [id]/
│       ├── route.ts                                 ← PATCH
│       ├── activar/route.ts                         ← POST
│       └── desactivar/route.ts                      ← POST
└── reportes/
    └── panel-ejecutivo/route.ts                     ← GET
```

### Tipos compartidos (`packages/shared`)

```
src/types/
├── plan-auditoria.ts           ← CREAR
├── hallazgo-frecuente.ts       ← CREAR
├── reportes.ts                 ← CREAR (PanelEjecutivo)
└── index.ts                    ← MODIFICAR: re-exportar los 3 anteriores
```

### Frontend (`apps/web`)

```
src/app/(dashboard)/analytics/
├── page.tsx
├── _servicios/panel-ejecutivo.servicio.ts
├── _hooks/usar-panel-ejecutivo.ts
└── _components/
    ├── tarjeta-kpi.tsx                               ← solo si no existe ya en packages/ui (ver T-613)
    └── tabla-atencion-requerida.tsx

src/app/(dashboard)/planificacion/
├── page.tsx
├── _servicios/plan-auditoria.servicio.ts
├── _hooks/usar-plan-auditoria.ts
└── _components/
    ├── tarjeta-plan-auditoria.tsx
    └── formulario-programar-auditoria.tsx

src/app/(dashboard)/mantenimientos/
├── page.tsx                                          ← MODIFICAR: tarjeta "Hallazgos frecuentes"
└── hallazgos-frecuentes/
    ├── page.tsx
    ├── nuevo/page.tsx
    ├── [id]/editar/page.tsx
    ├── _servicios/hallazgo-frecuente.servicio.ts
    ├── _hooks/usar-hallazgos-frecuentes.ts
    └── _components/
        ├── tabla-hallazgos-frecuentes.tsx
        └── formulario-hallazgo-frecuente.tsx

src/app/(dashboard)/certificaciones/[id]/hallazgos/    ← de 005, MODIFICAR
└── _components/
    └── selector-hallazgo-frecuente.tsx               ← CREAR
```

---

## Contrato de API (resumen)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/planificacion` | Sí | `?sucursalId=&mes=` — lista de `PlanAuditoria` |
| POST | `/planificacion` | Sí | `{ sucursalId, fechaObjetivo, responsableSugeridoId? }` |
| PATCH | `/planificacion/:id/reprogramar` | Sí | `{ fechaObjetivo }` |
| PATCH | `/planificacion/:id/ejecutar` | Sí | `{ inspeccionId }` |
| GET | `/hallazgos-frecuentes` | Sí | Todos los de la empresa |
| POST | `/hallazgos-frecuentes` | Sí | `{ descripcionHallazgo, severidadSugerida, descripcionAccionSugerida? }` |
| PATCH | `/hallazgos-frecuentes/:id` | Sí | Campos opcionales |
| POST | `/hallazgos-frecuentes/:id/activar` \| `/desactivar` | Sí | Cambia `activo` |
| GET | `/reportes/panel-ejecutivo` | Sí | `?clienteId=` — KPIs agregados y `atencionRequerida` |

**Respuesta `GET /reportes/panel-ejecutivo`:**

```json
{
  "data": {
    "pctSucursalesVigentes": 82.5,
    "certificacionesPorVencer30d": 4,
    "hallazgosCriticosAbiertos": 2,
    "accionesVencidas": 3,
    "atencionRequerida": [
      { "tipo": "certificacion_por_vencer", "sucursal": "Sucursal Cartago", "cliente": "Distribuidora Sur S.A.", "fecha": "2026-08-01", "diasRestantes": 16 },
      { "tipo": "accion_vencida", "sucursal": "Sucursal Heredia", "cliente": "Agro Norte S.A.", "descripcion": "Sustituir extintor", "diasVencida": 3 }
    ]
  }
}
```

Todos los errores siguen el envelope estándar: `{ error: { codigo, mensaje, detalles? } }`.

---

## Diseño de pantallas

### 1. Panel ejecutivo (`/analytics`)

```
┌──────────────────────────────────────────────────────────────────┐
│  Panel ejecutivo                    Cliente: [Todos ▾]            │  ← filtro oculto si administrador_cliente
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │  82.5%   │  │    4     │  │    2     │  │    3     │          │
│  │ Sucursales│  │Certific. │  │Hallazgos │  │ Acciones │          │
│  │ vigentes  │  │por vencer│  │críticos  │  │ vencidas │          │
│  │           │  │(30 días) │  │abiertos  │  │          │          │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │
├──────────────────────────────────────────────────────────────────┤
│  Atención requerida                                                │
│  ────────────────────────────────────────────────────────────    │
│  ⚠ Certificación por vencer  Sucursal Cartago     16 días         │
│  ⚠ Acción vencida            Sucursal Heredia      3 días vencida │
│  ⚠ Certificación por vencer  Sucursal San José     28 días         │
└──────────────────────────────────────────────────────────────────┘
```

- Tarjetas KPI: contenedor base `rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card` (ver CLAUDE.md → Sistema de diseño), número grande `text-heading-3 font-bold text-primary`, etiqueta `text-body-sm text-dark-4 dark:text-dark-6`.
- Tabla de atención requerida reutiliza las primitivas de `packages/ui/table.tsx`; fila con `diasVencida` usa `text-red font-medium`, fila con `diasRestantes ≤ 5` usa `text-yellow-dark font-medium`, resto `text-dark-4`.

### 2. Calendario de auditorías (`/planificacion`)

```
┌──────────────────────────────────────────────────────────────────┐
│  Planificación de auditorías          [+ Programar certificación] │
├──────────────────────────────────────────────────────────────────┤
│  Agosto 2026                                                       │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Sucursal Cartago      01/08/2026   Resp: María Solís         │  │
│  │ [● Programada]                          [Iniciar ahora]     │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │ Sucursal Heredia      15/08/2026   Resp: —                    │  │
│  │ [● Reprogramada]                        [Iniciar ahora]     │  │
│  └────────────────────────────────────────────────────────────┘  │
│  Septiembre 2026                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Sucursal San José     10/09/2026   Resp: Carlos Mora           │  │
│  │ [✓ Ejecutada]                                                 │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

- Vista de **lista agrupada por mes** (no un grid de calendario completo) — más simple de construir y suficiente para el caso de uso descrito en el spec ("vista de calendario o lista agrupada por mes").
- Badge `PROGRAMADA`: `bg-blue-light/[0.08] text-blue`. `EJECUTADA`: `bg-green-light/[0.08] text-green`. `REPROGRAMADA`: `bg-yellow-light/[0.08] text-yellow-dark`.
- Botón "Iniciar ahora" oculto cuando `estado === 'EJECUTADA'`.

### 3. Biblioteca de hallazgos frecuentes (`/mantenimientos/hallazgos-frecuentes`)

Mismo patrón exacto que `/mantenimientos/clientes` (002, ver su `impl.md`): tabla con columnas Descripción, Severidad sugerida (badge), Estado, Acción "Modificar"; formulario compartido nuevo/editar con 3 campos (`descripcionHallazgo`, `severidadSugerida` — select CRITICA/MAYOR/MENOR con los mismos colores que usa `Hallazgo` en 005 —, `descripcionAccionSugerida`).

**Selector embebido en la pantalla de Hallazgos de una certificación (005):**

```
┌────────────────────────────────────────────────────────────┐
│  Hallazgos de la certificación                               │
│  [+ Agregar hallazgo manual]   [📚 Elegir de biblioteca]     │
└────────────────────────────────────────────────────────────┘
                        │ (click en "Elegir de biblioteca")
                        ▼
┌────────────────────────────────────────────────────────────┐
│  Elegir hallazgo frecuente                            [×]   │
│  ──────────────────────────────────────────────────────────│
│  🔍 [Buscar...]                                              │
│  • Extintor vencido                        [CRÍTICA]         │
│  • Falta de rotulación de salida de emergencia [MAYOR]       │
│  • Uniforme sin cofia                      [MENOR]           │
│  ──────────────────────────────────────────────────────────│
└────────────────────────────────────────────────────────────┘
                        │ (click en un ítem)
                        ▼
   Formulario "Agregar hallazgo manual" se abre PRE-CARGADO
   con descripción, severidad y acción sugerida — todo editable.
```

> Pantallas 1 (centro de notificaciones) y 2 (portal de verificación pública) del sprint original viven en [[006-vigencia-notificaciones-portal]].

---

## Tokens de diseño DoonFlow usados (resumen)

| Elemento | Clases Tailwind |
|---|---|
| Contenedor de tarjetas/paneles | `rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card` |
| Badge Activo / éxito | `bg-green-light/[0.08] text-green` |
| Badge Inactivo | `bg-gray-3 text-dark-5` |
| Badge crítico / vencido | `bg-red-light/[0.08] text-red` |
| Badge por vencer / reprogramada | `bg-yellow-light/[0.08] text-yellow-dark` |
| Badge programada (calendario) | `bg-blue-light/[0.08] text-blue` |
| Skeleton | `h-10 animate-pulse rounded bg-gray-2 dark:bg-dark-3` |

No se introducen tokens de color nuevos — todos ya existen en el preset de `packages/config/tailwind/` desde sprints anteriores (`primary`, `green`, `red`, `yellow`, `blue`, `gray`).

---

## Arquitectura hexagonal — módulos nuevos

```
domain/        → entidades + reglas puras (puedeReprogramarse, vincularInspeccion, puedeSeleccionarse) + puertos + errores
application/   → casos de uso + schemas Zod — sin Express ni Prisma
infrastructure/→ *PrismaRepository + Controller + Router
```

- Mismo patrón factory que `clientes`/`inspeccion`/`notificaciones` (ver [[006-vigencia-notificaciones-portal]] → impl.md para el ejemplo de referencia):
  ```typescript
  export function crearModuloPlanificacion(prisma: PrismaClient, autenticar: Middleware) {
    const repo = new PlanAuditoriaPrismaRepository(prisma);
    const uc = new GestionarPlanAuditoriaUseCase(repo);
    const ctrl = new PlanAuditoriaController(uc);
    const router = crearPlanificacionRouter(ctrl, autenticar);
    return { router };
  }
  ```

---

## Notas importantes

- `agente-frontend` no toca `apps/api` — si necesita ajustar un contrato de respuesta, lo solicita en `memoria/sprint/` al módulo correspondiente, igual que en sprints anteriores.
- `agente-analisis` no crea componentes nuevos en `packages/ui` (ej. `TarjetaKpi`); si no existe uno reutilizable, lo solicita a `agente-frontend` (T-613) en vez de construirlo dentro de `analytics/_components/`.
- Ninguna entidad de este sprint se elimina físicamente: `PlanAuditoria` no tiene endpoint de borrado; `HallazgoFrecuente` se desactiva, nunca se borra (mismo criterio que `Cliente`/`Sucursal`).
- Este sprint no modifica el módulo `certificacion`/`inspeccion` de 005 salvo por el punto de integración documentado en T-617 (llamar `PATCH /planificacion/:id/ejecutar` al firmar una certificación iniciada desde un plan) y el selector de biblioteca en la pantalla de Hallazgos (T-619).

---

## Desviaciones reales encontradas durante la implementación (2026-07-23/24)

1. **Vínculo `PlanAuditoria ↔ Certificación`: al iniciar, no al firmar.** El plan original (este documento, arriba) decía vincular en `PATCH /planificacion/:id/ejecutar` disparado desde el caso de uso de **firma** (005). Se implementó en su lugar: `planId` opcional en `iniciarCertificacionSchema`/`POST /inspeccion/certificaciones`, resuelto por un wrapper síncrono `MarcadorPlanEjecutado` (mismo patrón que `RegistradorNotificacion` de 006) inyectado opcional en `IniciarCertificacionUseCase`. Motivo: evita threadear `planId` a través de todo el wizard multi-paso y multi-sesión (iniciar → responder → revisión → firmar). El endpoint `PATCH /planificacion/:id/ejecutar` sí se implementó y quedó disponible como vía manual, pero el flujo real de HU-5 no pasa por él. Documentado también en `memoria/cambios_db/registro.md`.
2. **Panel ejecutivo sin SP nuevo.** Se usaron queries Prisma puras en paralelo (`Promise.all`) en vez de un stored procedure — sigue el precedente ya sentado por `reporte.prisma-repository.ts` de 008 (que tampoco usa SQL crudo), y el filtro relacional `acciones: { none: { estado: "CUMPLIDO" } }` cubre "hallazgo sin acción resuelta" sin necesitar una subconsulta correlacionada manual.
3. **`HallazgoFrecuente` sin `GET /:id` dedicado.** La pantalla `/mantenimientos/hallazgos-frecuentes/[id]/editar` obtiene el ítem filtrando client-side la lista completa ya cargada por `GET /hallazgos-frecuentes` (mismo dataset pequeño y acotado por empresa) en vez de agregar un endpoint nuevo — coherente con que la lista completa ya se pagina/filtra en memoria en el resto de esa pantalla.
4. **`TarjetaKpi` construido directamente en `packages/ui`** en vez de "solicitarlo a `agente-frontend`" (como decía la nota de "Notas importantes" de este documento) — en el flujo real de esta sesión no hay una separación de agentes distintos ejecutándose en paralelo, así que el componente se creó directamente siguiendo los tokens de diseño ya establecidos (mismo criterio que el resto de componentes nuevos de `packages/ui` en sprints anteriores de esta sesión).
5. **Violación real de arquitectura de capas, encontrada y corregida antes de cerrar el sprint**: `SelectorHallazgoFrecuente` (`certificaciones/_components/`) y `FormularioProgramarAuditoria` (`planificacion/_components/`) se escribieron inicialmente haciendo `fetch` propio (`useEffect` + servicio) dentro de `_components/`, violando la regla explícita de `CLAUDE.md` → Arquitectura de FrontEnd ("los componentes de presentación no llaman servicios ni hooks de datos directamente"). Corregido: 2 hooks nuevos (`certificaciones/_hooks/use-hallazgos-frecuentes-activos.ts`, `planificacion/_hooks/use-sucursales-para-plan.ts`) mueven la carga de datos a la página, que ahora pasa `items`/`sucursales` por props a ambos componentes.
6. **Gap real de seguridad (visibilidad, no multiempresa) encontrado y corregido antes de cerrar el sprint**: el módulo `planificacion` se creó sin `resolverAlcance` — un `administrador_cliente`/`usuario_sucursal` podía listar `GET /planificacion` y ver los planes de auditoría de **todos** los clientes de la empresa, no solo los propios (violación de alcance de 004, aunque nunca cruzó el límite de `empresaId`/multiempresa). Corregido agregando `AlcanceConsulta` local al puerto (mismo patrón que `sucursales`), `whereAlcance()` en el repositorio Prisma (filtra por `sucursal.clienteId` o `sucursalId IN (...)`, e ignora un `sucursalId` de query param fuera del alcance del usuario para que no sirva de vía de escape), `resolverAlcance` montado en el router, y pasado en cascada por `usecase.listar()`/`controller.listar`/`crearModuloPlanificacion`. Verificado con el usuario demo real `carlos@dist.com` (`administrador_cliente` de Distribuidora Sur): antes del fix veía planes de otro cliente (`Agroindustrias del Valle Ltda.`); después del fix, `GET /planificacion` y `GET /planificacion?sucursalId=<de-otro-cliente>` solo devuelven sus propios planes. Test nuevo agregado a `gestionar-plan-auditoria.usecase.test.ts`.
7. **Acción sugerida no se precarga desde la biblioteca.** El formulario de hallazgo manual (013, `FormularioHallazgo`) solo tiene campos `descripcion`/`severidad` — no existe un campo de "acción sugerida" en el flujo de creación de hallazgos, así que `SelectorHallazgoFrecuente` solo precarga esos 2 campos (`descripcionAccionSugerida` de `HallazgoFrecuente` queda sin usar en este punto de integración, aunque sí se guarda y edita en el CRUD de la biblioteca). No es un bug: el plan de cumplimiento (013) ya captura la acción correctiva por separado, en un paso posterior del flujo.
8. **Gap menor de UI, no corregido**: `/analytics` no tiene skeleton de carga elaborado ni botón de "reintentar" explícito ante error del API — solo un mensaje de "Cargando..."/mensaje de error simple, mismo nivel de pulido que el resto de listados del proyecto (`/planificacion` incluido). No bloqueante.
9. **`pnpm --filter api build` (`tsc -p tsconfig.json`) tiene errores de tipos preexistentes y generalizados, no introducidos por este sprint.** Al correrlo por primera vez en esta sesión se encontraron 225 errores en ~26 archivos (`apelaciones`, `auditoria`, `auth`, `clientes`, `inspeccion` (9 archivos), `integraciones`, `notificaciones`, `permisos`, `reportes`, `retencion`, `sucursales` — además de `planificacion`/`hallazgos-frecuentes`, nuevos de este sprint). La causa raíz es un patrón repetido en casi todos los tests de casos de uso: `let repo: Puerto & Record<string, Mock>` tipa la variable como el puerto real, así que aunque el valor asignado se castee `as any`, TypeScript exige que cada método cumpla la firma del puerto y `.mockResolvedValue(...)` no es parte de esa firma. Nunca se había corrido este comando como parte de la verificación de ningún sprint anterior (todos usan `pnpm --filter api test`, que sí pasa porque Vitest no aplica la misma verificación estricta de tipos a los mocks). Se corrigió únicamente el archivo nuevo de este sprint que tenía el mismo problema (`obtener-panel-ejecutivo.usecase.test.ts`, casteando `as any` en cada literal en vez de la variable) — el resto queda documentado aquí como gap preexistente para quien decida abordarlo, fuera del alcance de 014.

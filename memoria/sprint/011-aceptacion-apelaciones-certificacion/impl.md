# Guía de implementación — 011-aceptacion-apelaciones-certificacion

> Referencia técnica para los agentes. Describe qué construir y dónde, sin escribir el código — el código va en el repositorio, no aquí.

---

## Decisiones de diseño propias (por ambigüedad de la spec)

La spec (`spec.md`) deja explícitamente pendientes algunos puntos; para poder planificar tareas concretas se toman las siguientes decisiones, todas reversibles y a confirmar con negocio antes de implementar en firme:

1. **Campo `estado` en `Hallazgo` (no reutilizar `severidad`)**: la spec dice "campo `severidad`/estado del hallazgo, ajuste menor". Reutilizar `severidad` (que ya vale `CRITICA`/`MAYOR`/`MENOR` y determina `resultadoFinal`) para además contener `ANULADO_POR_APELACION` rompería el cálculo de severidad existente de [[013-hallazgos-plan-cumplimiento]]. Se agrega un campo **nuevo y separado** `estado: EstadoHallazgo` (`ACTIVO` / `ANULADO_POR_APELACION`), y `recalcularResultadoFinal()` filtra por `estado === "ACTIVO"` antes de aplicar la regla de severidad ya existente.
2. **Plazo de apelación configurable**: se implementa como constante `PLAZO_APELACION_DIAS = 15` en `packages/shared/src/constants/apelaciones.ts` (no como columna de BD ni configuración por empresa). Es la opción más simple que cumple "configurable" en el sentido de "un solo lugar del código a cambiar"; si negocio pide que varíe por empresa o por plantilla, es un sprint futuro de configuración, no una suposición de este.
3. **Apelación `SOBRE_RESULTADO` aceptada**: la spec no define qué pasa operativamente con el `resultadoFinal` cuando se acepta una apelación sobre el resultado general (a diferencia de `SOBRE_HALLAZGO`, que sí tiene regla clara: anular el hallazgo y recalcular). Se decide que aceptar una apelación `SOBRE_RESULTADO` **solo cambia el estado de la apelación** (queda `ACEPTADA` con su comentario) sin tocar automáticamente `resultadoFinal` — cualquier corrección real del resultado requiere que el auditor gestione los hallazgos individuales o ejecute una reinspección (mecanismo ya existente en [[005-certificacion-plan-cumplimiento]]). Se marca explícitamente en el checklist para que no se asuma automatismo que la spec no pidió.
4. **Permiso `apelaciones.resolver`**: se asigna por seed a los roles `auditor` y `administrador_general`, siguiendo el criterio de "no cualquier auditor" mencionado en el contexto de la spec — de todas formas, el checklist de [[007-gobernanza-permisos-aprobacion]] permite ajustar la asignación desde la matriz de permisos sin tocar código.
5. **Ubicación del módulo backend**: `apelaciones` se crea como módulo hexagonal propio (no dentro de `certificacion`) porque tiene su propio ciclo de vida y lista independiente (pantalla "Resolver apelaciones" no cuelga de una certificación puntual). Accede a `Hallazgo`/`Inspeccion` únicamente a través de un puerto expuesto por el módulo `certificacion`, para no duplicar ni violar la propiedad de esas entidades.
6. **Rutas de frontend**: se asume que [[005-certificacion-plan-cumplimiento]] expone el detalle de una certificación en `/certificaciones/[id]` (área operativa, distinta de `/inspecciones/[id]` que es el editor de estructura de la ficha de [[001-crud-formulario]]). Todas las rutas de este sprint cuelgan de esa convención.

---

## Archivos a crear / completar

### Base de datos (`packages/db`)

```
prisma/
├── schema.prisma                                    ← MODIFICAR (ver bloque Prisma abajo)
├── migrations/
│   └── YYYYMMDDHHMMSS_add_aceptacion_apelaciones/
│       └── migration.sql                            ← generada por prisma migrate dev
└── seeds/
    └── permisos-apelaciones.ts                       ← CREAR
```

**Cambios en `schema.prisma`:**

```prisma
model Inspeccion {
  // ...campos existentes de 005...
  aceptadoPorClienteId String?   @map("aceptado_por_cliente_id")
  aceptadoEn           DateTime? @map("aceptado_en")

  apelaciones Apelacion[]
}

enum EstadoHallazgo {
  ACTIVO
  ANULADO_POR_APELACION
}

model Hallazgo {
  // ...campos existentes de 005...
  estado EstadoHallazgo @default(ACTIVO)

  apelaciones Apelacion[]
}

enum TipoApelacion {
  SOBRE_HALLAZGO
  SOBRE_RESULTADO
}

enum EstadoApelacion {
  ABIERTA
  EN_REVISION
  ACEPTADA
  RECHAZADA
}

model Apelacion {
  id                   String          @id @default(uuid())
  empresaId            String          @map("empresa_id")
  inspeccionId         String          @map("inspeccion_id")
  hallazgoId           String?         @map("hallazgo_id")
  tipo                 TipoApelacion
  motivo               String
  solicitadoPorId      String          @map("solicitado_por_id")
  solicitadoEn         DateTime        @default(now()) @map("solicitado_en")
  estado               EstadoApelacion @default(ABIERTA)
  resueltoPorId        String?         @map("resuelto_por_id")
  resueltoEn           DateTime?       @map("resuelto_en")
  resolucionComentario String?         @map("resolucion_comentario")

  inspeccion Inspeccion @relation(fields: [inspeccionId], references: [id])
  hallazgo   Hallazgo?  @relation(fields: [hallazgoId], references: [id])

  @@index([empresaId, estado])
  @@index([inspeccionId])
  @@index([hallazgoId])
  @@map("apelacion")
}
```

### Backend (`apps/api`)

```
src/modules/apelaciones/
├── domain/
│   ├── apelacion.entity.ts              ← CREAR: tipo Apelacion + estaDentroDePlazo() + puedeResolver() + puedeApelar()
│   ├── apelacion.repository.port.ts     ← CREAR
│   └── apelacion.errors.ts              ← CREAR: 8 errores de dominio
├── application/
│   ├── apelacion.schema.ts              ← CREAR: crearApelacionSchema + resolverApelacionSchema
│   └── casos-uso/
│       ├── presentar-apelacion.usecase.ts
│       ├── resolver-apelacion.usecase.ts
│       └── listar-apelaciones.usecase.ts
├── infrastructure/
│   ├── apelacion.prisma-repository.ts
│   ├── apelacion.controller.ts
│   └── apelaciones.router.ts
├── index.ts                             ← crearModuloApelaciones(prisma, autenticar, autorizar, puertoCertificacion)
└── __tests__/
    ├── apelacion.entity.test.ts
    ├── presentar-apelacion.usecase.test.ts
    ├── resolver-apelacion.usecase.test.ts
    └── aceptar-certificacion.usecase.test.ts        ← vive en __tests__ de certificacion, listado aquí como referencia

src/modules/inspeccion/                               ← MÓDULO EXISTENTE de 001/005/013, EXTENDER (NO es `modules/certificacion/` — nombre confirmado en `005-certificacion-plan-cumplimiento/impl.md`)
├── domain/
│   └── hallazgo.entity.ts               ← AGREGAR (archivo de [[013-hallazgos-plan-cumplimiento]]): anularHallazgoPorApelacion(), recalcularResultadoFinal()
├── application/
│   └── casos-uso/
│       └── aceptar-certificacion.usecase.ts          ← CREAR
├── infrastructure/
│   ├── certificacion.controller.ts      ← AGREGAR handler `aceptar`
│   └── inspeccion.router.ts             ← AMPLIAR ruta POST /inspeccion/certificaciones/:id/aceptar
└── index.ts                             ← exponer puerto de lectura/escritura de Hallazgo+Inspeccion para el módulo apelaciones
```

Líneas a agregar en `apps/api/src/index.ts`:
```typescript
import { crearModuloApelaciones } from "./modules/apelaciones";
// moduloCertificacion ya montado por 005; se reutiliza su puerto:
const moduloApelaciones = crearModuloApelaciones(prisma, autenticar, autorizar, moduloCertificacion.puertoApelaciones);
app.use("/apelaciones", moduloApelaciones.router);
```

### Route Handlers proxy (Next.js)

```
apps/web/src/app/api/
├── apelaciones/
│   ├── route.ts                         ← GET (lista) + POST (crear)
│   └── [id]/
│       ├── route.ts                     ← GET (detalle)
│       └── resolver/route.ts            ← POST
└── inspeccion/certificaciones/[id]/     ← dentro del árbol de proxy `api/inspeccion/` ya existente desde 005
    ├── aceptar/route.ts                 ← POST
    └── apelaciones/route.ts             ← GET (historial de la certificación)
```

### Tipos compartidos (`packages/shared`)

```
src/types/apelacion.ts                   ← CREAR: Apelacion, TipoApelacion, EstadoApelacion
src/constants/apelaciones.ts             ← CREAR: PLAZO_APELACION_DIAS = 15
src/index.ts                             ← MODIFICAR: re-exportar ambos
```

```typescript
export interface Apelacion {
  id: string;
  empresaId: string;
  inspeccionId: string;
  hallazgoId?: string;
  tipo: "SOBRE_HALLAZGO" | "SOBRE_RESULTADO";
  motivo: string;
  solicitadoPorId: string;
  solicitadoEn: string;
  estado: "ABIERTA" | "EN_REVISION" | "ACEPTADA" | "RECHAZADA";
  resueltoPorId?: string;
  resueltoEn?: string;
  resolucionComentario?: string;
}
```

### Frontend (`apps/web`)

```
src/app/(dashboard)/certificaciones/[id]/                 ← ÁREA EXISTENTE de 005, EXTENDER
├── page.tsx                                                ← MODIFICAR: renderiza TarjetaAceptacionCertificacion
├── apelacion/
│   └── nueva/
│       └── page.tsx                                        ← CREAR
├── _servicios/
│   └── certificacion.servicio.ts                           ← MODIFICAR: agregar aceptarCertificacion(id)
├── _hooks/
│   ├── usar-certificacion.ts                               ← MODIFICAR: agregar aceptar() y pendienteDeAceptacion
│   └── usar-presentar-apelacion.ts                          ← CREAR
└── _components/
    ├── tarjeta-aceptacion-certificacion.tsx                 ← CREAR
    └── formulario-apelacion.tsx                             ← CREAR

src/app/(dashboard)/apelaciones/
├── page.tsx                             ← CREAR: lista de apelaciones abiertas
├── [id]/
│   └── page.tsx                         ← CREAR: detalle + resolución
├── _servicios/
│   └── apelacion.servicio.ts            ← CREAR
├── _hooks/
│   ├── usar-apelaciones.ts              ← CREAR
│   └── usar-resolver-apelacion.ts       ← CREAR
└── _components/
    ├── tabla-apelaciones.tsx            ← CREAR
    ├── badge-estado-apelacion.tsx       ← CREAR
    └── panel-resolucion-apelacion.tsx   ← CREAR

src/app/(dashboard)/_components/sidebar.tsx              ← MODIFICAR: entrada "Apelaciones" (gate por permiso apelaciones.resolver)

src/app/(dashboard)/certificaciones/[id]/__tests__/
├── tarjeta-aceptacion-certificacion.test.tsx
└── formulario-apelacion.test.tsx

src/app/(dashboard)/apelaciones/__tests__/
├── tabla-apelaciones.test.tsx
├── badge-estado-apelacion.test.tsx
├── panel-resolucion-apelacion.test.tsx
└── usar-apelaciones.test.ts
```

---

## Diseño de las 3 pantallas

### 1. Aceptar certificación (vista del cliente) — dentro de `/certificaciones/[id]`

Tarjeta que aparece **sobre** el resumen habitual de la certificación, solo cuando `estado === "FIRMADA" && aceptadoEn === null`:

```
┌─────────────────────────────────────────────────────────────────────┐
│  ⓘ  Certificación pendiente de tu confirmación                      │
│      Firmada el 10/07/2026 por Ana Rodríguez (auditora).            │
│      Al aceptar confirmas que revisaste el resultado.               │
│                                                                       │
│      [ Aceptar ]         Presentar apelación en su lugar →           │
└─────────────────────────────────────────────────────────────────────┘
```

Estilo: `rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card border-l-4 border-primary p-4`. Botón "Aceptar" con `variante="primario"` del `Boton` de `packages/ui`. El enlace de apelación usa `text-sm font-medium text-primary hover:underline`.

Al aceptar, la tarjeta desaparece sin recargar (el hook actualiza `aceptadoEn` en el estado local tras la respuesta del API).

---

### 2. Presentar apelación — `/certificaciones/[id]/apelacion/nueva`

```
┌────────────────────────────────────────────────────────────┐
│ Certificaciones > [Sucursal] > Presentar apelación [Breadcrumb]│
├────────────────────────────────────────────────────────────┤
│ Presentar apelación                                          │
│ Plazo restante: 9 días (vence 25/07/2026)                    │
│ ─────────────────────────────────────────────────────────── │
│                                                                │
│  ¿Sobre qué apelas? *                                        │
│  ( ) Un hallazgo específico     (•) El resultado general      │
│                                                                │
│  Hallazgo *                          ← solo si "hallazgo específico"│
│  [ Extintor vencido — CRÍTICA          ▼ ]                   │
│                                                                │
│  Motivo *                                                     │
│  [___________________________________________________]       │
│  [___________________________________________________]       │
│  Mínimo 10 caracteres                                         │
│                                                                │
│  ─────────────────────────────────────────────────────────── │
│  [   Enviar apelación   ]                    [   Cancelar   ] │
└────────────────────────────────────────────────────────────┘
```

- Si el plazo ya venció, el aviso cambia a `text-red` ("El plazo para apelar esta certificación venció el [fecha]") y el formulario se deshabilita (botón "Enviar apelación" oculto).
- El selector de hallazgos lista solo los hallazgos con `estado === "ACTIVO"` de esa certificación (no tiene sentido apelar uno ya anulado).
- Al enviar exitosamente, redirige a `/certificaciones/[id]` y muestra la apelación recién creada en una sección "Apelaciones de esta certificación" con badge `ABIERTA`.

---

### 3. Resolver apelaciones — `/apelaciones` (lista) y `/apelaciones/[id]` (detalle)

**Lista** (`/apelaciones`), visible solo con permiso `apelaciones.resolver`:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Apelaciones                                                                │
│ Apelaciones abiertas, ordenadas por antigüedad                            │
├──────────────────────────────────────────────────────────────────────────┤
│  CERTIFICACIÓN / SUCURSAL    TIPO             SOLICITADO POR   ANTIGÜEDAD  ESTADO │
│  ──────────────────────────────────────────────────────────────────────  │
│  Planta Central — Jul 2026   Sobre hallazgo    Juan Pérez        6 días    ● Abierta │
│  Sucursal Norte — Jun 2026   Sobre resultado   María Solís       2 días    ● Abierta │
│  ──────────────────────────────────────────────────────────────────────  │
└──────────────────────────────────────────────────────────────────────────┘
```

Fila completa clickeable → navega a `/apelaciones/[id]`. Badge `● Abierta`/`● En revisión` en `bg-yellow-light/[0.08] text-yellow-dark`.

**Detalle** (`/apelaciones/[id]`):

```
┌────────────────────────────────────────────────────────────┐
│ Apelaciones > Planta Central — Jul 2026        [Breadcrumb] │
├────────────────────────────────────────────────────────────┤
│  Certificación: Planta Central — Julio 2026 (FIRMADA)        │
│  Firmada por: Ana Rodríguez, 10/07/2026                      │
│  Hallazgo apelado: "Extintor vencido" — CRÍTICA               │
│  Solicitado por: Juan Pérez, 16/07/2026                       │
│  ─────────────────────────────────────────────────────────── │
│  Motivo del cliente:                                          │
│  "El extintor fue reemplazado el mismo día pero no se          │
│   actualizó la foto de evidencia a tiempo."                   │
│  ─────────────────────────────────────────────────────────── │
│  Justificación de la resolución *                             │
│  [___________________________________________________]       │
│  ─────────────────────────────────────────────────────────── │
│  [   Aceptar apelación   ]        [   Rechazar apelación   ]  │
└────────────────────────────────────────────────────────────┘
```

- Ambos botones quedan deshabilitados hasta que el textarea de justificación tiene contenido.
- Si el usuario autenticado es el mismo `firmadoPorId` de la certificación, la sección de resolución se reemplaza por un aviso: "No puedes resolver una apelación sobre una certificación que tú mismo firmaste" (`bg-red-light/[0.08] text-red`), sin ocultar el resto del detalle.
- Al aceptar una apelación `SOBRE_HALLAZGO`, tras la respuesta exitosa se muestra confirmación: "Apelación aceptada. El hallazgo fue anulado y el resultado de la certificación se recalculó a [nuevo resultado]."

---

## Contrato de API (resumen)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/inspeccion/certificaciones/:id/aceptar` | Cliente acepta el resultado de la certificación firmada |
| GET | `/inspeccion/certificaciones/:id/apelaciones` | Historial de apelaciones de una certificación (cualquier estado) |
| POST | `/apelaciones` | Presentar apelación — `{ inspeccionId, tipo, hallazgoId?, motivo }` |
| GET | `/apelaciones` | Lista apelaciones abiertas (`ABIERTA`/`EN_REVISION`) de la empresa, requiere `apelaciones.resolver` |
| GET | `/apelaciones/:id` | Detalle de una apelación |
| POST | `/apelaciones/:id/resolver` | `{ estado: "ACEPTADA" \| "RECHAZADA", resolucionComentario }`, requiere `apelaciones.resolver` |

**Request — presentar apelación:**
```json
{
  "inspeccionId": "uuid",
  "tipo": "SOBRE_HALLAZGO",
  "hallazgoId": "uuid",
  "motivo": "El extintor fue reemplazado el mismo día pero no se actualizó la evidencia a tiempo."
}
```

**Response exitosa:**
```json
{
  "data": {
    "id": "uuid",
    "empresaId": "uuid",
    "inspeccionId": "uuid",
    "hallazgoId": "uuid",
    "tipo": "SOBRE_HALLAZGO",
    "motivo": "...",
    "solicitadoPorId": "uuid",
    "solicitadoEn": "2026-07-16T00:00:00.000Z",
    "estado": "ABIERTA",
    "resueltoPorId": null,
    "resueltoEn": null,
    "resolucionComentario": null
  }
}
```

**Request — resolver apelación:**
```json
{ "estado": "ACEPTADA", "resolucionComentario": "Se verificó la factura de reemplazo del extintor con fecha anterior a la firma." }
```

**Errores:**
```json
{ "error": { "codigo": "certificacion_no_firmada", "mensaje": "Solo se puede apelar o aceptar una certificación ya firmada." } }
{ "error": { "codigo": "certificacion_ya_aceptada", "mensaje": "Esta certificación ya fue aceptada." } }
{ "error": { "codigo": "plazo_apelacion_vencido", "mensaje": "El plazo para apelar esta certificación ya venció." } }
{ "error": { "codigo": "certificacion_vencida", "mensaje": "No se puede apelar una certificación vencida." } }
{ "error": { "codigo": "apelacion_no_encontrada", "mensaje": "La apelación no existe o no pertenece a esta empresa." } }
{ "error": { "codigo": "apelacion_ya_resuelta", "mensaje": "Esta apelación ya fue resuelta." } }
{ "error": { "codigo": "comentario_resolucion_requerido", "mensaje": "Debes indicar una justificación para resolver la apelación." } }
{ "error": { "codigo": "separacion_funciones_apelacion", "mensaje": "Quien firmó la certificación no puede resolver una apelación sobre ella." } }
```

Todos los errores siguen el envelope estándar de `CLAUDE.md`: `{ error: { codigo, mensaje, detalles? } }`.

---

## Tokens de diseño DoonFlow usados

| Elemento | Clases Tailwind |
|---|---|
| Contenedor de tarjeta/formulario/panel | `rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card` |
| Tarjeta de aceptación pendiente | `border-l-4 border-primary p-4` sobre el contenedor base |
| Badge Abierta/En revisión | `bg-yellow-light/[0.08] text-yellow-dark text-body-xs font-medium px-2.5 py-0.5 rounded-full` |
| Badge Aceptada | `bg-green-light/[0.08] text-green text-body-xs font-medium px-2.5 py-0.5 rounded-full` |
| Badge Rechazada | `bg-red-light/[0.08] text-red text-body-xs font-medium px-2.5 py-0.5 rounded-full` |
| Aviso de plazo vencido / separación de funciones | `bg-red-light/[0.08] text-red` |
| Botón primario (Aceptar) | `variante="primario"` del `Boton` de `packages/ui` |
| Botón secundario (Rechazar/Cancelar) | `variante="secundario"` del `Boton` de `packages/ui` |
| Textarea de justificación | `w-full rounded-lg border border-stroke px-3 py-2 text-sm text-dark focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white` |

No se introducen colores ni componentes nuevos fuera de `packages/ui` — se reutiliza `Boton`, `Breadcrumb`, `DialogoConfirmacion` (para confirmar "Rechazar apelación" antes de enviar, ya que es una acción irreversible) y las primitivas de `Table` ya existentes.

---

## Arquitectura hexagonal — módulo `apelaciones`

```
domain/        → Apelacion + estaDentroDePlazo() + puedeResolver() + puedeApelar() + errores — sin Express ni Prisma
application/   → PresentarApelacionUseCase, ResolverApelacionUseCase, ListarApelacionesUseCase + schemas Zod
infrastructure/→ ApelacionPrismaRepository + ApelacionController + ApelacionesRouter
```

- El controlador extrae `empresaId` y el `usuarioId` de `req.usuario!` (middleware de autenticación); el permiso `apelaciones.resolver` se valida con el middleware `autorizar("apelaciones.resolver")` ya definido por [[007-gobernanza-permisos-aprobacion]] en `apps/api/src/shared/`.
- El repositorio de `apelaciones` aplica `where: { empresaId }` en cada query.
- `ResolverApelacionUseCase` recibe, además de `ApelacionRepositoryPort`, el puerto expuesto por el módulo `certificacion` (inyectado por constructor) para anular el hallazgo y recalcular `resultadoFinal` — nunca importa `HallazgoPrismaRepository` directamente, para no romper la propiedad del módulo `certificacion` sobre esas entidades.
- Mismo patrón factory que los módulos `clientes`/`inspeccion`:
  ```typescript
  export function crearModuloApelaciones(
    prisma: PrismaClient,
    autenticar: Middleware,
    autorizar: (permiso: string) => Middleware,
    puertoCertificacion: PuertoCertificacionParaApelaciones,
  ) {
    const repo = new ApelacionPrismaRepository(prisma);
    const uc = {
      presentar: new PresentarApelacionUseCase(repo, puertoCertificacion),
      resolver: new ResolverApelacionUseCase(repo, puertoCertificacion),
      listar: new ListarApelacionesUseCase(repo),
    };
    const ctrl = new ApelacionController(uc);
    const router = crearApelacionesRouter(ctrl, autenticar, autorizar);
    return { router };
  }
  ```

---

## Notas importantes

- `agente-frontend` no toca `apps/api` — si necesita un endpoint nuevo o un cambio en el contrato, lo solicita en `memoria/sprint/` al módulo correspondiente.
- El campo `empresaId` viene siempre del JWT, nunca del body del request.
- Ninguna apelación ni hallazgo se elimina físicamente — `ANULADO_POR_APELACION` es un estado, no un borrado.
- El recálculo de `resultadoFinal` reutiliza la regla de severidad ya definida en [[013-hallazgos-plan-cumplimiento]] (regla 1.1): sin hallazgos activos → `APROBADA`; solo `MAYOR`/`MENOR` activos → `APROBADA_CON_OBSERVACIONES`; algún `CRITICA` activo → `RECHAZADA`. "Activo" excluye los `ANULADO_POR_APELACION`.
- Este sprint no incluye notificar al cliente cuando una apelación es resuelta — esa notificación, si se requiere, se solicita como ampliación a [[006-vigencia-notificaciones-portal]] (dueño del sistema de notificaciones), no se improvisa aquí.

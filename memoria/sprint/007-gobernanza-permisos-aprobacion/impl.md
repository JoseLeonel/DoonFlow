# Guía de implementación — 007-gobernanza-permisos-aprobacion

> Referencia técnica para los agentes. Describe qué construir y dónde, sin escribir el código — el código va en el repositorio, no aquí.
> Precondición: 001-006 ya implementados. Este sprint **no** rediseña el editor de estructura de [[001-crud-formulario]] — solo agrega el paso de aprobación alrededor de su publicación.

---

## Archivos a crear / completar

### Base de datos (`packages/db`)

```
prisma/
├── schema.prisma                                    ← MODIFICAR: InspeccionPlantilla + enum EstadoAprobacionPlantilla
├── migrations/
│   └── YYYYMMDDHHMMSS_add_aprobacion_plantilla/
│       └── migration.sql                            ← generada por prisma migrate dev
└── seeds/
    └── permisos-gobernanza.ts                       ← CREAR: 3 permisos nuevos (upsert por código)
```

**Campos nuevos en `InspeccionPlantilla` (agregar al modelo ya existente):**
```prisma
enum EstadoAprobacionPlantilla {
  BORRADOR
  EN_REVISION
  APROBADA
  RECHAZADA
}

model InspeccionPlantilla {
  // ...campos ya existentes de 001 sin cambios...
  estadoAprobacion     EstadoAprobacionPlantilla @default(BORRADOR) @map("estado_aprobacion")
  solicitadoPorId      String?   @map("solicitado_por_id")
  solicitadoEn         DateTime? @map("solicitado_en")
  aprobadorId          String?   @map("aprobador_id")
  resueltoEn           DateTime? @map("resuelto_en")
  comentarioResolucion String?   @map("comentario_resolucion")

  solicitante Usuario? @relation("PlantillaSolicitante", fields: [solicitadoPorId], references: [id])
  aprobador   Usuario? @relation("PlantillaAprobador", fields: [aprobadorId], references: [id])

  @@index([empresaId, estadoAprobacion])
}
```

> `Rol`, `Permiso`, `RolPermiso` **no cambian** — ya existen completos desde antes de este sprint (ver `schema.prisma` líneas ~30-66). Este sprint solo construye pantalla y lógica de aplicación sobre ellos.

**Permisos nuevos a sembrar (`permisos-gobernanza.ts`):**

| Código | Descripción |
|---|---|
| `plantillas.enviar_revision` | Enviar una plantilla de ficha a revisión |
| `plantillas.aprobar` | Aprobar o rechazar una plantilla en revisión |
| `permisos.administrar` | Editar la matriz de permisos por rol |

No se crean filas `RolPermiso` por defecto para estos códigos, ni para `administrador` (que los tiene implícitos por regla de negocio — ver middleware). Un administrador humano decide desde la matriz qué otros roles reciben `plantillas.aprobar`, etc.

### Backend (`apps/api`) — módulo nuevo `permisos`

```
src/modules/permisos/
├── domain/
│   ├── rol-permiso.entity.ts          ← esRolAdministrador(), puedeEditarseDesdeMatriz()
│   ├── rol-permiso.repository.port.ts
│   └── rol-permiso.errors.ts          ← RolNoEditableError, RolNoEncontradoError, PermisoInvalidoError
├── application/
│   └── casos-uso/
│       └── gestionar-matriz-permisos.usecase.ts
├── infrastructure/
│   ├── rol-permiso.prisma-repository.ts
│   ├── rol-permiso.controller.ts
│   └── permisos.router.ts
├── index.ts                           ← crearModuloPermisos(prisma, autenticar)
└── __tests__/
    ├── rol-permiso.entity.test.ts
    └── gestionar-matriz-permisos.usecase.test.ts
```

### Backend (`apps/api`) — middleware transversal nuevo

```
src/middleware/
└── permiso.middleware.ts              ← CREAR: requierePermiso(codigo: string)
```

### Backend (`apps/api`) — módulo `inspeccion` (extender, ya existe desde 001)

```
src/modules/inspeccion/
├── domain/
│   ├── plantilla.entity.ts            ← AGREGAR: puedeEnviarseARevision, puedeAprobarse,
│   │                                      puedeRechazarse, debeRevertirABorrador;
│   │                                      ACTUALIZAR: puedeIniciarInspeccion()
│   └── plantilla.errors.ts            ← AGREGAR: EstadoAprobacionInvalidoError,
│                                          ComentarioResolucionRequeridoError, PlantillaSinPreguntasError
├── application/casos-uso/
│   └── gestionar-plantilla.usecase.ts ← AGREGAR: enviarARevision, aprobar, rechazar,
│                                          listarPendientesAprobacion; ACTUALIZAR: actualizar(), actualizarNodo()
├── infrastructure/
│   ├── plantilla.prisma-repository.ts ← AGREGAR: cambiarEstadoAprobacion, listarPendientesAprobacion
│   ├── auditoria.prisma-repository.ts ← CREAR: registrar(entrada) sobre InspeccionAuditoria
│   ├── plantilla.controller.ts        ← AGREGAR 4 handlers
│   └── inspeccion.router.ts           ← AGREGAR 4 rutas
└── __tests__/
    ├── plantilla.entity.test.ts       ← AGREGAR casos
    └── gestionar-plantilla.usecase.test.ts ← AGREGAR casos
```

### Route Handlers proxy (Next.js)

```
apps/web/src/app/api/
├── permisos/
│   ├── matriz/route.ts                          ← GET
│   └── roles/[rolId]/route.ts                   ← PUT
└── inspeccion/plantillas/
    ├── pendientes-aprobacion/route.ts           ← GET
    └── [id]/
        ├── enviar-revision/route.ts             ← POST
        ├── aprobar/route.ts                     ← POST
        └── rechazar/route.ts                    ← POST
```

### Frontend (`apps/web`)

```
src/app/(dashboard)/
├── mantenimientos/
│   ├── page.tsx                                 ← MODIFICAR: tarjeta "Roles y permisos"
│   └── roles/
│       ├── page.tsx                             ← CREAR
│       ├── _servicios/permisos.servicio.ts      ← CREAR
│       ├── _hooks/usar-matriz-permisos.ts       ← CREAR
│       └── _components/tabla-matriz-permisos.tsx ← CREAR
├── inspecciones/
│   ├── _servicios/inspeccion.servicio.ts        ← EXTENDER (4 funciones nuevas)
│   ├── _components/
│   │   ├── strip-resumen-plantilla.tsx          ← MODIFICAR: badge + botón
│   │   ├── tabla-plantillas.tsx                 ← MODIFICAR: badge en fila
│   │   └── dialogo-rechazo-plantilla.tsx        ← CREAR
│   ├── _hooks/usar-editor-plantilla.ts          ← EXTENDER: enviarRevision()
│   └── aprobaciones/
│       ├── page.tsx                             ← CREAR
│       ├── _hooks/usar-aprobaciones.ts          ← CREAR
│       └── _components/tabla-aprobaciones.tsx   ← CREAR
└── _components/
    └── sidebar.tsx                              ← MODIFICAR: 2 entradas nuevas (ver abajo)

packages/shared/src/types/
├── inspeccion.ts                                ← MODIFICAR: campos de aprobación en PlantillaCompleta
├── permiso.ts                                   ← CREAR: Rol, Permiso, MatrizPermisos
└── index.ts                                     ← re-exportar permiso.ts

apps/web/src/app/(dashboard)/mantenimientos/roles/__tests__/
├── tabla-matriz-permisos.test.tsx               ← CREAR
└── usar-matriz-permisos.test.ts                 ← CREAR

apps/web/src/app/(dashboard)/inspecciones/__tests__/
├── strip-resumen-plantilla.test.tsx             ← EXTENDER (casos nuevos)
├── tabla-plantillas.test.tsx                    ← EXTENDER (casos nuevos)
├── tabla-aprobaciones.test.tsx                  ← CREAR
└── dialogo-rechazo-plantilla.test.tsx           ← CREAR
```

### Cambios en `sidebar.tsx` (`apps/web/src/app/(dashboard)/_components/sidebar.tsx`)

```ts
// dentro de la sección "CALIDAD", junto a "Inspecciones" (línea ~85):
{ titulo: "Aprobaciones", href: "/inspecciones/aprobaciones", Icono: IconoInspeccion },

// dentro de subItems de "Mantenimientos" (línea ~104), junto a "Clientes":
{ titulo: "Roles y permisos", href: "/mantenimientos/roles", Icono: IconoPermisos },
```
`IconoPermisos` es un ícono nuevo (candado o escudo) siguiendo el mismo patrón que `IconoClientes` (SVG inline `stroke="currentColor"`), agregado por `agente-frontend` en el mismo archivo — no requiere tocar `packages/ui`.

---

## Contrato de API

### Módulo `permisos`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/permisos/matriz` | Catálogo de permisos + roles con sus permisos asignados |
| PUT | `/permisos/roles/:rolId` | `{ permisoIds: string[] }` — reemplaza el set completo del rol |

**`GET /permisos/matriz` — response:**
```json
{
  "data": {
    "permisos": [
      { "id": "uuid", "codigo": "plantillas.enviar_revision", "descripcion": "Enviar una plantilla de ficha a revisión" },
      { "id": "uuid", "codigo": "plantillas.aprobar", "descripcion": "Aprobar o rechazar una plantilla en revisión" },
      { "id": "uuid", "codigo": "permisos.administrar", "descripcion": "Editar la matriz de permisos por rol" }
    ],
    "roles": [
      { "id": "uuid", "nombre": "administrador", "editable": false, "permisoIds": ["<todos>"] },
      { "id": "uuid", "nombre": "auditor", "editable": true, "permisoIds": ["<id-plantillas.aprobar>"] }
    ]
  }
}
```

**Errores:**
```json
{ "error": { "codigo": "rol_no_editable", "mensaje": "El rol administrador no puede editarse desde la matriz." } }
{ "error": { "codigo": "rol_no_encontrado", "mensaje": "El rol no existe." } }
{ "error": { "codigo": "permiso_invalido", "mensaje": "Uno o más permisos no existen en el catálogo." } }
{ "error": { "codigo": "permiso_denegado", "mensaje": "No tienes permiso para realizar esta acción." } }
```

### Módulo `inspeccion` — endpoints nuevos de aprobación

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/inspeccion/plantillas/:id/enviar-revision` | `BORRADOR → EN_REVISION` |
| POST | `/inspeccion/plantillas/:id/aprobar` | `EN_REVISION → APROBADA` |
| POST | `/inspeccion/plantillas/:id/rechazar` | `{ comentario: string }` — `EN_REVISION → RECHAZADA` |
| GET | `/inspeccion/plantillas/pendientes-aprobacion` | Lista paginada, solo `EN_REVISION` |

**Errores nuevos:**
```json
{ "error": { "codigo": "plantilla_sin_preguntas", "mensaje": "La ficha no tiene preguntas todavía." } }
{ "error": { "codigo": "estado_aprobacion_invalido", "mensaje": "La plantilla no está en el estado esperado para esta acción." } }
{ "error": { "codigo": "comentario_resolucion_requerido", "mensaje": "Debes indicar un comentario para rechazar la plantilla." } }
```

Todos los errores siguen el envelope de `CLAUDE.md`: `{ error: { codigo, mensaje, detalles? } }`.

---

## Middleware `requierePermiso(codigo)` (`apps/api/src/middleware/permiso.middleware.ts`)

Se ejecuta **después** de `autenticar` (que ya pobló `req.usuario` con `{ id, empresaId, rolId }`). Lógica:

```
requierePermiso(codigo):
  handler(req, res, next):
    rol = obtenerRolDeUsuario(req.usuario.rolId)      ← con caché de proceso
    si esRolAdministrador(rol): next()                ← bypass total, sin ir a RolPermiso
    si permisosDelRol(rol.id).has(codigo): next()
    si no: 403 { error: { codigo: "permiso_denegado", ... } }
```

El caché `rolId → Set<codigoPermiso>` se invalida (borra la entrada del rol afectado) dentro del propio caso de uso `asignarPermisos()` tras un `PUT /permisos/roles/:rolId` exitoso, para que el cambio de permisos surta efecto en la siguiente petición sin reiniciar el proceso. Vive en `apps/api/src/middleware/` porque es infraestructura transversal reutilizable por cualquier módulo futuro — no se duplica dentro de `modules/inspeccion` ni `modules/permisos`.

---

## Historial de aprobación — reutiliza `InspeccionAuditoria`

El modelo `InspeccionAuditoria` (RF-12) ya existe en el schema desde 001 pero quedó fuera de alcance de ese sprint ("Historial/auditoría de cambios"). Este sprint lo empieza a poblar para las transiciones de aprobación, en vez de crear una tabla de historial nueva:

| `accion` | Cuándo |
|---|---|
| `ENVIAR_REVISION` | Al llamar `enviarARevision()` |
| `APROBAR` | Al llamar `aprobar()` |
| `RECHAZAR` | Al llamar `rechazar()` |
| `EDITAR_REVIERTE_BORRADOR` | Al editar cabecera/nodo de una plantilla `APROBADA` o `RECHAZADA` |

Cada fila guarda `plantillaId`, `usuarioId` (quien ejecuta la acción), `tabla: "inspeccion_plantilla"`, `registroId` (id de la plantilla), `valorAntes`/`valorDespues` con al menos `{ estadoAprobacion }`. Esto satisface el punto 3 del alcance ("quién solicitó, quién aprobó/rechazó y cuándo") sin necesidad de una tabla nueva — los campos `solicitadoPorId/solicitadoEn/aprobadorId/resueltoEn/comentarioResolucion` en `InspeccionPlantilla` guardan el **último** ciclo (lo que pintan las pantallas), mientras que `InspeccionAuditoria` guarda **todos** los ciclos (lo que permitiría, en un sprint futuro, una vista de "historial completo" por plantilla).

> Decisión propia de este documento (no especificada literalmente en `spec.md`): se usa `InspeccionAuditoria` como mecanismo de historial en vez de crear una tabla `inspeccion_plantilla_aprobacion_historial` nueva, porque el modelo ya existe con exactamente esa forma y estaba sin usar. Si `agente-arquitecto` prefiere una tabla dedicada, es un ajuste de infraestructura, no de alcance funcional.

---

## Pantalla 1 — Matriz de permisos (`/mantenimientos/roles`)

### Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Mantenimientos > Roles y permisos                             [Breadcrumb]│
├──────────────────────────────────────────────────────────────────────────┤
│ Roles y permisos                                                          │
│ Qué puede hacer cada rol dentro del sistema                               │
├──────────────────────────────────────────────────────────────────────────┤
│                          PLANTILLAS              │  PERMISOS              │
│                    enviar_  │  aprobar           │  administrar           │
│                    revision │                    │                       │
│  administrador       ☑ 🔒  │    ☑ 🔒            │    ☑ 🔒               │
│  productor            ☐    │    ☐               │    ☐                   │
│  operario              ☐    │    ☐               │    ☐                   │
│  auditor                ☐    │    ☑               │    ☐                   │
│  cliente_externo         ☐    │    ☐               │    ☐                   │
│  administrador_cliente   ☐    │    ☐               │    ☐                   │
│  usuario_sucursal        ☐    │    ☐               │    ☐                   │
├──────────────────────────────────────────────────────────────────────────┤
│                                              [ Guardar cambios ]           │
└──────────────────────────────────────────────────────────────────────────┘
```

- Columnas agrupadas por el prefijo del código de permiso antes del primer punto (`plantillas.*`, `permisos.*`). Con el catálogo pequeño de este sprint (3 permisos, 2 grupos) el agrupamiento es apenas visible, pero la estructura queda lista para cuando el catálogo crezca (decisión de agrupación delegada a `agente-frontend` según el spec).
- Fila `administrador`: todos los checkboxes `checked disabled`, con ícono 🔒 y `title="El rol administrador siempre tiene todos los permisos."`.
- Guardado explícito: cambiar checkboxes solo actualiza estado local (`filasModificadas`); el botón "Guardar cambios" persiste todo de una vez, llamando `PUT /permisos/roles/:rolId` por cada rol modificado.
- Estado de carga: skeleton de filas (`animate-pulse bg-gray-2 dark:bg-dark-3`), igual criterio que 001/002.

### Tokens de diseño (reutilizados, sin crear ninguno nuevo)

| Elemento | Clases |
|---|---|
| Contenedor de tabla | `rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card` |
| Checkbox marcado | `accent-primary` (o el componente `Checkbox` de `packages/ui` si ya expone variante simple) |
| Fila deshabilitada (administrador) | `bg-gray-1/60 dark:bg-dark-2/60 cursor-not-allowed` |
| Botón "Guardar cambios" | `variante="primario"` del componente `Boton` de `packages/ui`, `disabled` cuando no hay cambios |
| Encabezado de grupo de columna | `text-body-xs font-semibold uppercase tracking-wide text-dark-4 dark:text-dark-6` |

---

## Pantalla 2 — Solicitar y resolver aprobación de plantilla

### 2a. Botón + badge en el editor de estructura (`/inspecciones/[id]`, extiende el strip de 001)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Min. Salud · Puntaje máx: 100 · Vigencia: 31/12/2026               │
│  [● Activa]  [◐ En revisión]  [✓ 100/100 pts]     [Editar cabecera] │
│                                                     [Enviar a revisión]│
│                                                     [✎ Editar estructura]│
├─────────────────────────────────────────────────────────────────────┤
```

- El badge de `estadoAprobacion` se ubica junto al badge Activa/Inactiva ya existente del strip de 001 (mismo tamaño/forma, distinto color por estado).
- El botón "Enviar a revisión" (outline, `border-primary text-primary`) solo se renderiza si `estadoAprobacion === "BORRADOR"`. Reemplaza visualmente el espacio que ocupaba el toggle simple de activar/desactivar descrito en 001 cuando la plantilla está en borrador — no elimina ese toggle, ambos controles coexisten (uno gobierna `activa`, el otro `estadoAprobacion`).
- Si `estadoAprobacion === "RECHAZADA"`, el badge lleva un ícono de alerta con `title={comentarioResolucion}` para que el autor vea por qué fue rechazada sin abrir un panel aparte.
- Si `estadoAprobacion === "EN_REVISION"`, no se muestra el botón "Enviar a revisión" (ya está en cola) ni se permite editar la estructura (fuera de alcance de este sprint decidir si se bloquea edición durante revisión — ver "Decisiones pendientes" del spec sobre separación de funciones; por ahora este sprint **no** bloquea la edición durante `EN_REVISION`, solo la oculta detrás del flujo normal del editor de 001. Si se edita durante `EN_REVISION`, no hay reversión automática a `BORRADOR` porque `debeRevertirABorrador()` solo cubre `APROBADA`/`RECHAZADA` — este es un vacío que puede requerir la decisión de separación de funciones pendiente en el spec).

### 2b. Badge en el estado de aprobación por color

| Estado | Clases |
|---|---|
| `BORRADOR` | `bg-gray-3 text-dark-5` |
| `EN_REVISION` | `bg-yellow-light/[0.08] text-yellow-dark` |
| `APROBADA` | `bg-green-light/[0.08] text-green` |
| `RECHAZADA` | `bg-red-light/[0.08] text-red` |

Mismos tokens ya usados por el badge Activa/Inactiva de 001 (`bg-green-light/[0.08] text-green` / `bg-red-light/[0.08] text-red`) y por el indicador amarillo de puntaje acumulado (`text-yellow-dark`) — no se agrega ningún token nuevo al preset de Tailwind.

### 2c. Pantalla "Plantillas pendientes de aprobación" (`/inspecciones/aprobaciones`)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Inspecciones > Aprobaciones pendientes                        [Breadcrumb]│
├──────────────────────────────────────────────────────────────────────────┤
│ Aprobaciones pendientes                                                   │
│ Plantillas de ficha en espera de revisión                                 │
├──────────────────────────────────────────────────────────────────────────┤
│  NOMBRE                    TIPO          SOLICITADO POR   FECHA   ACCIÓN  │
│  ────────────────────────────────────────────────────────────────────── │
│  Inspección MS 2026        Min. Salud    Juan Pérez     16/07/26 [Aprobar][Rechazar]│
│  Auditoría interna Q3       Auditoría     María Solís    15/07/26 [Aprobar][Rechazar]│
│  ────────────────────────────────────────────────────────────────────── │
└──────────────────────────────────────────────────────────────────────────┘

  Diálogo de rechazo (al hacer clic en "Rechazar"):
  ┌──────────────────────────────┐
  │  Rechazar plantilla     [×]  │
  │  ──────────────────────────  │
  │  ¿Por qué se rechaza esta    │
  │  plantilla?                  │
  │  [textarea obligatorio     ] │
  │  [                         ] │
  │  ──────────────────────────  │
  │  [Rechazar]   [Cancelar]     │  ← "Rechazar" deshabilitado si el texto está vacío
  └──────────────────────────────┘
```

- Construida sobre `DialogoConfirmacion` de `packages/ui` (sprint 001): mismo overlay `bg-dark/40`, misma tarjeta `rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card`, extendido con un `<textarea>` entre el mensaje y los botones. No se crea un componente de modal nuevo desde cero — se compone sobre el primitivo ya existente, igual que pide `CLAUDE.md` para no reimplementar patrones transversales.
- El botón "Aprobar" no abre diálogo — acción directa (con confirmación opcional vía `title`/estado de carga en el botón, sin bloquear el flujo con un paso extra, ya que aprobar no requiere justificación).
- Skeleton de carga: mismas 5 filas `animate-pulse` que la lista de plantillas de 001/clientes de 002.
- Estado vacío: texto "No hay plantillas pendientes de aprobación" (sin CTA de creación, a diferencia del estado vacío de la tabla de estructura — aquí no hay nada que "agregar").

---

## Reglas de negocio a codificar en `domain/`

Todas viven en `apps/api/src/modules/inspeccion/domain/plantilla.entity.ts` (extensión) y `apps/api/src/modules/permisos/domain/rol-permiso.entity.ts` (nuevo) — funciones puras, sin Express ni Prisma:

```
puedeEnviarseARevision(plantilla, totalPreguntas)
  → plantilla.estadoAprobacion === "BORRADOR" && totalPreguntas > 0

puedeAprobarse(plantilla)
  → plantilla.estadoAprobacion === "EN_REVISION"

puedeRechazarse(plantilla, comentario?)
  → plantilla.estadoAprobacion === "EN_REVISION" && !!comentario?.trim()

debeRevertirABorrador(estadoActual)
  → estadoActual === "APROBADA" || estadoActual === "RECHAZADA"

puedeIniciarInspeccion(plantilla)  ← YA EXISTE desde 001, se actualiza:
  → plantilla.activa
    && (!plantilla.fechaVigencia || plantilla.fechaVigencia >= hoy)
    && plantilla.estadoAprobacion === "APROBADA"   ← condición nueva

esRolAdministrador(rol)
  → rol.nombre === ROL_ADMIN   (packages/shared/src/constants/roles.ts)

puedeEditarseDesdeMatriz(rol)
  → !esRolAdministrador(rol)
```

---

## Estándares técnicos obligatorios (idénticos a 001/002, aplican también aquí)

### Arquitectura hexagonal

```
domain/          → sin imports de Express, Prisma, ni infraestructura
application/     → sin imports de Express ni @prisma/client; usa solo puertos del domain
infrastructure/  → único lugar donde viven Prisma y Express; implementa los puertos
```

- `GestionarMatrizPermisosUseCase` recibe `RolPermisoRepositoryPort` por constructor.
- `GestionarPlantillaUseCase` (extendido) sigue recibiendo su repositorio por constructor — no se instancia Prisma dentro del caso de uso.
- Los controladores (`rol-permiso.controller.ts`, `plantilla.controller.ts`) solo traducen HTTP ↔ caso de uso.

### Clean Code

- Una función, un propósito; extraer auxiliares si supera ~30 líneas.
- Nombres en español: `enviarARevision`, `puedeEditarseDesdeMatriz`, `requierePermiso`.
- Sin comentarios de "qué hace" el código, solo de "por qué" cuando la decisión no es obvia (ej. por qué se reutiliza `InspeccionAuditoria` en vez de una tabla nueva).
- `pnpm lint` en verde.

### Documentación ISO — JSDoc

Obligatorio en todas las funciones exportadas de `domain/rol-permiso.entity.ts`, las funciones nuevas de `domain/plantilla.entity.ts`, los métodos de `RolPermisoRepositoryPort`, y las acciones nuevas expuestas por `usar-editor-plantilla.ts`, `usar-matriz-permisos.ts` y `usar-aprobaciones.ts`. Mismo formato que 001:

```
/**
 * [Qué hace en una línea]
 *
 * @param plantilla - Plantilla completa con su estadoAprobacion actual.
 * @param totalPreguntas - Cantidad de nodos PREGUNTA en el árbol (contarPreguntas()).
 * @returns true si la plantilla puede enviarse a revisión.
 * @example
 *   puedeEnviarseARevision({ estadoAprobacion: "BORRADOR", ... }, 5) // → true
 */
export function puedeEnviarseARevision(plantilla: PlantillaCompleta, totalPreguntas: number): boolean
```

---

## Desviaciones respecto a este documento (registradas durante la implementación, 2026-07-21)

1. **Caché de permisos en `requierePermiso()` indexado por `rolNombre`, no por `rolId`.** Este documento (línea 240, sección "Middleware `requierePermiso(codigo)`") describe `obtenerRolDeUsuario(req.usuario.rolId)`, pero `req.usuario` (poblado por `apps/api/src/middleware/autenticacion.middleware.ts`, módulo `auth` de sprint 004) solo trae `rol: RolSistema` (el nombre del rol), nunca `rolId`. Se decidió resolver el caché y la consulta de permisos por `rolNombre` en vez de modificar el módulo `auth` para agregar `rolId` al JWT/sesión — evita tocar un módulo fuera del alcance de este sprint. El caché en `apps/api/src/middleware/permiso.middleware.ts` es entonces `Map<rolNombre, Set<codigoPermiso>>`, invalidado igual por `invalidarCachePermisos()` tras un `PUT /permisos/roles/:rolId` exitoso.
2. **Los 4 endpoints de aprobación de plantillas no tienen Route Handlers Next.js dedicados.** Este documento (sección "Route Handlers proxy") lista `apps/web/src/app/api/inspeccion/plantillas/[id]/{enviar-revision,aprobar,rechazar}/route.ts` y `pendientes-aprobacion/route.ts` como archivos a crear. En la práctica no fue necesario: el catch-all `apps/web/src/app/api/inspeccion/[...path]/route.ts` ya existente desde el sprint 015 reenvía cualquier sub-ruta bajo `/inspeccion/*` a la API real, así que ya cubre estos 4 endpoints nuevos sin cambios. Solo se creó el proxy nuevo para `permisos` (`apps/web/src/app/api/permisos/[...path]/route.ts`, mismo patrón catch-all), porque ese módulo no existía antes de este sprint.

## Notas importantes

- `agente-frontend` no toca `apps/api` — si necesita ajustar el contrato de `/permisos/matriz` o de los endpoints de aprobación, lo solicita en `memoria/sprint/auth.md` (integración auth) o directamente coordina con `agente-auth`/`agente-backend` dentro de este mismo sprint.
- El campo `empresaId` de las plantillas sigue viniendo del JWT — `estadoAprobacion` y sus metadatos no introducen ninguna excepción al aislamiento multiempresa ya vigente en el módulo `inspeccion`.
- La matriz `Rol`×`Permiso` es **global** a la plataforma (no por `empresaId`), porque así ya estaban modeladas `Rol`/`Permiso`/`RolPermiso` antes de este sprint. Ver nota de arquitectura agregada en `memoria/cambios_db/registro.md` (tarea T-333) para el seguimiento de esta limitación conocida.
- La separación de funciones (quien edita no puede ser quien aprueba) queda **fuera de alcance** de este sprint por decisión explícita del spec ("Decisiones pendientes") — no se implementa ningún bloqueo que compare `solicitadoPorId` con el usuario que intenta aprobar/rechazar.
- No se crean permisos nuevos desde la UI de este sprint — el catálogo de `Permiso` solo crece vía seed (`agente-basededatos`), nunca desde `POST` alguno expuesto al frontend.

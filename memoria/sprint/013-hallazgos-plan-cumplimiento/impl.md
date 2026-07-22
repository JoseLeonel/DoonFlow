# Guía de implementación — 013-hallazgos-plan-cumplimiento

> Referencia técnica para los agentes. Describe qué construir y dónde, sin escribir el código — el código va en el repositorio, no aquí.
> Este sprint sigue ampliando el módulo `inspeccion` (creado por 001, ampliado por [[015-wizard-certificacion]] y, cuando se retome, por [[005-certificacion-plan-cumplimiento]]): se agregan `Hallazgo`, `PlanCumplimiento`, `AccionCorrectiva` y sus evidencias. **Varios archivos creados en 005 se amplían aquí** (mismo archivo real) — cada sección lo indica explícitamente.
> **⏸️ Bloqueado: 005 está pausado.** Esta guía queda como referencia de diseño, no como trabajo activo.

---

## Decisiones tomadas para resolver las ambigüedades de `spec.md`

`spec.md` deja 2 puntos como "decisiones pendientes a confirmar con negocio/agente-arquitecto". Para poder especificar tareas concretas, este sprint resuelve cada una así (quedan documentadas aquí, no en `spec.md`, y deben revisarse si negocio decide algo distinto):

1. **Generación automática de hallazgos**: se genera un hallazgo candidato por cada `InspeccionDetalle` cuyo `puntajeObtenido < puntajeMaximo` (no alcanzó el puntaje completo de esa pregunta). La `severidad` sugerida se calcula por el porcentaje obtenido de esa pregunta: `0%` → `CRITICA`, `1–49%` → `MAYOR`, `50–99%` → `MENOR`. El auditor puede editar la severidad de cualquier hallazgo (automático o manual) antes de generar el plan. No se agrega ningún campo nuevo a `InspeccionNodo` (ej. "es crítico") — se prefiere la señal ya existente (el puntaje obtenido vs. máximo) para no expandir el alcance de la plantilla en este sprint.
2. **Vencimiento automático de acciones (`VENCIDO`)**: se calcula **en el momento de la lectura** (`calcularEstadoEfectivo()` en `domain/accion-correctiva.entity.ts`, aplicado por el repositorio Prisma a cada fila devuelta), no vía job programado. Evita depender de un scheduler de infraestructura en este sprint; el campo `estado` en BD puede quedar desactualizado hasta la próxima lectura, lo cual es aceptable porque ninguna regla de negocio depende de que `VENCIDO` esté persistido de inmediato. Si más adelante se requiere que `VENCIDO` dispare notificaciones (sprint 006), en ese punto sí se necesitará un job — se documenta como pendiente, no se implementa aquí.

**Decisión heredada de 005** (no se repite, solo se referencia): la generación del PDF usa Puppeteer server-side (ver [[005-certificacion-plan-cumplimiento]] → `impl.md`). Este sprint amplía la plantilla HTML del PDF para incluir el listado de hallazgos cuando existan, reutilizando `infrastructure/pdf-certificacion.adapter.ts` creado en 005 (no se crea un adaptador nuevo).

---

## Archivos a crear / completar

### Base de datos (`packages/db`)

```
prisma/
├── schema.prisma                                    ← MODIFICAR (AMPLIAR — Parte B de este archivo,
│                                                        creado/modificado por 005): agregar 5 models nuevos
├── migrations/
│   ├── YYYYMMDDHHMMSS_add_hallazgos_plan_cumplimiento/
│   │   └── migration.sql
│   └── YYYYMMDDHHMMSS_reemplazar_sp_inspeccion_firmar/
│       └── migration.sql                            ← CREATE OR REPLACE FUNCTION sobre el SP de 005
└── seeds/
    └── certificaciones-demo.ts                      ← AMPLIAR (mismo archivo creado en 005)

sql/
└── procedimientos/
    ├── sp_inspeccion_firmar.sql                      ← REEMPLAZAR (mismo archivo, contenido actualizado;
    │                                                     la migración de 005 no se edita, se crea una nueva)
    └── sp_plan_cumplimiento_indicadores.sql           ← CREAR
```

**Modelos Prisma a agregar en `schema.prisma`** (referencia, no se escribe código aquí):

```prisma
model Inspeccion {
  // ... campos de 001 + campos de certificación agregados en 005 (sucursalId, periodoEtiqueta,
  //     firmadoPorId, firmadoEn, codigoVerificacion, pdfUrl, fechaVencimiento, resultadoFinal) ...

  hallazgos        Hallazgo[]
  planCumplimiento PlanCumplimiento?
}

model Hallazgo {
  id            String   @id @default(uuid())
  inspeccionId  String   @map("inspeccion_id")
  detalleId     String?  @map("detalle_id")
  descripcion   String
  severidad     String   @db.VarChar(20)   // CRITICA | MAYOR | MENOR
  empresaId     String   @map("empresa_id")
  creadoEn      DateTime @default(now()) @map("creado_en")

  inspeccion  Inspeccion          @relation(fields: [inspeccionId], references: [id], onDelete: Cascade)
  detalle     InspeccionDetalle?  @relation(fields: [detalleId], references: [id])
  evidencias  HallazgoEvidencia[]
  acciones    AccionCorrectiva[]

  @@index([inspeccionId])
  @@index([empresaId, severidad])
  @@map("hallazgo")
}

model HallazgoEvidencia {
  id           String   @id @default(uuid())
  hallazgoId   String   @map("hallazgo_id")
  tipo         String
  url          String
  nombre       String
  tamanoBytes  Int?     @map("tamano_bytes")
  creadoEn     DateTime @default(now()) @map("creado_en")

  hallazgo Hallazgo @relation(fields: [hallazgoId], references: [id], onDelete: Cascade)

  @@index([hallazgoId])
  @@map("hallazgo_evidencia")
}

model PlanCumplimiento {
  id             String    @id @default(uuid())
  inspeccionId   String    @unique @map("inspeccion_id")
  estado         String    @default("EN_SEGUIMIENTO") @db.VarChar(20)  // EN_SEGUIMIENTO | CERRADO | REABIERTO
  cerradoPorId   String?   @map("cerrado_por_id")
  cerradoEn      DateTime? @map("cerrado_en")
  creadoEn       DateTime  @default(now()) @map("creado_en")

  inspeccion Inspeccion         @relation(fields: [inspeccionId], references: [id], onDelete: Cascade)
  cerradoPor Usuario?           @relation("PlanesCerrados", fields: [cerradoPorId], references: [id])
  acciones   AccionCorrectiva[]

  @@map("plan_cumplimiento")
}

model AccionCorrectiva {
  id                     String    @id @default(uuid())
  planCumplimientoId     String    @map("plan_cumplimiento_id")
  hallazgoId             String    @map("hallazgo_id")
  descripcion            String
  responsableId          String    @map("responsable_id")
  fechaLimite            DateTime  @map("fecha_limite") @db.Date
  estado                 String    @default("PENDIENTE") @db.VarChar(20)
  porcentajeAvance       Int       @default(0) @map("porcentaje_avance")
  verificadoPorId        String?   @map("verificado_por_id")
  verificadoEn           DateTime? @map("verificado_en")
  comentarioVerificacion String?   @map("comentario_verificacion")
  creadoEn               DateTime  @default(now()) @map("creado_en")
  actualizadoEn          DateTime  @updatedAt @map("actualizado_en")

  planCumplimiento PlanCumplimiento            @relation(fields: [planCumplimientoId], references: [id], onDelete: Cascade)
  hallazgo         Hallazgo                    @relation(fields: [hallazgoId], references: [id])
  responsable      Usuario                     @relation("AccionesResponsable", fields: [responsableId], references: [id])
  verificadoPor    Usuario?                    @relation("AccionesVerificadas", fields: [verificadoPorId], references: [id])
  evidencias       AccionCorrectivaEvidencia[]

  @@index([planCumplimientoId])
  @@index([hallazgoId])
  @@index([responsableId, estado])
  @@index([fechaLimite])
  @@map("accion_correctiva")
}

model AccionCorrectivaEvidencia {
  id                 String   @id @default(uuid())
  accionCorrectivaId String   @map("accion_correctiva_id")
  tipo               String
  url                String
  nombre             String
  comentario         String?
  creadoEn           DateTime @default(now()) @map("creado_en")

  accionCorrectiva AccionCorrectiva @relation(fields: [accionCorrectivaId], references: [id], onDelete: Cascade)

  @@index([accionCorrectivaId])
  @@map("accion_correctiva_evidencia")
}
```

> Nota: `severidad`, `estado` de `PlanCumplimiento` y `estado` de `AccionCorrectiva` se modelan como `VARCHAR` validados en Zod, igual que `Inspeccion.estado`/`Inspeccion.resultadoFinal` ya existentes (005) — no como enum de Postgres, para no mezclar convenciones dentro del mismo módulo.

### Stored procedures (referencia funcional, no el SQL final)

**`sp_inspeccion_firmar(p_inspeccion_id UUID, p_usuario_id UUID)` — reemplazo del SP de 005**

Mismos pasos 1, 3, 4, 6, 7, 8 de la versión de 005 (bloqueo de fila, cálculo de puntaje/clasificación, código de verificación, fecha de vencimiento, `UPDATE` final). **Cambian los pasos 2 y 5:**

2. Verifica `estado = 'EN_PROGRESO'`; si no, `RAISE EXCEPTION 'certificacion_no_editable'`. **(nuevo, entre 2 y 3)** Verifica que no exista un `hallazgo` con `severidad = 'CRITICA'` sin ninguna `accion_correctiva` en estado `CUMPLIDO`; si existe, `RAISE EXCEPTION 'hallazgo_critico_pendiente'`.
5. Calcula `resultado_final` según la regla 1 de este sprint (sin hallazgos → `APROBADA`; con `MAYOR`/`MENOR` → `APROBADA_CON_OBSERVACIONES`; ya se validó que no hay `CRITICA` sin resolver en el paso anterior) — **reemplaza el valor fijo `'APROBADA'` de la versión de 005**.

**`sp_plan_cumplimiento_indicadores(p_plan_id UUID)`**
- `SELECT` agregado sobre `accion_correctiva WHERE plan_cumplimiento_id = p_plan_id`, aplicando el mismo cálculo de `VENCIDO` en lectura (`fecha_limite < now() AND estado NOT IN ('CUMPLIDO','NO_CUMPLIDO')`).
- Retorna: `total`, `pendientes`, `en_proceso`, `en_revision`, `cumplidas`, `no_cumplidas`, `vencidas`, `porcentaje_cumplimiento` (`cumplidas::numeric / NULLIF(total,0) * 100`), `proximas_a_vencer` (`fecha_limite BETWEEN now() AND now() + interval '7 days'` y estado no terminal).

### Backend (`apps/api/src/modules/inspeccion/`)

```
domain/
├── evidencia.entity.ts                  ← YA EXISTE (005, se reutiliza sin cambios)
├── certificacion.entity.ts              ← YA EXISTE (005, sin cambios en este sprint)
├── inspeccion.errors.ts                 ← AMPLIAR (mismo archivo de 005)
├── hallazgo.entity.ts                   ← CREAR (incluye calcularResultadoFinal, ver "Contexto" en spec.md)
├── hallazgo.repository.port.ts          ← CREAR
├── plan-cumplimiento.entity.ts          ← CREAR
├── plan-cumplimiento.repository.port.ts ← CREAR
├── accion-correctiva.entity.ts          ← CREAR
└── accion-correctiva.repository.port.ts ← CREAR

application/
├── certificacion.schema.ts              ← YA EXISTE (005)
├── hallazgo.schema.ts                   ← CREAR
├── plan-cumplimiento.schema.ts          ← CREAR
├── accion-correctiva.schema.ts          ← CREAR
└── casos-uso/
    ├── iniciar-certificacion.usecase.ts      ← YA EXISTE (005)
    ├── responder-certificacion.usecase.ts    ← YA EXISTE (005)
    ├── firmar-certificacion.usecase.ts       ← AMPLIAR (mismo archivo de 005)
    ├── gestionar-hallazgos.usecase.ts        ← CREAR
    ├── gestionar-plan-cumplimiento.usecase.ts ← CREAR
    ├── gestionar-accion-correctiva.usecase.ts ← CREAR
    └── consultar-seguimiento.usecase.ts      ← CREAR

infrastructure/
├── certificacion.controller.ts          ← YA EXISTE (005)
├── certificacion.prisma-repository.ts   ← YA EXISTE (005)
├── inspeccion.router.ts                 ← AMPLIAR (mismo archivo de 005)
├── hallazgo.controller.ts               ← CREAR
├── hallazgo.prisma-repository.ts        ← CREAR
├── plan-cumplimiento.controller.ts      ← CREAR
├── plan-cumplimiento.prisma-repository.ts ← CREAR
├── accion-correctiva.controller.ts      ← CREAR
├── accion-correctiva.prisma-repository.ts ← CREAR
├── almacenamiento-evidencias.adapter.ts ← YA EXISTE (005, se reutiliza sin cambios)
└── pdf-certificacion.adapter.ts         ← YA EXISTE (005); AMPLIAR la plantilla HTML para incluir hallazgos

index.ts                                 ← MODIFICAR (AMPLIAR — mismo archivo de 005)

__tests__/
├── certificacion.entity.test.ts         ← YA EXISTE (005)
├── firmar-certificacion.usecase.test.ts      ← AMPLIAR (mismo archivo de 005)
├── hallazgo.entity.test.ts              ← CREAR
├── plan-cumplimiento.entity.test.ts     ← CREAR
├── accion-correctiva.entity.test.ts     ← CREAR
├── gestionar-hallazgos.usecase.test.ts       ← CREAR
├── gestionar-plan-cumplimiento.usecase.test.ts ← CREAR
└── gestionar-accion-correctiva.usecase.test.ts ← CREAR
```

Middleware transversal `apps/api/src/shared/middleware/subida-archivo.middleware.ts` — **ya existe** (creado en 005), se reutiliza sin cambios.

### Route Handlers proxy (Next.js)

```
apps/web/src/app/api/inspeccion/
├── certificaciones/
│   ├── route.ts                                     ← YA EXISTE (005)
│   └── [id]/
│       ├── route.ts                                 ← YA EXISTE (005)
│       ├── respuestas/route.ts                      ← YA EXISTE (005)
│       ├── evidencias/route.ts                       ← YA EXISTE (005)
│       ├── firmar/route.ts                           ← YA EXISTE (005)
│       ├── pdf/route.ts                               ← YA EXISTE (005)
│       ├── evidencias/route.ts (galería consolidada)  ← CREAR: GET /certificaciones/[id]/evidencias
│       ├── hallazgos/
│       │   ├── route.ts                              ← CREAR: GET + POST
│       │   └── generar-automaticos/route.ts           ← CREAR: POST
│       └── plan-cumplimiento/route.ts                 ← CREAR: GET + POST
├── hallazgos/
│   └── [id]/
│       ├── route.ts                                  ← CREAR: PATCH
│       └── evidencias/route.ts                        ← CREAR: POST
├── plan-cumplimiento/
│   └── [id]/
│       ├── cerrar/route.ts                            ← CREAR: POST
│       ├── reabrir/route.ts                           ← CREAR: POST
│       └── acciones/route.ts                          ← CREAR: POST
├── acciones/
│   └── [id]/
│       ├── route.ts                                  ← CREAR: PATCH
│       ├── avance/route.ts                            ← CREAR: PATCH
│       ├── evidencias/route.ts                         ← CREAR: POST
│       ├── enviar-revision/route.ts                    ← CREAR: POST
│       └── verificar/route.ts                          ← CREAR: POST
├── mis-acciones/route.ts                              ← CREAR: GET
└── acciones-en-revision/route.ts                       ← CREAR: GET
```

### Tipos compartidos (`packages/shared`)

```
src/types/certificacion.ts   ← AMPLIAR (mismo archivo de 005)
```

**Tipos a agregar (referencia):**
```typescript
export type Severidad = "CRITICA" | "MAYOR" | "MENOR";
export type EstadoPlan = "EN_SEGUIMIENTO" | "CERRADO" | "REABIERTO";
export type EstadoAccion = "PENDIENTE" | "EN_PROCESO" | "EN_REVISION" | "CUMPLIDO" | "NO_CUMPLIDO" | "VENCIDO";

export interface Hallazgo {
  id: string;
  inspeccionId: string;
  detalleId?: string;
  descripcion: string;
  severidad: Severidad;
  creadoEn: string;
  evidencias: HallazgoEvidencia[];
}

export interface HallazgoEvidencia { id: string; tipo: string; url: string; nombre: string; tamanoBytes?: number; creadoEn: string; }

export interface PlanCumplimiento {
  id: string;
  inspeccionId: string;
  estado: EstadoPlan;
  cerradoPorId?: string;
  cerradoEn?: string;
  acciones: AccionCorrectiva[];
  indicadores: IndicadoresPlan;
}

export interface AccionCorrectiva {
  id: string;
  planCumplimientoId: string;
  hallazgoId: string;
  descripcion: string;
  responsableId: string;
  fechaLimite: string;
  estado: EstadoAccion;
  porcentajeAvance: number;
  verificadoPorId?: string;
  verificadoEn?: string;
  comentarioVerificacion?: string;
  evidencias: AccionCorrectivaEvidencia[];
}

export interface AccionCorrectivaEvidencia { id: string; tipo: string; url: string; nombre: string; comentario?: string; creadoEn: string; }

export interface IndicadoresPlan {
  total: number;
  pendientes: number;
  enProceso: number;
  enRevision: number;
  cumplidas: number;
  noCumplidas: number;
  vencidas: number;
  porcentajeCumplimiento: number;
  proximasAVencer: number;
}

export interface EvidenciaConsolidada {
  id: string;
  origen: "RESPUESTA" | "HALLAZGO" | "ACCION_CORRECTIVA";
  tipo: string;
  url: string;
  nombre: string;
  creadoEn: string;
}
```

### Frontend (`apps/web`)

```
src/app/(dashboard)/certificaciones/
├── nueva/page.tsx                       ← YA EXISTE (005)
├── [id]/
│   ├── responder/page.tsx               ← YA EXISTE (005)
│   ├── revision/page.tsx                ← YA EXISTE (005)
│   ├── hallazgos/page.tsx               ← CREAR (Pantalla 4)
│   └── plan/page.tsx                    ← CREAR (Pantalla 5 + 8)
├── seguimiento/
│   └── page.tsx                         ← CREAR (Pantalla 6)
├── verificacion/
│   └── page.tsx                         ← CREAR (Pantalla 7)
├── _servicios/
│   ├── certificacion.servicio.ts        ← YA EXISTE (005)
│   ├── hallazgo.servicio.ts             ← CREAR
│   └── plan-cumplimiento.servicio.ts    ← CREAR
├── _hooks/
│   ├── usar-iniciar-certificacion.ts    ← YA EXISTE (005)
│   ├── usar-responder-certificacion.ts  ← YA EXISTE (005)
│   ├── usar-revision-certificacion.ts           ← AMPLIAR (mismo archivo de 005)
│   ├── usar-hallazgos.ts                ← CREAR
│   ├── usar-plan-cumplimiento.ts        ← CREAR
│   ├── usar-seguimiento.ts              ← CREAR
│   └── usar-verificacion.ts             ← CREAR
├── _components/
│   ├── badge-severidad.tsx              ← CREAR
│   ├── badge-estado-accion.tsx          ← CREAR
│   ├── badge-resultado-final.tsx        ← CREAR
│   ├── indicadores-plan.tsx             ← CREAR
│   ├── tabla-plan-cumplimiento.tsx      ← CREAR
│   ├── formulario-hallazgo.tsx          ← CREAR
│   ├── panel-verificacion-accion.tsx    ← CREAR
│   └── galeria-evidencias.tsx           ← CREAR
└── __tests__/
    ├── usar-responder-certificacion.test.ts ← YA EXISTE (005)
    ├── usar-revision-certificacion.test.ts          ← AMPLIAR (mismo archivo de 005)
    ├── tabla-plan-cumplimiento.test.tsx     ← CREAR
    ├── indicadores-plan.test.tsx            ← CREAR
    ├── badge-severidad.test.tsx             ← CREAR
    ├── badge-estado-accion.test.tsx         ← CREAR
    ├── usar-hallazgos.test.ts               ← CREAR
    ├── usar-plan-cumplimiento.test.ts       ← CREAR
    ├── usar-seguimiento.test.ts             ← CREAR
    ├── usar-verificacion.test.ts            ← CREAR
    └── galeria-evidencias.test.tsx          ← CREAR

src/app/(dashboard)/_components/sidebar.tsx  ← MODIFICAR (AMPLIAR — mismo archivo de 005)
```

---

## Contrato de API (Parte B — este sprint)

Todos los endpoints cuelgan del prefijo ya montado `/inspeccion`, igual que en 005. Todos requieren `Authorization: Bearer <token>` y aplican el alcance de [[004-usuarios-roles-alcance]] en el filtrado.

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/inspeccion/certificaciones/:id/evidencias` | Galería consolidada (respuestas de 005 + hallazgos + acciones) |
| GET | `/inspeccion/certificaciones/:id/hallazgos` | Listar hallazgos |
| POST | `/inspeccion/certificaciones/:id/hallazgos` | Crear hallazgo manual `{ descripcion, severidad, detalleId? }` |
| POST | `/inspeccion/certificaciones/:id/hallazgos/generar-automaticos` | Generar hallazgos desde respuestas no conformes |
| PATCH | `/inspeccion/hallazgos/:id` | Editar hallazgo (ej. severidad) |
| POST | `/inspeccion/hallazgos/:id/evidencias` | Subir evidencia del hallazgo (`multipart/form-data`) |
| POST | `/inspeccion/certificaciones/:id/plan-cumplimiento` | Generar plan de cumplimiento (requiere ≥1 hallazgo) |
| GET | `/inspeccion/certificaciones/:id/plan-cumplimiento` | Obtener plan + acciones + indicadores |
| POST | `/inspeccion/plan-cumplimiento/:id/acciones` | Crear acción `{ hallazgoId, descripcion, responsableId, fechaLimite }` |
| POST | `/inspeccion/plan-cumplimiento/:id/cerrar` | Cerrar plan |
| POST | `/inspeccion/plan-cumplimiento/:id/reabrir` | Reabrir plan |
| PATCH | `/inspeccion/acciones/:id` | Editar acción (descripción, responsable, fecha límite) |
| PATCH | `/inspeccion/acciones/:id/avance` | `{ porcentajeAvance }` — solo responsable/admin con alcance |
| POST | `/inspeccion/acciones/:id/evidencias` | Cargar evidencia `multipart/form-data` (`archivo`, `comentario?`) |
| POST | `/inspeccion/acciones/:id/enviar-revision` | Cambia estado a `EN_REVISION` |
| POST | `/inspeccion/acciones/:id/verificar` | `{ resultado: "CUMPLIDO"\|"NO_CUMPLIDO", comentario, nuevaFechaLimite? }` — solo auditor/admin |
| GET | `/inspeccion/mis-acciones` | Acciones del usuario autenticado como responsable |
| GET | `/inspeccion/acciones-en-revision` | Acciones `EN_REVISION` visibles para auditor/admin |

> `POST /inspeccion/certificaciones/:id/firmar` (creado en 005) se comporta distinto a partir de este sprint: ver "Response — firmar" abajo.

**Response — firmar, con hallazgos (ampliación del contrato de 005):**
```json
{
  "data": {
    "id": "uuid",
    "estado": "FIRMADA",
    "codigoVerificacion": "A1B2C3D4E5",
    "pdfUrl": "https://.../certificaciones/{empresaId}/{inspeccionId}/certificado.pdf",
    "resultadoFinal": "APROBADA_CON_OBSERVACIONES",
    "fechaVencimiento": "2027-07-16",
    "firmadoPorId": "uuid",
    "firmadoEn": "2026-07-16T15:04:00.000Z"
  }
}
```

**Errores nuevos de este sprint:**
```json
{ "error": { "codigo": "hallazgo_critico_pendiente", "mensaje": "No se puede firmar: hay hallazgos críticos sin resolver." } }
{ "error": { "codigo": "plan_ya_existe", "mensaje": "Esta certificación ya tiene un plan de cumplimiento." } }
{ "error": { "codigo": "plan_con_hallazgos_sin_accion", "mensaje": "Hay hallazgos sin ninguna acción cumplida; no se puede cerrar el plan." } }
{ "error": { "codigo": "sin_permiso_verificacion", "mensaje": "Solo un auditor o administrador con alcance puede verificar esta acción." } }
```

---

## Diseño de UI

### Principio de diseño

Este sprint continúa el flujo operativo secuencial iniciado en [[005-certificacion-plan-cumplimiento]] (iniciar → responder → firmar) con: hallazgos → plan → seguimiento → verificación → cierre. Cada pantalla muestra claramente en qué paso del flujo está la certificación (breadcrumb + badge de estado) y ofrece navegación directa al siguiente paso relevante — mismos patrones visuales ya establecidos en 005.

Este sprint agrega los sub-ítems "Mis acciones" y "Verificación" al grupo de navegación **"Certificaciones"** ya creado por 005 en el sidebar.

---

### Pantalla 3 — Revisión y firma (ampliación de 005)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Certificaciones > Planta Central > Revisión y firma      [Breadcrumb]│
├─────────────────────────────────────────────────────────────────────┤
│  Resumen de la certificación                                         │
│  ┌───────────────┬───────────────┬───────────────┬────────────────┐ │
│  │ Puntaje        │ Porcentaje    │ Clasificación │ Estado         │ │
│  │ 85 / 100        │ 85%           │ Excelente      │ ● En progreso  │ │
│  └───────────────┴───────────────┴───────────────┴────────────────┘ │
│                                                                       │
│  ⚠️  Hay 1 hallazgo crítico sin resolver — no se puede firmar.       │
│      [ Ver hallazgos → ]                                             │
│                                                                       │
│                                          [ Firmar y certificar ]      │
│                                            (deshabilitado si crítico) │
└─────────────────────────────────────────────────────────────────────┘
```
El aviso de hallazgo crítico y la deshabilitación del botón son la ampliación que este sprint agrega a la Pantalla 3 ya existente (creada en 005).

---

### Pantalla 4 — Hallazgos (`/certificaciones/[id]/hallazgos`)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Certificaciones > Planta Central > Hallazgos              [Breadcrumb]│
├─────────────────────────────────────────────────────────────────────┤
│  Hallazgos (3)                          [ + Agregar hallazgo manual ] │
│                                          [ Generar automáticos ]      │
│  ─────────────────────────────────────────────────────────────────  │
│  🔴 CRÍTICA   Extintor vencido en planta                             │
│               Pregunta: 1.1.1 a) i) Almacenamiento...   📎 1 evidencia│
│  🟠 MAYOR     Falta señalización de salida de emergencia             │
│  🟡 MENOR     Uniforme de operario sin cofia en un turno             │
│  ─────────────────────────────────────────────────────────────────  │
│                              [ Generar plan de cumplimiento ]        │
└─────────────────────────────────────────────────────────────────────┘
```
- Badge de severidad: `CRITICA` = rojo (`bg-red-light/[0.08] text-red`), `MAYOR` = naranja (token `naranja` de 001), `MENOR` = amarillo (`text-yellow-dark`).
- "Generar plan de cumplimiento" solo visible con ≥1 hallazgo.

---

### Pantalla 5 — Plan de cumplimiento (`/certificaciones/[id]/plan`) — pantalla más compleja del sprint

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│  Certificaciones > Planta Central > Plan de cumplimiento             [Breadcrumb]  │
├───────────────────────────────────────────────────────────────────────────────────┤
│  Plan de cumplimiento                                    [● En seguimiento]        │
│                                                                                      │
│  ┌──────────┬─────────────┬───────────┬────────────┬──────────────────────────┐   │
│  │ Total     │ Pendientes  │ Vencidas  │ % Cumpl.   │ Próximas a vencer (7 d.) │   │
│  │   3       │    1        │    1      │   33%      │       1                 │   │
│  └──────────┴─────────────┴───────────┴────────────┴──────────────────────────┘   │
│                                                                                      │
│  ┌── Acciones correctivas ─────────────────────────────────────────────────────┐   │
│  │ HALLAZGO         ACCIÓN            RESPONSABLE  FECHA LÍMITE  ESTADO  AVANCE│📎│ │
│  │ ────────────────────────────────────────────────────────────────────────── │   │
│  │ 🔴 Extintor      Sustituir el      Juan Pérez    20/07/2026   🟢 Cumplido  │2 │ │
│  │    vencido       extintor                                     100%         │   │
│  │ ────────────────────────────────────────────────────────────────────────── │   │
│  │ 🟠 Falta         Instalar          María Solís    05/08/2026   🔵 En        │1 │ │
│  │    señalización  señalización                                  revisión 80%│   │
│  │ ────────────────────────────────────────────────────────────────────────── │   │
│  │ 🟡 Uniforme      Reforzar          Carlos Mora    01/07/2026   🔴 Vencido   │0 │ │
│  │    sin cofia     capacitación                                  20%         │   │
│  │ ──────────────────────────────────────────────────────────── [+ Acción]   │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                      │
│  ⚠️  No se puede cerrar: el hallazgo "Uniforme sin cofia" no tiene ninguna         │
│      acción cumplida.                                                              │
│                                          [ Cerrar plan ]  (deshabilitado)          │
└──────────────────────────────────────────────────────────────────────────────────┘
```
- Fila de tabla reutiliza las primitivas headless `Table`/`TableRow`/`TableCell` de `packages/ui` (ver `CLAUDE.md` → Sistema de diseño), compuestas en `TablaPlanCumplimiento`.
- Indicadores como tarjetas KPI: `rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card`, mismo contenedor que las cards de dashboard de la plantilla de referencia.
- Estado `Vencido` resaltado con `border-l-4 border-red` en la fila y texto `text-red`.
- Al estar `estado = CERRADO`, toda la tabla pasa a `opacity-90` sin controles de edición, con badge "● Cerrado" y botón "Reabrir plan" en su lugar.

---

### Pantalla 6 — Seguimiento (`/certificaciones/seguimiento`)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Certificaciones > Mis acciones correctivas               [Breadcrumb]│
├─────────────────────────────────────────────────────────────────────┤
│  Mis acciones correctivas (2 pendientes)                              │
│  ─────────────────────────────────────────────────────────────────  │
│  🟠 Instalar señalización de emergencia     Planta Central            │
│     Vence: 05/08/2026 · Avance: 80%                    [ Ver detalle ]│
│  🔴 Reforzar capacitación de uniforme       Planta Central  VENCIDO   │
│     Vence: 01/07/2026 · Avance: 20%                    [ Ver detalle ]│
└─────────────────────────────────────────────────────────────────────┘

  ── detalle de una acción ──
┌──────────────────────────────┐
│  Instalar señalización        │
│  ────────────────────────────│
│  Avance: [▓▓▓▓▓▓▓▓░░] 80%    │
│  ────────────────────────────│
│  Evidencias                   │
│  📄 foto-senal-1.jpg           │
│  [+ Adjuntar evidencia]        │
│  Comentario: [______________] │
│  ────────────────────────────│
│  [ Enviar a revisión ]         │
└──────────────────────────────┘
```

---

### Pantalla 7 — Verificación (`/certificaciones/verificacion`)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Certificaciones > Verificación de acciones                [Breadcrumb]│
├─────────────────────────────────────────────────────────────────────┤
│  Acciones en revisión (1)                                             │
│  ─────────────────────────────────────────────────────────────────  │
│  🟠 Instalar señalización de emergencia     Planta Central  · 80%     │
│     Responsable: María Solís                            [ Revisar ]   │
└─────────────────────────────────────────────────────────────────────┘

  ── panel de verificación ──
┌──────────────────────────────┐
│  Verificar acción              │
│  ────────────────────────────│
│  Evidencias cargadas          │
│  📄 foto-senal-1.jpg (ver)     │
│  ────────────────────────────│
│  Comentario de verificación * │
│  [____________________________]│
│  ────────────────────────────│
│  [ ✓ Marcar cumplido ]  [ ✗ Marcar no cumplido ] │
│                                                    │
│  (si "no cumplido")                                │
│  Nueva fecha límite [__________]                   │
└──────────────────────────────┘
```

---

### Pantalla 8 — Cierre del plan

Integrada en la Pantalla 5 (`/certificaciones/[id]/plan`): botón "Cerrar plan" al pie de la tabla, habilitado únicamente cuando `puedeCerrarse(hallazgos, acciones)` es `true` (cada hallazgo tiene ≥1 acción `CUMPLIDO`). Botón "Reabrir plan" visible cuando `estado = CERRADO`.

---

### Paleta de colores usada en este sprint (tokens ya existentes en `packages/config/tailwind/preset.ts`)

| Token | Uso |
|---|---|
| `bg-red-light/[0.08] text-red` | Severidad `CRITICA`, estado `VENCIDO`, error de validación |
| `bg-naranja-light text-naranja` (token agregado en 001, T-40) | Severidad `MAYOR` |
| `text-yellow-dark` | Severidad `MENOR`, estado `EN_PROCESO` |
| `bg-green-light/[0.08] text-green` | Estado `CUMPLIDO`, badge "Activa"/"Aprobada" |
| `text-blue` / `bg-blue-light/[0.08]` | Estado `EN_REVISION` |
| `bg-gray-3 text-dark-5` | Estado `PENDIENTE`, badge "Cerrado" |
| `rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card` | Contenedor de tarjetas KPI, tablas y paneles |
| `border-l-4 border-red` | Resaltado de fila vencida en la tabla del plan |

No se inventan colores nuevos fuera de estos — si `MAYOR` requiere un tono intermedio no cubierto, reutilizar el token `naranja` ya agregado en el sprint 001 (T-40), no un `#hex` nuevo.

---

## Lógica de los hooks principales

### `usar-revision-certificacion.ts` (ampliación de 005)
```
Estado: certificacion, hallazgos, firmando, error

Derivados:
  puedeFirmar   ← certificacion?.estado === "EN_PROGRESO"
                  && !hallazgos.some(h => h.severidad === "CRITICA" && !tieneAccionCumplida(h))
                  (reemplaza el derivado simplificado de 005, que solo miraba estado)

Acciones:
  firmar()      ← llama servicio, actualiza estado local con codigoVerificacion/pdfUrl/resultadoFinal
```

### `usar-plan-cumplimiento.ts`
```
Estado: plan, indicadores, cargando, error

Derivados:
  puedeCerrarse   ← espejo de domain/plan-cumplimiento.entity.ts::puedeCerrarse (solo UX;
                     la validación real ocurre en el backend al llamar cerrarPlan())

Acciones:
  crearAccion(hallazgoId, datos)
  editarAccion(accionId, datos)
  cerrarPlan() / reabrirPlan()
```

---

## Estándares técnicos obligatorios

### Arquitectura hexagonal (backend)

```
domain/          → sin imports de Express, Prisma, multer
application/     → sin imports de Express, @prisma/client, multer; usa solo los puertos del domain
infrastructure/  → único lugar con Prisma, Express y multer; implementa los puertos e invoca los SP
```

- Los 2 stored procedures (`sp_inspeccion_firmar` reemplazado, `sp_plan_cumplimiento_indicadores`) se invocan únicamente desde `certificacion.prisma-repository.ts` (ya existente, de 005) y `plan-cumplimiento.prisma-repository.ts` respectivamente — nunca desde un caso de uso directamente.
- `almacenamiento-evidencias.adapter.ts` (005) se reutiliza sin cambios para las evidencias de hallazgo y acción correctiva.
- Los controladores de evidencia (`hallazgo.controller.ts`, `accion-correctiva.controller.ts`) usan el middleware `subida-archivo.middleware.ts` (005) para obtener el archivo ya parseado; no manejan `multipart/form-data` manualmente.

### Clean Code

- Nombres en español: `calcularResultadoFinal`, `puedeCerrarse`, `severidadPorDefecto`, `calcularEstadoEfectivo`.
- Un caso de uso, un propósito.
- Sin código muerto. `pnpm lint` en verde en `apps/api` y `apps/web`.

### Documentación ISO — JSDoc

Igual que en 001/005: obligatorio en todas las funciones exportadas de `domain/` y en cada método de los puertos nuevos. Ejemplo:

```
/**
 * Calcula el resultado final de una certificación según la severidad de sus hallazgos.
 * Consumido por 005 (firmar-certificacion.usecase.ts) tras la firma — ver dependencia
 * cruzada documentada en spec.md → Contexto.
 *
 * @param hallazgos - Hallazgos registrados para la certificación (puede ser []).
 * @returns "APROBADA" si no hay hallazgos; "APROBADA_CON_OBSERVACIONES" si el peor
 *          hallazgo es MAYOR o MENOR; "RECHAZADA" si existe al menos un hallazgo CRITICA.
 * @example
 *   calcularResultadoFinal([{ severidad: "MENOR" }])  // → "APROBADA_CON_OBSERVACIONES"
 */
export function calcularResultadoFinal(hallazgos: Hallazgo[]): ResultadoFinal
```

---

## Notas importantes

- `agente-frontend` no toca `apps/api` — cualquier ajuste al contrato de API se solicita en `memoria/sprint/` al agente correspondiente, no se improvisa en el proxy.
- El `empresaId` viene siempre del JWT; el alcance por `sucursalId`/`clienteId` se resuelve con lo que exponga el módulo `auth` de 004 (ya confirmado por 005 T-207).
- Ninguna entidad de este módulo se elimina físicamente — hallazgos, planes, acciones y evidencias son historial permanente.
- La verificación pública del PDF (sin login, vía URL externa) y las notificaciones automáticas de vencimiento quedan explícitamente fuera de este sprint (ver `spec.md` → "Fuera de alcance"); no se debe construir infraestructura de correo/push aquí aunque parezca natural al implementar `VENCIDO`.
- **Prerrequisito no negociable**: no iniciar este sprint sin [[005-certificacion-plan-cumplimiento]] mergeado — la migración `add_hallazgos_plan_cumplimiento` referencia `inspeccion(id)`, que ya debe tener las columnas de certificación de 005 aplicadas.

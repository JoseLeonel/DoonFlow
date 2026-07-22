# Guía de implementación — 015-wizard-certificacion

> Referencia técnica para los agentes. Describe qué construir y dónde, sin escribir el código — el código va en el repositorio, no aquí.
> Este sprint amplía el módulo `inspeccion` ya existente (no crea un módulo nuevo): `Inspeccion` gana los campos mínimos para el formulario (`sucursalId`, `periodoEtiqueta`). **No incluye firma digital, PDF ni código de verificación** — eso queda pausado en [[005-certificacion-plan-cumplimiento]], que ahora depende de este sprint. [[013-hallazgos-plan-cumplimiento]] (hallazgos/plan de cumplimiento) depende a su vez de que 005 se retome.

---

## Decisiones tomadas para resolver las ambigüedades de `spec.md`

1. **Periodicidad de `periodoEtiqueta`**: se mantiene como texto libre ingresado por el usuario en el Paso 0 del wizard (ej. "Julio 2026", "Q3 2026"), sin derivarlo de una configuración de periodicidad en la plantilla. Formalizar la periodicidad queda fuera de alcance (ver `spec.md` → "Fuera de alcance").
2. **Cálculo de puntaje/clasificación sin firma**: como no hay una transacción de firma que dispare un cálculo atómico, `calcularResumen()` (dominio, función pura) se ejecuta **en el momento de la lectura** (endpoint `GET .../resumen`), no en una escritura. No se necesita stored procedure en este sprint — es una simplificación deliberada frente a la versión con firma (que sí usaba un SP transaccional).
3. **Estado "completado sin firmar"**: este sprint no agrega ningún valor nuevo a `estado` — se queda en `EN_PROGRESO` incluso después de "Guardar y finalizar". Si negocio necesita distinguir "listo para firmar" de "a medio llenar" antes de que se retome 005, es una decisión a tomar en ese momento, no una suposición de este sprint.

---

## Archivos a crear / completar

### Base de datos (`packages/db`)

```
prisma/
├── schema.prisma                                    ← MODIFICAR: ampliar Inspeccion (solo sucursalId/periodoEtiqueta)
├── migrations/
│   └── YYYYMMDDHHMMSS_add_certificacion/
│       └── migration.sql
└── seeds/
    └── certificaciones-demo.ts                      ← CREAR (opcional; 1 certificación EN_PROGRESO de ejemplo)

sql/
└── migraciones-datos/
    └── 2026xxxx_emparejar_establecimiento_sucursal.sql ← CREAR
```

**Modelo Prisma a ampliar en `schema.prisma`** (referencia, no se escribe código aquí):

```prisma
model Inspeccion {
  // ... campos ya existentes (empresaId, plantillaId, plantillaVersion, inspectorId,
  //     establecimiento @deprecated, fechaInicio, fechaFin, estado, puntajeObtenido,
  //     puntajeMaximo, porcentajeCumplimiento, clasificacion, observaciones) ...

  sucursalId          String?   @map("sucursal_id")
  periodoEtiqueta     String?   @map("periodo_etiqueta") @db.VarChar(50)

  sucursal        Sucursal?          @relation(fields: [sucursalId], references: [id])

  // [[005-certificacion-plan-cumplimiento]] agrega aquí (pausado, no implementar todavía):
  //   firmadoPorId, firmadoEn, codigoVerificacion, pdfUrl, fechaVencimiento, resultadoFinal,
  //   relación firmadoPor.
  // 013 agrega (cuando 005 se retome): hallazgos Hallazgo[], planCumplimiento PlanCumplimiento?

  @@index([sucursalId])
}
```

> **No se crea `sp_inspeccion_firmar` en este sprint.** El cálculo de puntaje/clasificación para el paso de revisión es una función de dominio pura (`calcularResumen()`), sin stored procedure — ver "Decisiones tomadas" punto 2.

### Backend (`apps/api/src/modules/inspeccion/`)

```
domain/
├── plantilla.entity.ts                  ← YA EXISTE (sin cambios)
├── plantilla.repository.port.ts         ← YA EXISTE
├── inspeccion.errors.ts                 ← CREAR/AMPLIAR
├── evidencia.entity.ts                  ← CREAR (013 lo reutiliza sin duplicarlo)
├── certificacion.entity.ts              ← CREAR
└── certificacion.repository.port.ts     ← CREAR

application/
├── plantilla.schema.ts                  ← YA EXISTE
├── certificacion.schema.ts              ← CREAR
└── casos-uso/
    ├── gestionar-plantilla.usecase.ts        ← YA EXISTE
    ├── iniciar-certificacion.usecase.ts      ← CREAR
    └── responder-certificacion.usecase.ts    ← CREAR

infrastructure/
├── plantilla.controller.ts              ← YA EXISTE
├── plantilla.prisma-repository.ts       ← YA EXISTE
├── inspeccion.router.ts                 ← AMPLIAR
├── certificacion.controller.ts          ← CREAR
├── certificacion.prisma-repository.ts   ← CREAR
└── almacenamiento-evidencias.adapter.ts ← CREAR (013 lo reutiliza)

index.ts                                 ← MODIFICAR

__tests__/
├── plantilla.entity.test.ts             ← YA EXISTE
├── gestionar-plantilla.usecase.test.ts  ← YA EXISTE
├── certificacion.entity.test.ts         ← CREAR
├── iniciar-certificacion.usecase.test.ts     ← CREAR
└── responder-certificacion.usecase.test.ts   ← CREAR
```

> **No se crea** `firmar-certificacion.usecase.ts` ni `pdf-certificacion.adapter.ts` en este sprint — quedan pausados en [[005-certificacion-plan-cumplimiento]].

**Middleware transversal (`apps/api/src/shared/`)**

```
shared/middleware/subida-archivo.middleware.ts   ← CREAR (multer, 10MB, tipos permitidos; 013 lo reutiliza)
```

### Route Handlers proxy (Next.js)

```
apps/web/src/app/api/inspeccion/
├── plantillas/...                                   ← YA EXISTE
└── certificaciones/
    ├── route.ts                                     ← GET (lista) + POST (iniciar)
    └── [id]/
        ├── route.ts                                 ← GET completa
        ├── secciones/
        │   └── [seccionId]/
        │       └── respuestas/route.ts               ← PATCH
        ├── evidencias/route.ts                       ← POST (multipart passthrough)
        └── resumen/route.ts                          ← GET

# Cuando se retome 005 (pausado): firmar/route.ts, pdf/route.ts.
# 013 agrega bajo el mismo apps/web/src/app/api/inspeccion/: hallazgos/, plan-cumplimiento/,
# acciones/, mis-acciones/, acciones-en-revision/ (después de que 005 se retome).
```

### Tipos compartidos (`packages/shared`)

```
src/types/certificacion.ts   ← CREAR
src/index.ts                 ← MODIFICAR: re-exportar types/certificacion.ts
```

**Tipos a definir (referencia):**
```typescript
export type EstadoCertificacion = "EN_PROGRESO"; // 005 (pausado) agrega "FIRMADA"

export interface Certificacion {
  id: string;
  sucursalId?: string;
  periodoEtiqueta?: string;
  estado: EstadoCertificacion;
  puntajeObtenido: number;
  puntajeMaximo: number;
  porcentajeCumplimiento: number;
  clasificacion?: string;
}

// [[005-certificacion-plan-cumplimiento]] agrega en este mismo archivo (pausado, no implementar
// todavía): firmadoPorId, firmadoEn, codigoVerificacion, pdfUrl, fechaVencimiento, resultadoFinal.
// 013 agrega (cuando 005 se retome): Hallazgo, HallazgoEvidencia, PlanCumplimiento,
// AccionCorrectiva, AccionCorrectivaEvidencia, IndicadoresPlan, EvidenciaConsolidada.
```

### Frontend (`apps/web`)

```
src/app/(dashboard)/inspecciones/
└── [id]/
    └── ejecutar/page.tsx                ← ELIMINADO (obsoleto, ver T-227)

# ⚠️ DECISIÓN TOMADA DURANTE LA IMPLEMENTACIÓN (2026-07-18, reemplaza el plan original de T-226):
# en vez de retrofitear tabla-ficha.tsx/fila-seccion.tsx/fila-pregunta.tsx (editor de estructura
# de 001, ya probado, con drag-handles y edición) con un prop modo="responder", se construyeron
# componentes NUEVOS y dedicados para el wizard (mismo lenguaje visual — colores/tipografía/
# indentación — pero sin tocar el editor existente). Menor riesgo de regresión sobre un componente
# ya en producción. tabla-ficha/fila-seccion/fila-pregunta de 001 NO se modificaron.

src/app/(dashboard)/certificaciones/
├── page.tsx                             ← CREADO (listado de certificaciones — no estaba en el plan original, necesario como destino de "Guardar y finalizar" y del ítem de sidebar)
├── nueva/
│   └── page.tsx                         ← CREADO (Wizard, Paso 0: cliente → sucursal → período)
├── [id]/
│   ├── responder/page.tsx               ← CREADO (Wizard, Pasos 1..N: una sección por paso)
│   └── revision/page.tsx                ← CREADO (Wizard, paso final: revisión, SIN firma)
├── _servicios/
│   └── certificacion.servicio.ts        ← CREADO
├── _hooks/
│   ├── utilidades-arbol.ts              ← CREADO (helper compartido: ids de preguntas de un árbol)
│   ├── usar-certificaciones.ts          ← CREADO (listado)
│   ├── usar-iniciar-certificacion.ts    ← CREADO
│   ├── usar-responder-certificacion.ts  ← CREADO (datos: carga + guardado por sección + evidencias)
│   ├── usar-wizard-certificacion.ts     ← CREADO (⭐ wizard — navegación: pasoActual, pasosVisitados, avanzar/retroceder/irAPaso)
│   └── usar-revision-certificacion.ts   ← CREADO (⭐ sin firma — resumen + "Guardar y finalizar")
├── _components/
│   ├── respuesta-widget.tsx             ← CREADO (extraído/adaptado del ejecutar/page.tsx obsoleto)
│   ├── pregunta-wizard.tsx              ← CREADO (fila de pregunta: widget + comentario + evidencia)
│   ├── seccion-wizard.tsx               ← CREADO (renderiza el árbol de UNA sección de nivel 0)
│   ├── wizard-certificacion.tsx         ← CREADO (⭐ wizard — shell: barra de progreso, Anterior/Siguiente)
│   ├── indicador-progreso-wizard.tsx    ← CREADO (⭐ wizard — stepper reutilizable, sin lógica de negocio)
│   └── tabla-certificaciones.tsx        ← CREADO (tabla del listado)
└── __tests__/
    ├── usar-responder-certificacion.test.ts ← CREADO
    ├── usar-wizard-certificacion.test.ts    ← CREADO (⭐ wizard)
    ├── wizard-certificacion.test.tsx        ← CREADO (⭐ wizard)
    ├── indicador-progreso-wizard.test.tsx   ← CREADO (⭐ wizard)
    └── usar-revision-certificacion.test.ts  ← CREADO

src/app/(dashboard)/_components/sidebar.tsx  ← AMPLIADO: ítem "Certificaciones" (href `/certificaciones`) con sub-ítem "Nueva certificación"
src/app/api/inspeccion/[...path]/route.ts    ← CORREGIDO: reenvía el cuerpo crudo (blob) con el Content-Type original en vez de forzar "application/json" — el proxy anterior rompía `multipart/form-data` (evidencias). Verificado con curl (subida real de archivo a través del proxy, HTTP 201).

# Cuando se retome 005 (pausado): usar-revision-certificacion.ts gana la acción de firmar,
# página revision/page.tsx gana el botón "Firmar y certificar", código de verificación y PDF.
# 013 agrega bajo apps/web/src/app/(dashboard)/certificaciones/ (después de que 005 se retome):
# [id]/hallazgos/page.tsx, [id]/plan/page.tsx, seguimiento/page.tsx, verificacion/page.tsx, etc.
```

---

## Contrato de API (este sprint — sin firma)

Todos los endpoints cuelgan del prefijo ya montado `/inspeccion` (`apps/api/src/index.ts` → `app.use("/inspeccion", moduloInspeccion.router)`). Todos requieren `Authorization: Bearer <token>` y aplican el alcance de [[004-usuarios-roles-alcance]] en el filtrado.

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/inspeccion/certificaciones` | Iniciar certificación `{ plantillaId, sucursalId, periodoEtiqueta }` |
| GET | `/inspeccion/certificaciones` | Listar (`?sucursalId=&clienteId=&estado=&pagina=&porPagina=`), acotado por alcance |
| GET | `/inspeccion/certificaciones/:id` | Certificación completa (cabecera + árbol de nodos + respuestas + evidencias) |
| PATCH | `/inspeccion/certificaciones/:id/respuestas` | Guardar respuestas `{ respuestas: [{ nodoId, valor?, valores?, comentario? }] }` — **sin `seccionId` en la ruta**: el alcance a "una sola sección" lo aplica el frontend enviando solo los `nodoId` de la sección actual; el backend simplemente upsertea los `nodoId` recibidos (decisión tomada durante la implementación, más simple que el diseño original) |
| POST | `/inspeccion/certificaciones/:id/evidencias` | Subir evidencia de una respuesta (`multipart/form-data`: `detalleId`, `archivo`) |
| GET | `/inspeccion/certificaciones/:id/resumen` | Puntaje/porcentaje/clasificación calculados en el momento, desglosados por sección |

**No existen en este sprint:** `POST .../firmar`, `GET .../pdf` — pausados en [[005-certificacion-plan-cumplimiento]].

**Request body — iniciar certificación:**
```json
{ "plantillaId": "uuid", "sucursalId": "uuid", "periodoEtiqueta": "Julio 2026" }
```

**Response — resumen:**
```json
{
  "data": {
    "puntajeObtenido": 85,
    "puntajeMaximo": 100,
    "porcentajeCumplimiento": 85,
    "clasificacion": "Excelente",
    "porSeccion": [
      { "seccionId": "uuid", "titulo": "1. Edificio", "respondidas": 12, "total": 12 },
      { "seccionId": "uuid", "titulo": "3. Equipos y utensilios", "respondidas": 5, "total": 7 }
    ]
  }
}
```

**Errores de este sprint:**
```json
{ "error": { "codigo": "certificacion_no_editable", "mensaje": "Esta certificación ya no admite cambios." } }
{ "error": { "codigo": "sucursal_fuera_de_alcance", "mensaje": "No tiene acceso a esta sucursal." } }
{ "error": { "codigo": "archivo_no_permitido", "mensaje": "Tipo de archivo o tamaño no permitido (máx. 10MB, jpg/png/heic/pdf/doc/docx)." } }
```

---

## Diseño de UI

### Principio de diseño (⭐ wizard — flujo principal de todo el sistema)

Este sprint cubre el **wizard de formulario**: Paso 0 (período) → Pasos 1..N (una sección de la ficha por paso) → paso final (revisión, sin firma). El usuario nunca ve el formulario completo de una sola vez — cada paso muestra únicamente el título y las preguntas de **una** sección de nivel 0, con una barra de progreso fija que indica en qué paso está y permite volver a cualquier paso ya visitado. Es exactamente el mismo patrón de "un paso, un título, avanzar" que pidió el negocio para no perder al usuario en un formulario largo.

Nuevo grupo de navegación en el sidebar: **"Certificaciones"**, separado de "Inspecciones" (que sigue siendo el editor de plantillas/estructura de Mantenimientos).

---

### Paso 0 — Indicar el período (`/certificaciones/nueva`)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Certificaciones > Nueva certificación                        [Breadcrumb] │
├──────────────────────────────────────────────────────────────────────────┤
│ Nueva certificación                                                       │
│ Selecciona cliente, sucursal y período para iniciar                       │
│ ────────────────────────────────────────────────────────────────────────  │
│                                                                            │
│  Cliente *                                                                │
│  [ Agro Norte S.A.                                    ▾ ]                 │
│                                                                            │
│  Sucursal *                                                               │
│  [ Planta Central                                     ▾ ]                 │
│                                                                            │
│  Ficha a aplicar                                                          │
│  [ Inspección Ministerio de Salud 2026            ]  (plantilla vigente)  │
│                                                                            │
│  Período *                                                                │
│  [ Julio 2026                                          ]                  │
│                                                                            │
│  ────────────────────────────────────────────────────────────────────    │
│                                       [ Iniciar formulario ]              │
└──────────────────────────────────────────────────────────────────────────┘
```
- Solo lista clientes/sucursales dentro del alcance del usuario (reutiliza el selector de 003).
- "Iniciar formulario" deshabilitado hasta completar Cliente, Sucursal y Período.
- Al confirmar, crea la `Inspeccion` y redirige a `/certificaciones/[id]/responder` — arranca el wizard en el Paso 1. El período queda fijo desde aquí.

---

### Pasos 1..N — Wizard, una sección por paso (`/certificaciones/[id]/responder`)

`WizardCertificacion` (shell) envuelve `SeccionWizard` — componente **nuevo y dedicado** (no el `TablaFicha` del editor de 001, ver decisión de implementación arriba) que recorre recursivamente el árbol de **una sola sección de nivel 0 a la vez** y, en cada hoja PREGUNTA, renderiza `PreguntaWizard` con el `RespuestaWidget` correspondiente a `tipoRespuesta` — misma composición visual que existía en el `ejecutar/page.tsx` obsoleto, adaptada a `NodoArbol`/`NodoOpcion`.

```
┌─────────────────────────────────────────────────────────────────────┐
│  Certificaciones > Planta Central > Responder             [Breadcrumb]│
├─────────────────────────────────────────────────────────────────────┤
│  Inspección Ministerio de Salud 2026 · Julio 2026    [● En progreso] │
├─────────────────────────────────────────────────────────────────────┤
│  ①───②───③───④───⑤───⑥───⑦───⑧      ← IndicadorProgresoWizard      │
│  ✓    ✓   ●   ○   ○   ○   ○   ○        (✓ visitado ● actual ○ falta)│
│         Paso 3 de 8 · 1. EDIFICIO                                    │
├─────────────────────────────────────────────────────────────────────┤
│  ████  1. EDIFICIO  ██████████████████████████████████████████████  │
│    1.1  PLANTA Y SUS ALREDEDORES                                     │
│      a) Limpios                                                      │
│         i)  Almacenamiento del equipo en desuso                      │
│             [ ✓ Sí ]  [ ✗ No ]                     📎 Adjuntar (0/3)  │
│         ii) Libres de basuras y desperdicios                         │
│             [ ✓ Sí ]  [ ✗ No ]                                        │
├─────────────────────────────────────────────────────────────────────┤
│  [ ← Anterior ]                                    [ Siguiente → ]   │
└─────────────────────────────────────────────────────────────────────┘
```
- El paso solo muestra las preguntas de **esa** sección — al presionar "Siguiente" se guardan (guardado explícito por paso) y avanza a la siguiente sección.
- "Anterior" está deshabilitado en el paso 1 (el período ya quedó fijo desde la pantalla previa).
- Hacer clic en `①` o `②` de la barra (ya visitados, con `✓`) navega directo a ese paso; hacer clic en `④` (no visitado) no hace nada.
- En el último paso (8 de 8), "Siguiente" cambia su texto a "Continuar a revisión →" y navega a `/certificaciones/[id]/revision`.

---

### Paso final — Revisión, sin firma (`/certificaciones/[id]/revision`)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Certificaciones > Planta Central > Revisión               [Breadcrumb]│
├─────────────────────────────────────────────────────────────────────┤
│  Resumen del formulario                                              │
│  ┌───────────────┬───────────────┬───────────────┐                  │
│  │ Puntaje        │ Porcentaje    │ Clasificación │                  │
│  │ 85 / 100        │ 85%           │ Excelente      │                  │
│  └───────────────┴───────────────┴───────────────┘                  │
│                                                                       │
│  Por sección:                                                        │
│   1. Edificio ................................ ✓ 12/12               │
│   2. Personal ................................. ✓ 8/8                │
│   3. Equipos y utensilios ..................... ⚠ 5/7 sin responder  │
│   ...                                            [ ↩ Volver a esta ] │
│                                                                       │
│                                          [ Guardar y finalizar ]      │
└─────────────────────────────────────────────────────────────────────┘
```
- **No hay** botón "Firmar", código de verificación ni descarga de PDF en esta pantalla — eso se agrega cuando se retome [[005-certificacion-plan-cumplimiento]] (pausado).
- "Guardar y finalizar" navega a la lista de certificaciones. No cambia `estado`.

---

### Paleta de colores usada en este sprint (tokens ya existentes en `packages/config/tailwind/preset.ts`)

| Token | Uso |
|---|---|
| `bg-gray-3 text-dark-5` | Badge "En progreso" |
| `rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card` | Contenedor de tarjetas de resumen |

No se inventan colores nuevos fuera de estos.

---

## Lógica de los hooks principales

### `usar-responder-certificacion.ts` (datos — carga y guardado por sección)
```
Estado:
  certificacion: Certificacion | null
  cargando: boolean
  respuestas: Record<nodoId, RespuestaLocal>
  guardandoSeccion: boolean           ← guardado en curso de la sección actual (para el botón "Siguiente")

Derivados:
  progresoGlobal                      ← secciones con InspeccionDetalle guardado / totalSecciones
  progresoPorSeccion(seccionId)       ← respondidas / preguntas de esa sección (contarPreguntas() acotado a la sección)

Acciones:
  actualizarRespuesta(nodoId, valor)  ← optimistic update, solo en memoria (no guarda todavía)
  guardarSeccion(seccionId)           ← Promise<void> — envía todas las respuestas en memoria de esa sección; usado por usar-wizard-certificacion.avanzar()
  adjuntarEvidencia(detalleId, archivo)
```

### `usar-wizard-certificacion.ts` (⭐ wizard — navegación entre pasos)
```
Estado:
  pasoActual: number                  ← 1..N (secciones); N+1 navega fuera del wizard (a revisión)
  pasosVisitados: Set<number>

Derivados:
  secciones                           ← plantilla.nodos de nivel 0, mismo orden que el editor de 001
  totalPasos                          ← secciones.length
  seccionActual                       ← secciones[pasoActual - 1]
  esUltimoPaso                        ← pasoActual === totalPasos
  puedeIrA(n)                         ← pasosVisitados.has(n) || n === Math.max(...pasosVisitados) + 1

Acciones:
  avanzar()                           ← await guardarSeccion(seccionActual.id); pasosVisitados.add(pasoActual);
                                         si esUltimoPaso → router.push(revision); si no → pasoActual++
  retroceder()                        ← pasoActual-- (sin volver a guardar)
  irAPaso(n)                          ← si puedeIrA(n) → pasoActual = n; si no, no hace nada (silencioso, el
                                         stepper ya lo muestra deshabilitado, no hace falta mensaje de error)

Inicialización:
  al montar, calcula pasosVisitados a partir de qué secciones ya tienen al menos un InspeccionDetalle
  guardado para esta certificación (permite retomar el wizard donde quedó tras recargar o volver más tarde)
```

### `usar-revision-certificacion.ts` (⭐ sin firma)
```
Estado: certificacion, resumen, cargando

Derivados:
  haySeccionesIncompletas   ← resumen?.porSeccion.some(s => s.respondidas < s.total)

Acciones:
  guardarYFinalizar()       ← router.push a la lista de certificaciones. No cambia `estado`, no llama
                               ningún endpoint de firma. Cuando se retome 005 (pausado), esta acción se
                               reemplaza por una que sí firme, sin cambiar la forma del hook para el resto
                               de la pantalla.
```

---

## Estándares técnicos obligatorios

### Arquitectura hexagonal (backend)

```
domain/          → sin imports de Express, Prisma, multer
application/     → sin imports de Express, @prisma/client, multer; usa solo los puertos del domain
infrastructure/  → único lugar con Prisma, Express y multer; implementa los puertos
```

- `almacenamiento-evidencias.adapter.ts` es un adaptador de infraestructura: los casos de uso lo reciben inyectado por interfaz (puerto), igual que los repositorios.
- El controlador de evidencia (`certificacion.controller.ts`) usa el middleware `subida-archivo.middleware.ts` para obtener el archivo ya parseado; no maneja `multipart/form-data` manualmente.

### Clean Code

- Nombres en español: `puedeEditarRespuestas`, `calcularResumen`, `guardarRespuestasSeccion`.
- Un caso de uso, un propósito.
- Sin código muerto. `pnpm lint` en verde en `apps/api` y `apps/web`.

### Documentación ISO — JSDoc

Igual que en 001: obligatorio en todas las funciones exportadas de `domain/` y en cada método de los puertos nuevos. Ejemplo:

```
/**
 * Calcula el puntaje, porcentaje y clasificación de una certificación en el momento de la lectura.
 *
 * @param detalles - Respuestas guardadas de la certificación.
 * @param puntajeMaximoPlantilla - Puntaje máximo configurado en la plantilla vigente.
 * @returns Resumen con puntajeObtenido, puntajeMaximo, porcentajeCumplimiento y clasificacion.
 * @example
 *   calcularResumen([], 100)  // → { puntajeObtenido: 0, puntajeMaximo: 100, porcentajeCumplimiento: 0, clasificacion: undefined }
 */
export function calcularResumen(detalles: InspeccionDetalle[], puntajeMaximoPlantilla: number): ResumenCertificacion
```

---

## Notas importantes

- `agente-frontend` no toca `apps/api` — cualquier ajuste al contrato de API se solicita en `memoria/sprint/` al agente correspondiente, no se improvisa en el proxy.
- El `empresaId` viene siempre del JWT; el alcance por `sucursalId`/`clienteId` se resuelve con lo que exponga el módulo `auth` de 004 — si ese módulo no expone todavía un helper de "alcance del usuario actual", `agente-backend` lo solicita antes de escribir los repositorios de este sprint (ver T-207).
- Ninguna entidad de este módulo se elimina físicamente — certificaciones y evidencias son historial permanente.
- El placeholder `inspecciones/[id]/ejecutar/page.tsx` que ya existía en el repositorio quedó desalineado con el modelo real de datos (usaba `apartados/subapartados/preguntas` en vez de `NodoArbol`) — se elimina como parte de este sprint (T-227), no se intenta repararlo in-place.
- **⚠️ No implementar firma digital, PDF ni código de verificación en este sprint** — es una instrucción explícita del usuario (2026-07-16). Esa parte queda documentada y pausada en [[005-certificacion-plan-cumplimiento]]; retomarla requiere una decisión explícita futura, no se reintroduce por inercia al continuar este trabajo.
- [[013-hallazgos-plan-cumplimiento]] depende de que 005 (firma) se retome primero — no se puede implementar antes que eso, porque necesita el estado `FIRMADA` y el concepto de certificación cerrada para tener sentido.

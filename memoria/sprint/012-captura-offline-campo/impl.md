# Guía de implementación — 012-captura-offline-campo

> Referencia técnica para los agentes. Describe qué construir y dónde, sin escribir el código — el código va en el repositorio, no aquí.

---

## Desviaciones respecto a este documento (registradas durante la implementación, 2026-07-22)

1. **T-490/T-501 (firma) siguen bloqueadas** — `firmar-certificacion.usecase.ts` y el botón "Firmar y certificar" no existen porque dependen de 005 (pausado), tal como este documento ya anticipaba. `puedeFirmarse()` y `SincronizacionPendienteError` se implementaron igual, listas para cuando 005 se retome. En `revision/page.tsx` se agregó de todas formas un banner informativo de pendientes (no bloqueante, no requiere el botón).
2. **No se creó `certificacion.errors.ts` como archivo separado** — el código real del módulo `inspeccion` mantiene todos los errores juntos en `domain/inspeccion.errors.ts` (así ya estaba desde 001/007/015). `SincronizacionPendienteError` y `LoteSincronizacionExcedeLimiteError`/`RespuestaNoSincronizadaError` (este último no estaba en el spec original, se agregó al descubrir la necesidad durante la implementación) se agregaron ahí.
3. **Puerto `upsertDetalleConResolucionConflicto` → `upsertDetallesConResolucionConflicto` (plural, por lote)** — el spec lo describía por-respuesta-individual, pero T-488 pedía envolver el lote completo en una única transacción Prisma; una firma por-lote hace eso posible sin que el caso de uso orqueste la transacción (violaría la regla hexagonal de que la transacción vive en `infrastructure/`).
4. **No se implementó `contarPendientesSincronizacion()`** — "pendientes" es estado que solo existe en el cliente (cola de IndexedDB); el servidor no tiene forma confiable de contarlo. El endpoint `GET .../sincronizacion/estado` devuelve únicamente `{ sincronizadoEn, capturaOffline }`, no `{ pendientes, ... }` como sugería el contrato original del spec.
5. **Auditoría de conflictos vía `RegistradorEventoAuditoria`, no un puerto inyectado directamente** — este spec se escribió (2026-07-16) antes de que 010-seguridad-privacidad-continuidad implementara el patrón real de integración cross-módulo (`crearRegistradorEventoAuditoria()`, un helper de función simple con captura de errores). `SincronizarCapturaOfflineUseCase` sigue ese mismo patrón que ya usan `auth`/`permisos`/`retencion`, en vez de recibir `RegistroAuditoriaRepositoryPort` crudo.
6. **El puntaje nunca se confía del cliente** — aunque el contrato de API de este documento incluía `puntajeObtenido` en el payload de sincronización, el caso de uso lo recalcula siempre server-side con `calcularPuntajeRespuesta()` (mismo dominio puro que usa el guardado en línea de 015) — un cliente no puede inflar su propio puntaje enviando un valor arbitrario.
7. **T-491 (Route Handlers proxy) no generó ningún archivo nuevo** — el catch-all `apps/web/src/app/api/inspeccion/[...path]/route.ts`, creado en 015, ya reenvía genéricamente cualquier subruta (incluye JSON y `multipart/form-data`) bajo `/inspeccion/**`. Verificado por curl a través del proxy real: los 3 endpoints nuevos funcionan sin código adicional.
8. **Hook `usar-captura-offline.ts` vive en `certificaciones/_hooks/`, no en `certificaciones/[id]/_hooks/`** — esa carpeta por-id no existe en el código real; 015 puso todos los hooks del módulo en un único `_hooks/` a nivel de módulo. `estadoSincronizacion` es un **estado derivado** (`useMemo` sobre `estadoConexion`/`sincronizando`/`confirmacionVisible`/`pendientes`/`huboFalla`), no una máquina de estados con transiciones manuales — evita inconsistencias entre transiciones. Se agregó un 5º valor posible, `null` ("nada que comunicar"), para que el banner se oculte cuando está online y sin pendientes — el spec listaba solo 4 estados asumiendo que el banner siempre está en uno de ellos.
9. **`guardarRespuesta()` → `guardarRespuestasLote()` (por lote, no singular)** — el wizard real (015) guarda todas las respuestas de una sección de una vez (`guardarSeccion()`), no respuesta por respuesta; el hook expone la operación que el wizard realmente necesita.
10. **`usar-responder-certificacion.ts` recibe `capturaOffline` inyectado por parámetro** (`CapturaOfflineInyectada`), en vez de importar `usar-captura-offline` directamente — permite que la página componga ambos hooks (uno para los datos del wizard, otro para el banner) compartiendo la misma fuente de verdad (IndexedDB) sin duplicar lógica de conexión de red.
11. **Evidencia offline identificada por `nodoId`, no `detalleId`** — se cambió la firma de `onSubirEvidencia` en `seccion-wizard.tsx`/`pregunta-wizard.tsx` de `(detalleId, archivo)` a `(nodoId, archivo)`, y se relajó la condición de mostrar el control de "Adjuntar archivo" en `PreguntaWizard` de `detalleId ?` a `esRespondida ?` — permite adjuntar evidencia a una pregunta recién respondida offline, antes de que exista un `InspeccionDetalle` real en el servidor. `usar-responder-certificacion.ts` genera un `id` sintético `offline:<nodoId>` para el detalle mientras no se conoce el id real; se reemplaza por el real la próxima vez que se recarga la certificación desde el servidor.
12. **IndexedDB con API nativa envuelta en promesas, sin librería `idb`** — cero dependencias nuevas para la capa de almacenamiento. Los 4 stores/índices se crean en `db-offline.ts`.
13. **Verificación activa de conexión contra `fetch("/", { method: "HEAD" })`** (el propio origin), no un endpoint `/api/salud` nuevo — evita crear infraestructura adicional solo para esto; confirma alcanzabilidad real del servidor igual de bien.
14. **Hallazgo real durante la verificación E2E (no es un bug de código, es una limitación del diseño de conflictos tal como lo especificó el spec)**: reenviar el mismo lote con el mismo `capturadoEnCliente` original (ej. un reintento genuino del cliente tras perder la respuesta HTTP, aunque la escritura ya hubiera tenido éxito) se reporta como "conflicto" — porque `InspeccionDetalle.actualizadoEn` refleja la hora en que el SERVIDOR recibió el primer sync, que siempre es posterior al `capturadoEnCliente` original del dispositivo. No hay pérdida de datos (la fila no se sobrescribe con nada distinto), pero sí generaría una entrada de auditoría de `SINCRONIZACION_CONFLICTO` innecesaria en ese escenario de reintento legítimo. Solucionarlo requeriría guardar además el último `capturadoEnCliente` aplicado en la fila (columna nueva, fuera del alcance de la migración ya aplicada) — queda documentado como limitación conocida, no corregido en este sprint.
15. **`_establecerBackoffBaseMsParaTests()` / `_reiniciarConexionParaTests()`** — funciones exportadas solo para tests (prefijo `_`), permiten reducir el backoff real a milisegundos en vez de mezclar fake timers con `fake-indexeddb` (combinación frágil que causó timeouts reales al probarla).
16. **No se implementó test de integración contra BD de pruebas (T-506)** — no existe infraestructura de BD de pruebas en este proyecto (gap preexistente, documentado en sprints anteriores). La idempotencia se verificó manualmente por curl contra la base de desarrollo real, incluyendo el hallazgo del punto 14.
17. **Conteo final de tests**: 174 backend (+7 sobre el baseline de 167 tras sprint 009) / 195 frontend (+21 sobre 174), mismas 6 fallas preexistentes de `strip-resumen-plantilla.test.tsx` no relacionadas con este sprint.

---

## Archivos a crear / modificar

### Base de datos (`packages/db`)

```
prisma/
├── schema.prisma                                    ← MODIFICAR: model Inspeccion (agregar capturaOffline, sincronizadoEn)
└── migrations/
    └── YYYYMMDDHHMMSS_add_captura_offline_inspeccion/
        └── migration.sql                            ← generada por prisma migrate dev
```

**Campos a agregar en `model Inspeccion` (`schema.prisma`):**
```prisma
capturaOffline  Boolean   @default(false) @map("captura_offline")
sincronizadoEn  DateTime? @map("sincronizado_en")
```
Índice nuevo: `@@index([empresaId, capturaOffline])`.

> No se modifica `InspeccionDetalle` ni `InspeccionEvidencia`. La idempotencia de sincronización se apoya en el upsert por `(inspeccionId, nodoId)` que ya usa el guardado incremental en línea de [[015-wizard-certificacion]] — reenviar el mismo `nodoId` con el mismo contenido no crea una fila nueva.

---

### Backend (`apps/api`) — módulo `inspeccion` (ampliación de 015, no un módulo nuevo)

> `apps/api/src/modules/inspeccion/` es el mismo módulo del editor de plantillas de [[001-crud-formulario]] — [[015-wizard-certificacion]] agregó los archivos `certificacion.*` **dentro** de ese módulo (no creó `modules/certificaciones/` aparte), montado bajo el prefijo `/inspeccion` ya existente. Este sprint modifica esos mismos archivos. (Si se retoma [[005-certificacion-plan-cumplimiento]], pausado, esos mismos archivos ganan los campos/handlers de firma.)

```
src/modules/inspeccion/
├── domain/
│   ├── certificacion.entity.ts        ← MODIFICAR: capturaOffline, sincronizadoEn, puedeFirmarse()
│   ├── certificacion.errors.ts        ← MODIFICAR: agregar SincronizacionPendienteError
│   └── certificacion.repository.port.ts ← MODIFICAR: 3 métodos nuevos (ver abajo)
├── application/
│   ├── casos-uso/
│   │   ├── sincronizar-captura-offline.usecase.ts   ← CREAR
│   │   └── firmar-certificacion.usecase.ts          ← MODIFICAR (de 005): invoca puedeFirmarse()
│   └── certificacion.schema.ts        ← MODIFICAR: sincronizarLoteSchema (Zod)
├── infrastructure/
│   ├── certificacion.prisma-repository.ts  ← MODIFICAR: implementa los 3 métodos nuevos
│   ├── certificacion.controller.ts         ← MODIFICAR: 3 handlers nuevos
│   └── inspeccion.router.ts                ← AMPLIAR: 3 rutas nuevas de sincronización
└── __tests__/
    ├── certificacion.entity.test.ts                    ← MODIFICAR (casos nuevos)
    └── sincronizar-captura-offline.usecase.test.ts      ← CREAR
```

**Puerto — métodos nuevos en `certificacion.repository.port.ts`:**
```
upsertDetalleConResolucionConflicto(
  inspeccionId: string,
  empresaId: string,
  detalle: DetallePendiente,
  capturadoEnCliente: Date
): Promise<{ aplicado: boolean; conflicto: boolean }>

marcarSincronizado(inspeccionId: string, empresaId: string, fecha: Date): Promise<void>

contarPendientesSincronizacion(inspeccionId: string, empresaId: string): Promise<number>
```

**Dependencia con `RegistroAuditoria` ([[010-seguridad-privacidad-continuidad]]):** el caso de uso `SincronizarCapturaOfflineUseCase` recibe por constructor el puerto `RegistroAuditoriaRepositoryPort` ya definido en el módulo de auditoría de 010 (inyección de dependencias, sin importar Prisma directamente). Al detectar `conflicto: true`, llama `registrarAuditoria({ accion: "SINCRONIZACION_CONFLICTO", entidadTipo: "InspeccionDetalle", entidadId: detalle.nodoId, valorAntes, valorDespues })`.

### Route Handlers proxy (Next.js)

```
apps/web/src/app/api/inspeccion/certificaciones/[id]/
└── sincronizacion/
    ├── route.ts                 ← POST (lote de respuestas)
    ├── evidencias/route.ts      ← POST (multipart, un archivo)
    └── estado/route.ts          ← GET
```

Se agrega dentro del árbol de proxy `apps/web/src/app/api/inspeccion/` que ya existe desde [[015-wizard-certificacion]] (no un árbol `api/certificaciones/` aparte). Cada handler reenvía a `${API_URL}/inspeccion/certificaciones/:id/sincronizacion/...` con `Authorization: Bearer <token>`, mismo patrón que los demás proxies de 015.

---

### Frontend (`apps/web`)

```
src/lib/offline/                                     ← CREAR (transversal, fuera del módulo certificaciones
│                                                        porque es infraestructura de navegador reutilizable)
├── db-offline.ts                  ← abre/gestiona IndexedDB `doonflow-offline-db`
├── respuestas-offline.store.ts    ← CRUD store `respuestasPendientes`
├── evidencias-offline.store.ts    ← CRUD store `evidenciasPendientes` (incluye compresión de imagen)
├── cola-sincronizacion.ts         ← orquesta el envío + reintentos + backoff
└── estado-conexion.ts             ← hook usarEstadoConexion()

src/app/(dashboard)/certificaciones/[id]/
├── responder/
│   └── page.tsx                   ← MODIFICAR (de 005): integra BannerEstadoConexion + usar-captura-offline
├── revision/
│   └── page.tsx                   ← MODIFICAR (de 005): bloquea "Firmar y certificar" si pendientes > 0
├── page.tsx                       ← MODIFICAR (de 005, detalle admin): agrega BadgeCapturaOffline
├── _servicios/
│   └── certificacion.servicio.ts  ← MODIFICAR: sincronizarLote, subirEvidenciaPendiente, obtenerEstadoSincronizacion
├── _hooks/
│   ├── usar-captura-offline.ts    ← CREAR
│   └── usar-responder-formulario.ts ← MODIFICAR (de 005): escribe primero en captura offline
├── _components/
│   ├── banner-estado-conexion.tsx ← CREAR
│   └── badge-captura-offline.tsx  ← CREAR
└── __tests__/
    ├── banner-estado-conexion.test.tsx     ← CREAR
    ├── usar-captura-offline.test.ts        ← CREAR
    └── cola-sincronizacion.test.ts         ← CREAR (junto a src/lib/offline/__tests__/)
```

> Nota de ruta: se asume que 005 implementó las pantallas de certificaciones bajo `apps/web/src/app/(dashboard)/certificaciones/[id]/{responder,revision}/page.tsx`, siguiendo la convención de módulo de dominio de `CLAUDE.md` (`app/(dashboard)/[modulo]/`). Si el nombre real de carpeta/ruta difiere en el código ya implementado de 005, `agente-frontend` ajusta las rutas de este sprint al nombre real sin cambiar el resto del diseño.

---

## Por qué IndexedDB (y no Service Worker + Cache API)

Decisión de `agente-frontend` sobre la "Decisión pendiente" del spec:

- El requisito es que **una sesión ya abierta** de "Responder formulario" siga funcionando al perder conexión — no que la página cargue por primera vez estando offline (eso sería una PWA instalable, explícitamente fuera de alcance del spec: "Aplicación nativa móvil — el proyecto es responsive web, no una app instalable con soporte offline de sistema operativo").
- Mientras la pestaña sigue abierta, el JavaScript de React sigue ejecutándose sin red; solo las llamadas `fetch` fallan. Basta con interceptar esas llamadas a nivel de hook/servicio y persistir en un almacén estructurado.
- **IndexedDB** ofrece almacenamiento estructurado, transaccional, con índices y soporte nativo de `Blob` (evidencias/fotos) — ideal para el modelo de "cola de cambios pendientes" que requiere este sprint.
- **Cache API** (la alternativa, típicamente usada junto a un Service Worker) está pensada para cachear *respuestas HTTP*/assets estáticos, no para modelar una cola de escritura con reintentos y resolución de conflictos. Se descarta para este sprint porque no aporta nada que IndexedDB no resuelva mejor, y evita la complejidad adicional de registrar y versionar un Service Worker (ciclo de vida, invalidación de caché) para un caso de uso que no lo requiere.
- Consecuencia de esta decisión: si el usuario **recarga la página** (F5) estando sin conexión, la app no cargará (no hay Service Worker que sirva el shell offline). Esto es una limitación conocida y aceptable dado el alcance del spec — se documenta aquí y debe advertirse al usuario en capacitación, no es un bug de este sprint.

---

## Diseño de IndexedDB — base `doonflow-offline-db` (versión 1)

### Store `respuestasPendientes`
Una fila por respuesta de pregunta (`InspeccionDetalle`) capturada o modificada localmente.

| Campo | Tipo | Notas |
|---|---|---|
| `idLocal` | string (UUID v4) | **keyPath**. Generado en el cliente al capturar. |
| `inspeccionId` | string | index |
| `nodoId` | string | Identifica la pregunta — mismo `nodoId` sobrescribe la fila local anterior (evita acumular versiones intermedias). |
| `tipoRespuesta`, `respuestaValor`, `respuestasMultiples`, `comentario`, `puntajeObtenido` | — | Mismo shape que el payload que ya usa el guardado incremental en línea de 005. |
| `capturadoEnCliente` | Date (ISO) | Timestamp local de la última modificación — es lo que decide el "última escritura gana". |
| `estadoSync` | `'PENDIENTE' \| 'SINCRONIZANDO' \| 'SINCRONIZADO' \| 'ERROR'` | index |

Índices: `inspeccionId`, `estadoSync`, compuesto `[inspeccionId, nodoId]` (para sobrescritura al re-responder la misma pregunta offline).

### Store `evidenciasPendientes`
Una fila por foto/archivo capturado offline.

| Campo | Tipo | Notas |
|---|---|---|
| `idLocal` | string (UUID v4) | **keyPath**. |
| `inspeccionId` | string | index |
| `nodoIdRelacionado` | string | Pregunta a la que se asocia la evidencia (para construir `detalleId` tras sincronizar la respuesta). |
| `blob` | Blob | Imagen ya comprimida (ver abajo) antes de guardarse. |
| `nombreArchivo` | string | Generado una sola vez al capturar (ej. `${uuid}.jpg`) — se reutiliza en cada reintento de subida para que el destino en Supabase Storage sea el mismo archivo (idempotencia por sobrescritura de ruta, sin necesitar columna nueva en `InspeccionEvidencia`). |
| `tamanoBytes` | number | — |
| `estadoSync` | `'PENDIENTE' \| 'SINCRONIZANDO' \| 'SINCRONIZADO' \| 'ERROR'` | index |

Índices: `inspeccionId`, `estadoSync`.

**Compresión:** al capturar, redimensionar a un ancho máximo (ej. 1600px) y recodificar a JPEG calidad ~0.7 usando `<canvas>` nativo (sin librería externa) antes de guardar el `Blob` en el store — reduce tiempo de sincronización en datos móviles rurales sin depender de detectar "conexión lenta" en tiempo real.

### Store `certificacionesOffline`
Metadato de sincronización por certificación (uno por `inspeccionId`), para que el banner/badge no tengan que recalcular contando ambos stores en cada render.

| Campo | Tipo | Notas |
|---|---|---|
| `inspeccionId` | string | **keyPath**. |
| `capturaOffline` | boolean | Se pone en `true` la primera vez que se guarda algo localmente. |
| `ultimaModificacionLocal` | Date | — |
| `ultimoIntentoSincronizacion` | Date \| null | — |
| `intentosFallidosConsecutivos` | number | Alimenta el backoff. |

### Store `colaSincronizacion`
Cola FIFO de operaciones a reproducir contra el servidor (patrón *outbox*), separada de los datos en sí para poder ordenar el envío (respuestas antes que evidencias) y llevar el estado de reintento sin mezclarlo con el registro de datos.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | number (autoIncrement) | **keyPath**. |
| `tipo` | `'RESPUESTA' \| 'EVIDENCIA'` | index |
| `idLocalReferenciado` | string | Apunta al `idLocal` en el store correspondiente. |
| `inspeccionId` | string | index |
| `creadoEn` | Date | Orden de encolado. |
| `intentos` | number | — |

Orden de procesamiento: `colaSincronizacion` ordenada por `creadoEn`, pero **agrupada por tipo** dentro de cada corrida — todas las `RESPUESTA` pendientes de la certificación se envían antes que las `EVIDENCIA`, según la regla de negocio 3 del spec.

---

## Contrato de API de sincronización

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/inspeccion/certificaciones/:id/sincronizacion` | Envía un lote de respuestas pendientes. |
| POST | `/inspeccion/certificaciones/:id/sincronizacion/evidencias` | Sube una evidencia pendiente (multipart, un archivo por request). |
| GET | `/inspeccion/certificaciones/:id/sincronizacion/estado` | Estado actual de sincronización de la certificación. |

**Request — `POST /inspeccion/certificaciones/:id/sincronizacion`:**
```json
{
  "capturaOffline": true,
  "respuestas": [
    {
      "nodoId": "uuid-nodo",
      "tipoRespuesta": "SI_NO",
      "respuestaValor": "SI",
      "respuestasMultiples": [],
      "comentario": null,
      "puntajeObtenido": 10,
      "capturadoEnCliente": "2026-07-16T14:32:00.000Z"
    }
  ]
}
```

**Response exitosa:**
```json
{
  "data": {
    "procesadas": 1,
    "conflictos": 0,
    "pendientes": 0,
    "sincronizadoEn": "2026-07-16T15:01:12.000Z"
  }
}
```

**Request — `POST /inspeccion/certificaciones/:id/sincronizacion/evidencias`:** `multipart/form-data` con campos `archivo`, `nodoId`, `nombreArchivo` (el generado en el cliente, reutilizado en reintentos).

**Response — `GET /inspeccion/certificaciones/:id/sincronizacion/estado`:**
```json
{ "data": { "pendientes": 3, "sincronizadoEn": "2026-07-16T15:01:12.000Z", "capturaOffline": true } }
```

**Errores (envelope estándar de `CLAUDE.md`):**
```json
{ "error": { "codigo": "sincronizacion_pendiente", "mensaje": "No se puede firmar: hay 3 respuestas o evidencias sin sincronizar." } }
{ "error": { "codigo": "lote_excede_limite", "mensaje": "El lote excede el máximo de 200 respuestas por solicitud." } }
```

---

## Diseño del indicador de estado de conexión

### Estados y transiciones

```
        conexión perdida               reconecta
DESCONECTADO ───────────────► (n/a, ya está)   SINCRONIZANDO ──── éxito total ────► SINCRONIZADO
     ▲                                              │
     │                                        falla parcial
     │                                              ▼
     └──────────── pierde conexión de nuevo ◄── ERROR_PARCIAL (reintentando)
```

- `SINCRONIZADO` es un estado transitorio de confirmación (se atenúa/oculta tras ~4 segundos), no un badge permanente — el banner solo necesita ser visible cuando hay algo que comunicar.
- `ERROR_PARCIAL` nunca bloquea el formulario ni exige acción del usuario; solo informa que la cola sigue reintentando en segundo plano (cumple la regla del spec: "sin bloqueos de UI al perder conexión").

### Textos y estilos (tokens DoonFlow — sin `#hex` directo)

| Estado | Texto | Clases |
|---|---|---|
| `DESCONECTADO` | "Sin conexión — guardando localmente" | `bg-yellow-light/[0.08] text-yellow-dark` + ícono de nube tachada |
| `SINCRONIZANDO` | "Sincronizando…" | `bg-primary/10 text-primary` + spinner |
| `SINCRONIZADO` | "Sincronizado" | `bg-green-light/[0.08] text-green` + ícono `✓`, se atenúa tras 4s |
| `ERROR_PARCIAL` | "Reintentando sincronización…" | `bg-yellow-light/[0.08] text-yellow-dark` + ícono de reintento, **no** rojo (no es un error bloqueante) |

Contenedor: banner de ancho completo, fijo en la parte superior del área de contenido de "Responder formulario" (no `position: fixed` sobre toda la pantalla — respeta el layout del dashboard), `px-4 py-2 text-body-sm font-medium flex items-center gap-2`.

### `BadgeCapturaOffline` (detalle admin)

Mismo patrón visual que los badges de estado ya usados en 001/002:
```
bg-gray-1 dark:bg-dark-2 text-dark-4 dark:text-dark-6 text-body-xs font-medium px-2.5 py-0.5 rounded-full
```
Texto: `"Capturada offline · sincronizada 16/07/2026 09:15"` (hora Costa Rica). Solo se renderiza si `capturaOffline === true`.

---

## Lógica del hook `usar-captura-offline.ts`

```
Estado que maneja:
  estadoConexion: 'online' | 'offline'         ← de usarEstadoConexion()
  estadoSincronizacion: 'DESCONECTADO' | 'SINCRONIZANDO' | 'SINCRONIZADO' | 'ERROR_PARCIAL'
  pendientes: number                            ← respuestasPendientes + evidenciasPendientes sin sincronizar

Acciones expuestas:
  guardarRespuesta(datos)      ← escribe en IndexedDB inmediatamente; si hay conexión, encola sincronización
  guardarEvidencia(blob, meta) ← comprime + escribe en IndexedDB; encola sincronización si hay conexión
  forzarSincronizacion()       ← procesa colaSincronizacion manualmente (usado al reconectar y por el botón de reintento manual, si se agrega)

Efecto:
  al detectar transición offline → online, llama forzarSincronizacion() automáticamente.
  al completar cada sincronización, refresca `pendientes` consultando los stores (no confía en un contador cacheado que pueda desincronizarse).
```

`usar-responder-formulario.ts` (de 005) deja de llamar directamente a `certificacion.servicio.ts` para guardar respuestas — llama a `guardarRespuesta()` de este hook, que decide internamente si hay red disponible.

---

## Umbral de alerta por datos sin sincronizar (decisión de `agente-frontend`)

Spec 012 deja pendiente "tiempo máximo que se conservan datos offline sin sincronizar antes de alertar". Decisión: si `certificacionesOffline.ultimaModificacionLocal` tiene más de **24 horas** y `pendientes > 0`, el banner agrega una segunda línea de advertencia: "Llevas más de 24h con datos sin sincronizar en este dispositivo — sincroniza pronto para no arriesgar el trabajo capturado." No bloquea nada; es solo informativo. No se agrega persistencia adicional para esto — se calcula al vuelo comparando `ultimaModificacionLocal` con la hora actual cada vez que se renderiza el banner.

---

## Tokens de diseño usados (resumen)

Los mismos que 001/002 — no se introduce paleta nueva.

| Clase | Uso |
|---|---|
| `bg-yellow-light/[0.08] text-yellow-dark` | Banner desconectado / reintentando |
| `bg-primary/10 text-primary` | Banner sincronizando |
| `bg-green-light/[0.08] text-green` | Banner/badge sincronizado |
| `bg-gray-1 dark:bg-dark-2 text-dark-4 dark:text-dark-6` | Badge "Capturada offline" |
| `rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card` | Contenedores (sin cambios respecto a 005) |

---

## Estándares técnicos obligatorios

### Arquitectura hexagonal (backend)

```
domain/          → sin imports de Express, Prisma, ni infraestructura. puedeFirmarse() y SincronizacionPendienteError viven aquí.
application/     → SincronizarCapturaOfflineUseCase recibe el repositorio y el puerto de auditoría por constructor.
infrastructure/  → único lugar con Prisma/Express; la transacción por lote vive en el repositorio Prisma, no en el caso de uso.
```

### Separación en el frontend

- `src/lib/offline/` no importa nada de `apps/api`, no conoce el envelope `{ data, error }` de la API salvo `cola-sincronizacion.ts`, que es el único archivo autorizado a llamar `fetch` dentro de esta carpeta.
- Los componentes de presentación (`BannerEstadoConexion`, `BadgeCapturaOffline`) reciben el estado por props — no acceden a IndexedDB ni al hook directamente.

### Clean Code

- Una función, un propósito; si el manejo de la cola de sincronización supera ~40 líneas, extraer funciones auxiliares (`procesarRespuestasPendientes()`, `procesarEvidenciasPendientes()`, `calcularBackoff(intento)`).
- Nombres en español, consistentes con el resto del repo: `guardarRespuestaLocal`, `contarPendientesSincronizacion`, `resolverConflictoPorUltimaEscritura`.
- `pnpm lint` debe pasar en verde en `apps/api` y `apps/web`.

---

## Notas importantes

- `agente-frontend` no toca `apps/api` — los 3 endpoints de sincronización y el bloqueo de firma los implementa `agente-backend`; si el contrato de este documento no alcanza, se coordina en `memoria/sprint/`, no se improvisa un endpoint nuevo desde el frontend.
- Este sprint no agrega captura offline a ninguna otra pantalla del sistema (reportes, panel ejecutivo, mantenimientos) — el spec lo deja explícitamente fuera de alcance.
- No se implementa resolución manual de conflictos por el usuario — solo automática por última escritura, según el spec.
- El límite exacto de tamaño de lote/archivo (T-489/T-493 de `task.md`) reutiliza el que `agente-backend` ya haya fijado para evidencias en 005; si 005 no dejó un valor explícito, se documenta el elegido en `memoria/decisiones.md` al implementar (no es una decisión de este documento de planificación).

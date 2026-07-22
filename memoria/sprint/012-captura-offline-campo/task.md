# Tareas — 012-captura-offline-campo

> Orden de ejecución: Base de datos → API → Frontend → Tests.
> Numeración desde T-480 para no colisionar con sprints anteriores (T-480/T-481 reasignados a T-510/T-511 por colisión con el desborde de [[011-aceptacion-apelaciones-certificacion]], que también llegó hasta T-481).
> Este sprint **modifica** pantallas ya implementadas en [[015-wizard-certificacion]] ("Responder formulario" del wizard, detalle de certificación) — no las recrea. También registra conflictos de sincronización en `RegistroAuditoria` de [[010-seguridad-privacidad-continuidad]].
> **⏸️ T-490** (bloqueo de firma sin sincronizar) depende de [[005-certificacion-plan-cumplimiento]], **pausado** — esa tarea puntual no se puede implementar hasta que se retome. El resto de este sprint no depende de la firma.

---

## Agente: `agente-basededatos`

- [x] **T-510** Crear migración `add_captura_offline_inspeccion` en `packages/db/prisma/`:
  - Agregar a la tabla `inspeccion`: `captura_offline BOOLEAN NOT NULL DEFAULT false`, `sincronizado_en TIMESTAMPTZ NULL` (Prisma lo mapea como `TIMESTAMP(3)`, mismo patrón que el resto del schema).
  - Actualizar el model `Inspeccion` en `schema.prisma` con `capturaOffline` y `sincronizadoEn` (camelCase, `@map`).
- [x] **T-511** Agregar índice `(empresa_id, captura_offline)` en `inspeccion` — soporta el listado administrativo que filtra certificaciones capturadas offline.
- [x] **T-482** Registrado el cambio en `memoria/cambios_db/registro.md`, incluyendo la nota de que `inspeccion_detalle` e `inspeccion_evidencia` **no cambian de esquema**.

---

## Agente: `agente-backend`

- [x] **T-483** Agregado `capturaOffline` y `sincronizadoEn` al tipo `Certificacion` en `apps/api/src/modules/inspeccion/domain/certificacion.entity.ts`.
- [x] **T-484** Agregada función pura `puedeFirmarse(certificacion: { estado: string }, pendientesSincronizacion: number): boolean` en `certificacion.entity.ts` — misma firma estructural mínima que `puedeEditarRespuestas` (no acopla al tipo `Certificacion` completo, para no depender de campos de 005 que no existen). No depende de I/O.
- [~] **T-485 (parcial)** `SincronizacionPendienteError` se agregó en `apps/api/src/modules/inspeccion/domain/inspeccion.errors.ts` — **no existe** un archivo `certificacion.errors.ts` separado en el código real (todos los errores del módulo viven juntos en `inspeccion.errors.ts`, incluidos los de plantillas/aprobación de sprints previos). El controller mapea el error a 409, pero **ningún caso de uso lo lanza todavía** — sin `firmar-certificacion.usecase.ts` (T-490, bloqueado), no hay quien lo dispare; queda listo para cuando 005 se retome.
- [~] **T-486 (parcial)** Puerto `certificacion.repository.port.ts` ampliado con:
  - `upsertDetallesConResolucionConflicto(inspeccionId, empresaId, detalles[]): Promise<ResultadoUpsertDetalle[]>` — **plural/por lote**, no singular como decía el spec, para que la transacción de T-488 envuelva todo el lote de una vez (ver Arquitectura hexagonal del `impl.md`).
  - `marcarSincronizado(inspeccionId, empresaId, fecha, capturaOffline): Promise<void>`.
  - **No se agregó** `contarPendientesSincronizacion()` — "pendientes" es estado exclusivamente del cliente (cola en IndexedDB); el servidor no puede contarlos de forma confiable sin ese dato, documentado en el propio código.
- [x] **T-487** Caso de uso `sincronizar-captura-offline.usecase.ts` creado en `application/casos-uso/`. El puntaje **se recalcula server-side** con `calcularPuntajeRespuesta()` (nunca se confía el puntaje que manda el cliente). El registro de conflictos usa `RegistradorEventoAuditoria` (el helper de inyección ya establecido en 010, `apps/api/src/shared/auditoria/registrar-evento-auditoria.ts`), no un puerto de auditoría inyectado directamente — mismo patrón que `auth`/`permisos`/`retencion`.
- [x] **T-488** Métodos de T-486 implementados en `certificacion.prisma-repository.ts`, todo el lote envuelto en `$transaction`.
- [x] **T-489** 3 endpoints agregados en `certificacion.controller.ts`/`inspeccion.router.ts`. Límite de lote: 200 respuestas (verificado en el caso de uso, `413 lote_excede_limite`). Límite de archivo: reutiliza `subidaArchivoEvidencia` (10MB) ya definido en 015.
- [ ] **T-490 (⏸️ bloqueado — depende de que se retome 005)** No implementado — `firmar-certificacion.usecase.ts` no existe todavía.
- [x] **T-491** **Sin archivos nuevos** — el catch-all `apps/web/src/app/api/inspeccion/[...path]/route.ts` ya existente desde 015 reenvía genéricamente cualquier subruta bajo `/inspeccion/certificaciones/...` (incluye JSON y `multipart/form-data`), así que ya cubre los 3 endpoints nuevos sin necesitar Route Handlers dedicados. Verificado por curl a través del proxy real (ver `impl.md`).

---

## Agente: `agente-frontend`

> Decisión técnica de almacenamiento local (spec 012 → "Decisiones pendientes"): **IndexedDB** como fuente de verdad de datos offline (no Service Worker/Cache API — la app no necesita cargar la página estando desconectada, solo mantener el estado de una sesión ya abierta; ver `impl.md` → "Por qué IndexedDB").

- [x] **T-492** `apps/web/src/lib/offline/db-offline.ts`: abre/gestiona `doonflow-offline-db` (v1) con los 4 object stores, vía API nativa de IndexedDB envuelta en promesas (sin librería `idb`).
- [x] **T-493** `apps/web/src/lib/offline/respuestas-offline.store.ts`: `guardarRespuestaLocal`, `listarRespuestasPendientes`, `marcarRespuestaSincronizada`, `marcarRespuestaConError`, `contarRespuestasPendientes` (nombre final, no `contarPendientes` a secas — más explícito junto al equivalente de evidencias).
- [x] **T-494** `apps/web/src/lib/offline/evidencias-offline.store.ts`: `guardarEvidenciaLocal`, `listarEvidenciasPendientes`, `marcarEvidenciaSincronizada`/`marcarEvidenciaConError`. Compresión con `<canvas>` (redimensiona a 1600px, JPEG ~0.7) — con fallback silencioso a "sin comprimir" si el tipo no es imagen comprimible (PDF/DOC/DOCX/HEIC) o si el entorno no soporta `createImageBitmap`/Canvas 2D (ej. jsdom en tests).
- [x] **T-495** `apps/web/src/lib/offline/cola-sincronizacion.ts`: `procesarColaSincronizacion()` — respuestas antes que evidencias, backoff exponencial (2s/4s/8s/16s/32s, 5 intentos), tolera fallo parcial de evidencias sin revertir lo ya sincronizado. También administra el store `certificacionesOffline` (metadato `ultimaModificacionLocal`/`intentosFallidosConsecutivos`, usado por la alerta de 24h).
- [x] **T-496** `apps/web/src/lib/offline/estado-conexion.ts`: `usarEstadoConexion()`. La verificación activa liviana usa `fetch("/", { method: "HEAD" })` contra el propio origin (no se creó un endpoint `/api/salud` nuevo) — mismo efecto (confirma alcanzabilidad real del servidor), sin infraestructura adicional.
- [~] **T-497 (parcial)** Hook `usar-captura-offline.ts` creado en `apps/web/src/app/(dashboard)/certificaciones/_hooks/` — **no** en `[id]/_hooks/`: esa carpeta no existe en el código real, 015 puso todos los hooks de certificaciones en el `_hooks/` del módulo (no por certificación individual). Expone `guardarRespuestasLote()` (por lote, no `guardarRespuesta()` singular — el wizard guarda toda una sección de una vez) y `guardarEvidencia()`. `estadoSincronizacion` es `'DESCONECTADO' | 'SINCRONIZANDO' | 'SINCRONIZADO' | 'ERROR_PARCIAL' | null` — se agregó `null` ("nada que comunicar") para que el banner pueda ocultarse cuando está online y sin pendientes, calculado como estado derivado (`useMemo`), no como transiciones manuales.
- [x] **T-498** `usar-responder-certificacion.ts` modificado: recibe `capturaOffline: CapturaOfflineInyectada` inyectado (composición explícita desde la página, no importa `usar-captura-offline` directamente) — `guardarSeccion()`/`subirEvidencia()` pasan por él. Como `guardarRespuestasLote()` nunca espera la sincronización de red (la dispara sin `await`), el formulario avanza tan pronto termina la escritura local, independientemente de la conectividad.
- [x] **T-499** `BannerEstadoConexion` creado con los 4 estados + spinner en `SINCRONIZANDO` + línea opcional de alerta de 24h.
- [x] **T-500** `responder/page.tsx` modificado: integra `usarCapturaOffline` + `BannerEstadoConexion`, sin bloquear ningún control.
- [~] **T-501 (parcial — depende de que se retome 005)** No hay botón "Firmar y certificar" que deshabilitar (005 pausado, nunca se agregó). Sí se agregó un **banner informativo** (`BannerEstadoConexion`) en `revision/page.tsx` mostrando pendientes — no bloquea nada porque no hay nada que bloquear todavía, pero deja la superficie lista para cuando 005 agregue el botón real.
- [x] **T-502** `BadgeCapturaOffline` creado, formatea `sincronizadoEn` en hora de Costa Rica (`America/Costa_Rica`), solo se renderiza si `capturaOffline === true`.
- [~] **T-503 (parcial)** `certificacion.servicio.ts` completado con `sincronizarLote`, `subirEvidenciaPendiente`, `obtenerEstadoSincronizacion`. **No existe** una "pantalla de detalle de certificación (vista administrador)" — 005 nunca la construyó. `BadgeCapturaOffline` se integró en su lugar en `tabla-certificaciones.tsx` (columna Estado del listado), la vista administrativa que sí existe.

---

## Agente: `agente-qa` — Tests de unidad Backend

> Vitest. Dominio puro sin mocks; caso de uso con mock del repositorio y del puerto de auditoría.

- [~] **T-504 (parcial)** `certificacion.entity.test.ts` (2 casos nuevos):
  - [x] `puedeFirmarse()` con `pendientesSincronizacion = 0` → `true`.
  - [x] `puedeFirmarse()` con `pendientesSincronizacion > 0` → `false`.
  - [ ] **N/A**: caso de certificación ya `FIRMADA` — no existe ese estado en el tipo actual (`estado: "EN_PROGRESO"` literal, sin `FIRMADA` hasta que 005 se retome). Documentado con comentario en el propio test.
- [~] **T-505 (parcial)** `sincronizar-captura-offline.usecase.test.ts` (5 tests):
  - [x] Respuesta nueva sin conflicto → llama `repo.upsertDetallesConResolucionConflicto()` una vez, no llama al registrador de auditoría.
  - [x] Servidor con versión más reciente → conserva la del servidor, llama al registrador con `accion: "SINCRONIZACION_CONFLICTO"`.
  - [x] Lote sin pendientes restantes → llama `repo.marcarSincronizado()`.
  - [x] Lote que excede el límite → lanza `LoteSincronizacionExcedeLimiteError` sin tocar el repositorio.
  - [x] Evidencia sin respuesta sincronizada → lanza `RespuestaNoSincronizadaError`.
  - [ ] **N/A a nivel backend**: "si una evidencia del lote falla, las respuestas no se revierten" — evidencias y respuestas son endpoints separados en la implementación real (una evidencia por request, no un array batcheado junto a las respuestas), así que no comparten transacción que revertir. El escenario equivalente se cubre en el frontend (`cola-sincronizacion.test.ts`, ver T-509).
- [~] **T-506 (parcial)** No se creó un archivo de test de integración contra una BD de pruebas dedicada — **no existe infraestructura de BD de pruebas en este proyecto** (mismo gap ya documentado en sprints anteriores). En su lugar, la idempotencia se verificó manualmente por curl contra la BD real de desarrollo: se envió el mismo lote dos veces y `certificacion.detalles` se mantuvo en 2 filas (sin duplicar) — la segunda llamada reportó `conflictos: 2` en vez de `procesadas` silenciosas, un hallazgo real documentado en `impl.md` (el `actualizadoEn` del servidor, no el `capturadoEnCliente` original, es lo que se compara — un reintento genuino del mismo cliente tras perder la respuesta HTTP se clasificaría como "conflicto" en vez de no-op limpio; no hay pérdida de datos, la fila no cambia, pero sí generaría una entrada de auditoría de conflicto innecesaria).

---

## Agente: `agente-qa` — Tests de unidad Frontend

> Vitest + React Testing Library. IndexedDB se mockea con `fake-indexeddb`; sin llamadas reales de red.

- [x] **T-507** `banner-estado-conexion.test.tsx` (6 tests): los 4 estados + caso `null` (no renderiza nada) + advertencia de 24h condicional. "Desaparece tras unos segundos" es responsabilidad del hook (temporizador), no del componente — el test verifica el componente puramente por prop, consistente con que es presentacional.
- [x] **T-508** `usar-captura-offline.test.ts` (4 tests, con `fake-indexeddb` + mocks de `estado-conexion`/`certificacion.servicio`): `guardarRespuestasLote()` offline no llama a la red; `pendientes` refleja el conteo real; reconexión dispara sincronización automática; `estadoSincronizacion` llega a `'SINCRONIZADO'` solo con `pendientes === 0`.
- [x] **T-509** `cola-sincronizacion.test.ts` (4 tests, en `src/lib/offline/__tests__/`): backoff con reintentos (base de backoff reducida a 1ms vía `_establecerBackoffBaseMsParaTests()` para no esperar segundos reales — mezclar fake timers con `fake-indexeddb` resultó frágil, ver `impl.md`), fallo parcial de evidencia no revierte respuestas ya sincronizadas, orden respuestas-antes-que-evidencias.

---

## Dependencias entre tareas

```
T-510 → T-511 → T-482
T-510 → T-483 → T-484 → T-485 → T-486 → T-487 → T-488 → T-489 → T-491
T-489 → T-490
T-492 → T-493, T-494
T-493, T-494 → T-495 → T-497
T-496 → T-497
T-491 → T-497            ← el hook necesita los endpoints proxy para sincronizar
T-497 → T-498 → T-500
T-497 → T-499 → T-500
T-497 → T-501
T-491 → T-503 → T-502
T-503 → T-501
T-484 → T-504
T-486, T-487 → T-505
T-489 → T-506
T-499 → T-507
T-497 → T-508
T-495 → T-509
```

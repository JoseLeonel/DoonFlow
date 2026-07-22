# Tareas — 012-captura-offline-campo

> Orden de ejecución: Base de datos → API → Frontend → Tests.
> Numeración desde T-480 para no colisionar con sprints anteriores (T-480/T-481 reasignados a T-510/T-511 por colisión con el desborde de [[011-aceptacion-apelaciones-certificacion]], que también llegó hasta T-481).
> Este sprint **modifica** pantallas ya implementadas en [[015-wizard-certificacion]] ("Responder formulario" del wizard, detalle de certificación) — no las recrea. También registra conflictos de sincronización en `RegistroAuditoria` de [[010-seguridad-privacidad-continuidad]].
> **⏸️ T-490** (bloqueo de firma sin sincronizar) depende de [[005-certificacion-plan-cumplimiento]], **pausado** — esa tarea puntual no se puede implementar hasta que se retome. El resto de este sprint no depende de la firma.

---

## Agente: `agente-basededatos`

- [ ] **T-510** Crear migración `add_captura_offline_inspeccion` en `packages/db/prisma/`:
  - Agregar a la tabla `inspeccion`: `captura_offline BOOLEAN NOT NULL DEFAULT false`, `sincronizado_en TIMESTAMPTZ NULL`.
  - Actualizar el model `Inspeccion` en `schema.prisma` con `capturaOffline` y `sincronizadoEn` (camelCase, `@map`).
- [ ] **T-511** Agregar índice `(empresa_id, captura_offline)` en `inspeccion` — soporta el listado administrativo que filtra certificaciones capturadas offline.
- [ ] **T-482** Registrar el cambio en `memoria/cambios_db/registro.md`, incluyendo la nota de que `inspeccion_detalle` e `inspeccion_evidencia` **no cambian de esquema**: la idempotencia de sincronización se resuelve a nivel de aplicación reutilizando el upsert por `(inspeccionId, nodoId)` que ya existe desde [[015-wizard-certificacion]] para el guardado incremental en línea.

---

## Agente: `agente-backend`

- [ ] **T-483** Agregar `capturaOffline` y `sincronizadoEn` al tipo `Certificacion` en `apps/api/src/modules/inspeccion/domain/certificacion.entity.ts` (ampliación de la entidad `Inspeccion` ya definida en [[015-wizard-certificacion]] — vive dentro de `modules/inspeccion/`, el mismo módulo del editor de plantillas de 001, no en un módulo `certificaciones` aparte).
- [ ] **T-484** Agregar función pura `puedeFirmarse(certificacion: Certificacion, pendientesSincronizacion: number): boolean` en `certificacion.entity.ts` — retorna `false` si `pendientesSincronizacion > 0` (regla de negocio 1 del spec: la firma requiere estar en línea y con todo sincronizado). No depende de I/O.
- [ ] **T-485** Crear error de dominio `SincronizacionPendienteError` en `certificacion.errors.ts` — se lanza al intentar firmar con datos pendientes de sincronizar; el controller lo mapea a HTTP 409.
- [ ] **T-486** Ampliar el puerto `certificacion.repository.port.ts` con:
  - `upsertDetalleConResolucionConflicto(inspeccionId, empresaId, detalle, capturadoEnCliente): Promise<ResultadoUpsertDetalle>`
  - `marcarSincronizado(inspeccionId, empresaId, fecha): Promise<void>`
  - `contarPendientesSincronizacion(inspeccionId, empresaId): Promise<number>`
- [ ] **T-487** Crear caso de uso `sincronizar-captura-offline.usecase.ts` en `application/casos-uso/`:
  - Recibe un lote de respuestas pendientes (`SincronizarLoteInput`, ver `impl.md` → Contrato de API).
  - Para cada respuesta, hace upsert idempotente por `(inspeccionId, nodoId)`, comparando `capturadoEnCliente` (timestamp de captura local) contra `InspeccionDetalle.actualizadoEn` en servidor.
  - Si el servidor ya tiene una versión más reciente que la que el cliente cree estar sincronizando (conflicto por doble captura offline, regla de negocio 2 del spec), conserva la versión más nueva por marca de tiempo (última escritura gana) y registra el conflicto llamando al puerto de auditoría de [[010-seguridad-privacidad-continuidad]] con `accion = "SINCRONIZACION_CONFLICTO"`.
  - Al terminar el lote sin pendientes restantes, llama `marcarSincronizado()` y setea `capturaOffline = true` si el lote vino marcado como offline.
- [ ] **T-488** Implementar los métodos de T-486 en `certificacion.prisma-repository.ts`, envolviendo cada lote en una transacción Prisma (`$transaction`) para que un fallo parcial no dañe registros ya escritos del mismo lote.
- [ ] **T-489** Agregar endpoints en `certificacion.controller.ts` / `inspeccion.router.ts` (dentro de `apps/api/src/modules/inspeccion/`, ver `impl.md` → Contrato de API):
  - `POST /certificaciones/:id/sincronizacion` — lote de respuestas pendientes.
  - `POST /certificaciones/:id/sincronizacion/evidencias` — sube una evidencia pendiente (multipart, un archivo por request).
  - `GET /certificaciones/:id/sincronizacion/estado` — `{ pendientes, sincronizadoEn, capturaOffline }`.
  - Límite de tamaño de lote (ej. 200 respuestas / request) y de archivo (reutiliza el límite ya definido en [[015-wizard-certificacion]] para evidencias); responde 413 con mensaje claro si se excede.
- [ ] **T-490 (⏸️ bloqueado — depende de que se retome 005)** Modificar el caso de uso de firma de [[005-certificacion-plan-cumplimiento]] (`firmar-certificacion.usecase.ts`, **no existe todavía, pausado**) para invocar `puedeFirmarse()` antes de cambiar el estado a `FIRMADA`, propagando `SincronizacionPendienteError` si corresponde. No se puede implementar hasta que 005 exista.
- [ ] **T-491** Crear Route Handlers proxy Next.js:
  - `apps/web/src/app/api/certificaciones/[id]/sincronizacion/route.ts` → `POST`
  - `apps/web/src/app/api/certificaciones/[id]/sincronizacion/evidencias/route.ts` → `POST`
  - `apps/web/src/app/api/certificaciones/[id]/sincronizacion/estado/route.ts` → `GET`

---

## Agente: `agente-frontend`

> Decisión técnica de almacenamiento local (spec 012 → "Decisiones pendientes"): **IndexedDB** como fuente de verdad de datos offline (no Service Worker/Cache API — la app no necesita cargar la página estando desconectada, solo mantener el estado de una sesión ya abierta; ver `impl.md` → "Por qué IndexedDB").

- [ ] **T-492** Crear `apps/web/src/lib/offline/db-offline.ts`: abre/gestiona la base IndexedDB `doonflow-offline-db` (versión 1) con los 4 object stores (`respuestasPendientes`, `evidenciasPendientes`, `certificacionesOffline`, `colaSincronizacion` — diseño completo en `impl.md`).
- [ ] **T-493** Crear `apps/web/src/lib/offline/respuestas-offline.store.ts`: `guardarRespuestaLocal(respuesta)`, `listarRespuestasPendientes(inspeccionId)`, `marcarRespuestaSincronizada(idLocal)`, `contarPendientes(inspeccionId)`.
- [ ] **T-494** Crear `apps/web/src/lib/offline/evidencias-offline.store.ts`: `guardarEvidenciaLocal(blob, metadata)`, `listarEvidenciasPendientes(inspeccionId)`, `marcarEvidenciaSincronizada(idLocal)`. Incluye compresión previa del `Blob` (Canvas API nativo, sin librería externa) antes de guardarlo localmente — decisión de `agente-frontend` sobre la "Decisión pendiente" de compresión del spec: comprimir siempre al capturar, no solo con conexión lenta, para minimizar tiempo de sync y espacio en IndexedDB.
- [ ] **T-495** Crear `apps/web/src/lib/offline/cola-sincronizacion.ts`: orquesta el envío — primero respuestas, luego evidencias (regla de negocio 3 del spec: mismo destino final `InspeccionEvidencia`/Supabase Storage). Reintenta con backoff exponencial (ej. 2s, 4s, 8s, máx. 5 intentos) y tolera fallo parcial: si una evidencia falla, el resto de respuestas y evidencias ya enviadas quedan marcadas como sincronizadas (regla de negocio 4 del spec).
- [ ] **T-496** Crear `apps/web/src/lib/offline/estado-conexion.ts`: hook `usarEstadoConexion()` basado en eventos `online`/`offline` del navegador, más una verificación activa liviana (`fetch` HEAD de bajo costo con timeout corto) para no confiar solo en `navigator.onLine`, que en redes rurales inestables puede reportar "en línea" sin conectividad real.
- [ ] **T-497** Crear hook `usar-captura-offline.ts` en `apps/web/src/app/(dashboard)/certificaciones/[id]/_hooks/`: integra `usarEstadoConexion()` + `colaSincronizacion` + los stores de T-493/T-494. Expone `estadoSincronizacion: 'DESCONECTADO' | 'SINCRONIZANDO' | 'SINCRONIZADO' | 'ERROR_PARCIAL'`, `pendientes: number`, y acciones `guardarRespuesta()`, `guardarEvidencia()`, `forzarSincronizacion()`.
- [ ] **T-498** Modificar el hook `usar-responder-certificacion.ts` (de [[015-wizard-certificacion]]) para que todo guardado de respuesta pase primero por `usar-captura-offline` (escritura local inmediata) y dispare sincronización en segundo plano cuando hay conexión — el formulario deja de depender de que la llamada HTTP tenga éxito de inmediato.
- [ ] **T-499** Crear componente `BannerEstadoConexion` en `_components/` del módulo certificaciones: banner fijo, siempre visible en "Responder formulario", con los 4 estados visuales (ver `impl.md` → Diseño del indicador).
- [ ] **T-500** Modificar `apps/web/src/app/(dashboard)/certificaciones/[id]/responder/page.tsx` (de 015) para integrar `BannerEstadoConexion` y `usar-captura-offline` — sin bloquear ningún control del formulario al perder conexión (regla explícita del spec 012).
- [ ] **T-501 (⏸️ bloqueado — depende de que se retome 005)** Modificar `apps/web/src/app/(dashboard)/certificaciones/[id]/revision/page.tsx` (pantalla de revisión, base en 015; el botón "Firmar y certificar" lo agrega 005, **pausado**): deshabilitar ese botón con mensaje explicativo ("Hay N respuestas/evidencias sin sincronizar. Conéctate para poder firmar.") mientras `pendientesSincronizacion > 0`. No se puede implementar hasta que 005 exista.
- [ ] **T-502** Crear componente `BadgeCapturaOffline` en `_components/` del módulo certificaciones: muestra "Capturada offline" + fecha de `sincronizadoEn` formateada en hora de Costa Rica (ver `CLAUDE.md` → conversión de timestamps en la capa de presentación).
- [ ] **T-503** Completar `certificacion.servicio.ts` (`_servicios/` del módulo certificaciones): agregar `sincronizarLote(inspeccionId, lote)`, `subirEvidenciaPendiente(inspeccionId, evidencia)`, `obtenerEstadoSincronizacion(inspeccionId)`, consumiendo los Route Handlers de T-491. Modificar también la pantalla de detalle de certificación (vista administrador, de 005) para renderizar `BadgeCapturaOffline` cuando `capturaOffline = true`.

---

## Agente: `agente-qa` — Tests de unidad Backend

> Vitest. Dominio puro sin mocks; caso de uso con mock del repositorio y del puerto de auditoría.

- [ ] **T-504** `certificacion.entity.test.ts` (casos nuevos sobre la entidad ya existente de 005):
  - `puedeFirmarse()` con `pendientesSincronizacion = 0` → `true`
  - `puedeFirmarse()` con `pendientesSincronizacion > 0` → `false`
  - `puedeFirmarse()` con certificación ya `FIRMADA` y `pendientesSincronizacion = 0` → conserva el comportamiento previo de 005 (no se re-firma)
- [ ] **T-505** `sincronizar-captura-offline.usecase.test.ts`:
  - Con una respuesta nueva (sin conflicto) → llama `repo.upsertDetalleConResolucionConflicto()` una vez y no llama al puerto de auditoría.
  - Con dos respuestas para el mismo `nodoId` donde la del servidor es más reciente que `capturadoEnCliente` → conserva la del servidor y llama al puerto de auditoría con `accion = "SINCRONIZACION_CONFLICTO"`.
  - Al procesar un lote completo sin pendientes restantes → llama `repo.marcarSincronizado()`.
  - Si una evidencia del lote falla, las respuestas ya procesadas no se revierten (no se llama a ningún rollback sobre ellas).
- [ ] **T-506** Test de integración ligera (contra BD de pruebas local): `POST /certificaciones/:id/sincronizacion` enviado dos veces con el mismo payload → segunda llamada no duplica filas en `inspeccion_detalle` (verifica idempotencia del upsert por `(inspeccionId, nodoId)`).

---

## Agente: `agente-qa` — Tests de unidad Frontend

> Vitest + React Testing Library. IndexedDB se mockea con `fake-indexeddb`; sin llamadas reales de red.

- [ ] **T-507** `banner-estado-conexion.test.tsx`:
  - `estado = 'DESCONECTADO'` → renderiza "Sin conexión — guardando localmente"
  - `estado = 'SINCRONIZANDO'` → renderiza "Sincronizando..." con indicador de progreso
  - `estado = 'SINCRONIZADO'` → renderiza "Sincronizado" y desaparece/atenúa tras unos segundos
  - `estado = 'ERROR_PARCIAL'` → renderiza mensaje de reintento en curso, no un error bloqueante
- [ ] **T-508** `usar-captura-offline.test.ts` (hook, con `fake-indexeddb`):
  - `guardarRespuesta()` mientras `navigator.onLine = false` → persiste en IndexedDB y no intenta red
  - Al pasar de offline a online → dispara `forzarSincronizacion()` automáticamente
  - `pendientes` refleja el conteo real de `respuestasPendientes` + `evidenciasPendientes` sin sincronizar
  - `estadoSincronizacion` pasa a `'SINCRONIZADO'` solo cuando `pendientes === 0`
- [ ] **T-509** `cola-sincronizacion.test.ts`:
  - Reintenta con backoff cuando la llamada de red falla (mock de `fetch` que falla las primeras N veces)
  - Si la evidencia falla pero las respuestas del mismo lote tuvieron éxito, estas quedan marcadas como sincronizadas (no se pierden)
  - Procesa respuestas antes que evidencias dentro del mismo lote

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

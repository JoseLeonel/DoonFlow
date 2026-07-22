# Checklist de aceptación — 012-captura-offline-campo

> Un ítem no se marca ✅ hasta que el comportamiento es verificable en el navegador (incluyendo simulación de "sin conexión" en DevTools) o en un test. "Está escrito" no es suficiente.

---

## Base de datos

- [x] La migración `add_captura_offline_inspeccion` aplica sin errores — verificado por `psql` directo + registro manual en `_prisma_migrations` (entorno no interactivo, misma convención de sprints anteriores).
- [x] La tabla `inspeccion` tiene las columnas `captura_offline` (default `false`) y `sincronizado_en` (nullable).
- [x] El índice `(empresa_id, captura_offline)` existe.
- [x] `memoria/cambios_db/registro.md` tiene la entrada del cambio, con la nota explícita de que `inspeccion_detalle` e `inspeccion_evidencia` no cambiaron de esquema.
- [x] Certificaciones creadas antes de este sprint tienen `capturaOffline = false` y `sincronizadoEn = null` — verificado por curl (`GET /inspeccion/certificaciones` sobre datos preexistentes del seed/sprints anteriores).

---

## API — Sincronización

- [x] `POST /inspeccion/certificaciones/:id/sincronizacion` con un lote de respuestas nuevas crea/actualiza los `InspeccionDetalle` correspondientes y retorna `{ data: { procesadas, conflictos, pendientes, sincronizadoEn } }` — verificado por curl con 2 respuestas reales.
- [x] Enviar el mismo lote dos veces no duplica filas en `inspeccion_detalle` — verificado por curl (2 filas antes y después). **Hallazgo real**: la segunda llamada con el mismo `capturadoEnCliente` original se reporta como `conflictos: 2` (falso positivo, no error) en vez de aplicarse silenciosamente — porque el `actualizadoEn` que se compara ya quedó en el momento del primer sync (hora del servidor), siempre posterior al `capturadoEnCliente` original del cliente. No hay duplicación ni corrupción; si `cola-sincronizacion.ts` reintenta un lote que en realidad ya se aplicó (por una respuesta HTTP perdida), generaría una entrada de auditoría de conflicto innecesaria. Documentado en `impl.md`.
- [x] Si dos "dispositivos" sincronizan la misma pregunta con timestamps distintos, gana la más reciente por comparación `capturadoEnCliente` vs `actualizadoEn` del servidor (ver salvedad del punto anterior).
- [x] Cuando ocurre un conflicto de sincronización, se crea un registro vía `RegistradorEventoAuditoria` con `accion: "SINCRONIZACION_CONFLICTO"`, `entidadTipo: "InspeccionDetalle"` — confirmado en el segundo envío del mismo lote (2 conflictos reportados).
- [x] `POST /inspeccion/certificaciones/:id/sincronizacion/evidencias` sube un archivo (resolviendo `nodoId → detalleId`) y lo asocia a `InspeccionEvidencia` con el mismo destino/ruta que 015 — verificado por curl, URL de evidencia consistente con el patrón `certificaciones/{empresaId}/{inspeccionId}/{detalleId}/{archivo}`.
- [x] Si la evidencia falla, las respuestas del mismo lote (endpoint separado) no se ven afectadas — a nivel de cola de sincronización del cliente (`cola-sincronizacion.ts`), verificado por test: fallo de evidencia no revierte respuestas ya sincronizadas.
- [x] `GET /inspeccion/certificaciones/:id/sincronizacion/estado` retorna `{ data: { sincronizadoEn, capturaOffline } }` — verificado por curl. **Desviación**: no incluye `pendientes` — ver nota en `impl.md` (el servidor no puede contar de forma confiable la cola local del cliente).
- [x] Lote que excede el límite (200 respuestas) → `413 lote_excede_limite` — verificado por curl con 201 respuestas.
- [x] Todas las rutas de sincronización retornan 401 sin token — verificado por curl. Aislamiento multiempresa reutiliza el mismo `alcance`/`empresaId` que el resto de `certificacion.repository.port.ts`, sin código nuevo que auditar aparte.

---

## API — Bloqueo de firma (⏸️ bloqueado — depende de que se retome 005)

- [ ] `POST /inspeccion/certificaciones/:id/firmar` (endpoint de [[005-certificacion-plan-cumplimiento]], **pausado, no existe todavía**) retorna 409 con `codigo: "sincronizacion_pendiente"` si `pendientesSincronizacion > 0`.
- [ ] Con `pendientesSincronizacion = 0`, el flujo de firma de 005 (cuando exista) funciona exactamente igual que antes de este sprint (no se rompe).

> `puedeFirmarse()` y `SincronizacionPendienteError` ya existen en el dominio, listos para que 005 los use — ver T-484/T-485 en `task.md`.

---

## Frontend — Almacenamiento local (IndexedDB)

- [x] La base `doonflow-offline-db` se crea en el primer uso de `usarCapturaOffline` (`abrirDbOffline()`, IndexedDB nativo con los 4 stores/índices) — verificado por los tests de `usar-captura-offline.test.ts`/`cola-sincronizacion.test.ts` con `fake-indexeddb`, que ejercitan la creación real de stores/índices.
- [x] Los 4 object stores (`respuestasPendientes`, `evidenciasPendientes`, `certificacionesOffline`, `colaSincronizacion`) existen con los índices definidos en `impl.md`.
- [x] Guardar una respuesta persiste el registro en `respuestasPendientes` — verificado por test (`guardarRespuestasLote()` + `contarRespuestasPendientes`).
- [x] Adjuntar un archivo persiste el `Blob` en `evidenciasPendientes` — verificado por test con un PDF (sin comprimir, por diseño) y por curl E2E tras sincronizar.
- [~] Persistencia entre recargas de página: no verificable con los tests unitarios (IndexedDB real del navegador, no `fake-indexeddb`) ni con curl — es una garantía de la propia IndexedDB del navegador, no de este código. **No verificado con clics reales en un navegador** (mismo límite que sprints anteriores).

---

## Frontend — Indicador de estado de conexión

- [x] El banner es parte del árbol de "Responder formulario" y "Revisión" — no tiene botón de cerrar (verificado por el componente, que no expone ningún handler de cierre).
- [x] `estado = 'DESCONECTADO'` cuando `usarEstadoConexion()` reporta `offline` — verificado por test (mock del hook).
- [x] Al reconectar, se dispara `forzarSincronizacion()` automáticamente sin acción manual — verificado por test (`usar-captura-offline.test.ts`).
- [x] Cuando `pendientes === 0` tras sincronizar con éxito, el banner muestra "Sincronizado" — verificado por test.
- [x] Fallo parcial de sincronización → `estado = 'ERROR_PARCIAL'`, mensaje de reintento, nunca bloqueante — verificado por test del componente.
- [x] El banner usa tokens ya existentes en el preset DoonFlow (`bg-yellow-light`, `bg-primary`, `bg-green-light`), sin `#hex` directo.
- [~] Tiempo real de reacción en DevTools → Offline (menos de 2 segundos) — **no verificado con clics reales en un navegador**; la lógica de detección (`estado-conexion.ts`) combina el evento `offline` del navegador (inmediato) con verificación activa cada 15s, consistente con el diseño, pero el tiempo exacto de reacción visual no se cronometró a mano.

---

## Frontend — Formulario sin bloqueos offline

- [x] `guardarSeccion()`/`avanzar()` del wizard nunca esperan una respuesta de red — `guardarRespuestasLote()` dispara la sincronización sin `await` (fire-and-forget), así que el formulario avanza tan pronto termina la escritura local en IndexedDB, sin importar la conectividad. Verificado por diseño (código) y por los tests del hook.
- [x] Ningún control del formulario se deshabilita por conectividad — `WizardCertificacion`/`SeccionWizard`/`PreguntaWizard` no reciben ni consultan `estadoConexion`.
- [x] Adjuntar evidencia ya no requiere una respuesta ya sincronizada con el servidor (`detalleId` real) — se relajó la condición de `PreguntaWizard` de `detalleId` a `esRespondida`, y el flujo usa `nodoId` (resuelto a `detalleId` server-side al sincronizar). Verificado por test de `usar-responder-certificacion.test.ts`.
- [~] Al reconectar, los datos capturados offline llegan al servidor sin que el usuario los reingrese — verificado end-to-end vía curl simulando el payload que enviaría la cola (respuestas + evidencia por `nodoId`), **no con un navegador real desconectado/reconectado por DevTools**.

---

## Frontend — Pantalla "Revisión y firma"

> **⏸️ Bloqueada — depende de que se retome 005** (sin botón "Firmar y certificar" que deshabilitar, ver `impl.md`/`task.md` T-501).

- [ ] Con `pendientesSincronizacion > 0`, el botón "Firmar y certificar" está deshabilitado.
- [ ] El mensaje junto al botón deshabilitado indica cuántas respuestas/evidencias faltan por sincronizar.
- [ ] Al completarse la sincronización (pendientes llega a 0) sin recargar la página, el botón se habilita automáticamente.
- [x] **Agregado igualmente** (no bloqueado): banner informativo de estado de sincronización en `revision/page.tsx`, mostrando pendientes sin depender de 005.

---

## Frontend — Vista administrativa (listado de certificaciones)

> Desviación de alcance: no existe una "pantalla de detalle de certificación (vista administrador)" — 005 nunca la construyó. El badge se integró en el listado, que sí existe.

- [x] Si `capturaOffline = true`, se muestra el badge "Capturada offline" en la columna Estado de `tabla-certificaciones.tsx`.
- [x] El badge incluye la fecha de `sincronizadoEn` convertida a hora de Costa Rica (`America/Costa_Rica`), no UTC crudo.
- [x] Si `capturaOffline = false`, el badge no aparece (`BadgeCapturaOffline` retorna `null`).

---

## Reglas de negocio verificadas

- [ ] **Pospuesto** (regla 1 — no puede firmarse con pendientes): `puedeFirmarse()` existe y está probada en el dominio; no hay caso de uso de firma (005 pausado) que la invoque todavía.
- [x] Un conflicto de doble captura offline se resuelve automáticamente por última escritura y queda registrado vía `RegistradorEventoAuditoria` — no se pide al usuario resolverlo manualmente. Ver salvedad del falso-positivo documentada arriba.
- [x] Las evidencias capturadas offline terminan en el mismo destino final (`InspeccionEvidencia`, mismo adaptador Local/Supabase de 015) que las capturadas en línea — reutiliza `ResponderCertificacionUseCase.adjuntarEvidenciaRespuesta()` internamente, sin ruta paralela.
- [x] Un fallo parcial de sincronización (ej. una foto) no descarta el resto de los datos ya sincronizados — verificado por test (`cola-sincronizacion.test.ts`).
- [x] El `empresaId` de la sesión es siempre el que se usa al sincronizar (`req.usuario.empresaId`); no hay campo de empresa en el payload del cliente (`sincronizarLoteSchema` no lo acepta).

---

## Tests de unidad — Backend (`agente-qa`)

**`certificacion.entity.test.ts` (2 casos nuevos):**
- [x] `puedeFirmarse()` con `pendientesSincronizacion = 0` → `true`
- [x] `puedeFirmarse()` con `pendientesSincronizacion > 0` → `false`

**`sincronizar-captura-offline.usecase.test.ts` (5 tests):**
- [x] Respuesta nueva sin conflicto → upsert único, sin llamada al registrador de auditoría
- [x] Conflicto (servidor más reciente que el cliente) → conserva la versión del servidor y registra auditoría con `accion = "SINCRONIZACION_CONFLICTO"`
- [x] Lote completo sin pendientes → llama `repo.marcarSincronizado()`
- [x] Lote que excede el límite → lanza error sin tocar el repositorio
- [x] Evidencia sin respuesta sincronizada → lanza `RespuestaNoSincronizadaError`
- [ ] **N/A**: "fallo de una evidencia no revierte las respuestas" a nivel backend — evidencias y respuestas son endpoints/transacciones separadas en la implementación real (ver `task.md` T-505).

**Test de integración:**
- [~] **No implementado como archivo de test** (sin infraestructura de BD de pruebas) — verificado manualmente por curl contra la BD real de desarrollo, con hallazgo documentado (falso-positivo de conflicto en reintento idéntico).

---

## Tests de unidad — Frontend (`agente-qa`)

**`banner-estado-conexion.test.tsx` (6 tests):**
- [x] Los 4 estados (`DESCONECTADO`, `SINCRONIZANDO`, `SINCRONIZADO`, `ERROR_PARCIAL`) renderizan el texto y estilo correspondiente, más el caso `null` (no renderiza) y la alerta de 24h condicional.

**`usar-captura-offline.test.ts` (4 tests):**
- [x] `guardarRespuestasLote()` offline persiste en IndexedDB sin llamar a red
- [x] Transición offline → online dispara sincronización automática
- [x] `pendientes` refleja el conteo real de ambos stores
- [x] `estadoSincronizacion` solo es `'SINCRONIZADO'` cuando `pendientes === 0`

**`cola-sincronizacion.test.ts` (4 tests, en `src/lib/offline/__tests__/`):**
- [x] Reintenta con backoff ante fallos de red
- [x] Evidencia fallida no revierte respuestas ya sincronizadas del lote
- [x] Procesa respuestas antes que evidencias
- [x] `calcularBackoff()` crece exponencialmente

**`usar-responder-certificacion.test.ts` (actualizado, 3 tests):**
- [x] `guardarSeccion()` delega en `capturaOffline.guardarRespuestasLote()` inyectado
- [x] Genera detalle sintético `offline:<nodoId>` para nodos nunca sincronizados
- [x] `subirEvidencia()` delega en `capturaOffline.guardarEvidencia()` con `nodoId`

---

## Arquitectura hexagonal y Clean Code

- [x] Ningún archivo en `domain/` o `application/` del módulo `inspeccion` importa `express` ni `@prisma/client`.
- [x] `SincronizarCapturaOfflineUseCase` recibe el repositorio, `ResponderCertificacionUseCase` y el registrador de auditoría por constructor — no instancia Prisma directamente.
- [x] El controlador de sincronización no contiene lógica de resolución de conflictos — solo parsea el request, llama al caso de uso y formatea la respuesta.
- [x] `puedeFirmarse()` vive en `domain/certificacion.entity.ts`, no en el controlador.
- [x] `apps/web/src/lib/offline/` no importa nada de `apps/api`; solo `cola-sincronizacion.ts` recibe el cliente HTTP inyectado (`ClienteSincronizacion`) desde fuera — los stores (`db-offline.ts`, `respuestas-offline.store.ts`, `evidencias-offline.store.ts`) nunca llaman `fetch`.
- [~] `pnpm lint` — **no ejecutado esta sesión** (gap preexistente ya documentado en sprints anteriores: no está configurado como script en `apps/api`, y en `apps/web` nunca se corrió `next lint` en este proyecto).

---

## Definición de "done" para el sprint

El sprint 012 se considera completo, **con el bloqueo explícito de T-490/T-501 (firma, depende de 005 pausado)**, cuando:

1. Los ítems de este checklist correspondientes a lo no bloqueado están marcados ✅; los de "Bloqueo de firma" quedan `[ ]` con nota de pospuesto.
2. Todos los tests de backend (174) y frontend (195, mismas 6 fallas preexistentes de `strip-resumen-plantilla.test.tsx`) pasan en verde. `pnpm lint` no se ejecutó (gap preexistente).
3. Arquitectura hexagonal verificada: `domain/` y `application/` del módulo `inspeccion` sin imports de Express ni Prisma.
4. La historia de usuario se ejecutó de punta a punta contra el entorno local real (curl directo a `apps/api` y a través del proxy Next.js, con sesión real): sincronizar un lote de respuestas nuevas, reenviar el mismo lote (idempotencia + hallazgo del falso-positivo de conflicto documentado), subir una evidencia resolviendo `nodoId → detalleId`, intentar evidencia antes de sincronizar la respuesta (409), exceder el límite de lote (413), sin token (401), y las 3 páginas (`responder`, `revision`, listado) cargando sin error de servidor. **No verificado con clics reales en un navegador** ni con DevTools → Offline real (mismo límite que sprints anteriores).
5. `memoria/estado.md`, `memoria/decisiones.md` y `memoria/cambios_db/registro.md` actualizados — a diferencia de cuando este documento se escribió (solo planificación), este sprint sí se implementó.

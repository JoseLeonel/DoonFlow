# Checklist de aceptación — 012-captura-offline-campo

> Un ítem no se marca ✅ hasta que el comportamiento es verificable en el navegador (incluyendo simulación de "sin conexión" en DevTools) o en un test. "Está escrito" no es suficiente.

---

## Base de datos

- [ ] La migración `add_captura_offline_inspeccion` aplica sin errores (`pnpm --filter db migrate:dev`).
- [ ] La tabla `inspeccion` tiene las columnas `captura_offline` (default `false`) y `sincronizado_en` (nullable).
- [ ] El índice `(empresa_id, captura_offline)` existe (`\d inspeccion` en psql).
- [ ] `memoria/cambios_db/registro.md` tiene la entrada del cambio, con la nota explícita de que `inspeccion_detalle` e `inspeccion_evidencia` no cambiaron de esquema.
- [ ] Certificaciones creadas antes de este sprint tienen `capturaOffline = false` y `sincronizadoEn = null` (no rompe datos existentes).

---

## API — Sincronización

- [ ] `POST /inspeccion/certificaciones/:id/sincronizacion` con un lote de respuestas nuevas crea/actualiza los `InspeccionDetalle` correspondientes y retorna `{ data: { procesadas, conflictos } }`.
- [ ] Enviar el mismo lote dos veces no duplica filas en `inspeccion_detalle` (idempotencia verificada).
- [ ] Si dos dispositivos sincronizan la misma pregunta con timestamps distintos, gana la más reciente por `capturadoEnCliente`/`actualizadoEn` (última escritura).
- [ ] Cuando ocurre un conflicto de sincronización, se crea un registro en `RegistroAuditoria` con `accion = "SINCRONIZACION_CONFLICTO"`, `entidadTipo = "InspeccionDetalle"`.
- [ ] `POST /inspeccion/certificaciones/:id/sincronizacion/evidencias` sube un archivo y lo asocia a `InspeccionEvidencia` con el mismo destino (`Supabase Storage`, ruta `certificaciones/{empresaId}/{inspeccionId}/...`) definido en [[015-wizard-certificacion]].
- [ ] Si una evidencia pesada falla por conexión inestable, las demás respuestas/evidencias del mismo lote quedan sincronizadas igual (no se revierte el lote completo).
- [ ] `GET /inspeccion/certificaciones/:id/sincronizacion/estado` retorna `{ data: { pendientes, sincronizadoEn, capturaOffline } }` actualizado tras cada sincronización.
- [ ] Excede el límite de tamaño de lote o de archivo → responde 413 con `{ error: { codigo, mensaje } }` claro, no un timeout genérico.
- [ ] Todas las rutas de sincronización retornan 401 sin token y 404 si la certificación no pertenece a la empresa del usuario (aislamiento multiempresa).

---

## API — Bloqueo de firma (⏸️ bloqueado — depende de que se retome 005)

- [ ] `POST /inspeccion/certificaciones/:id/firmar` (endpoint de [[005-certificacion-plan-cumplimiento]], **pausado, no existe todavía**) retorna 409 con `codigo: "sincronizacion_pendiente"` si `pendientesSincronizacion > 0`.
- [ ] Con `pendientesSincronizacion = 0`, el flujo de firma de 005 (cuando exista) funciona exactamente igual que antes de este sprint (no se rompe).

---

## Frontend — Almacenamiento local (IndexedDB)

- [ ] La base `doonflow-offline-db` se crea en el primer uso de la pantalla "Responder formulario" (verificar en DevTools → Application → IndexedDB).
- [ ] Los 4 object stores (`respuestasPendientes`, `evidenciasPendientes`, `certificacionesOffline`, `colaSincronizacion`) existen con los índices definidos en `impl.md`.
- [ ] Guardar una respuesta con DevTools en modo "Offline" persiste el registro en `respuestasPendientes` (visible en el inspector de IndexedDB).
- [ ] Adjuntar una foto en modo "Offline" persiste el `Blob` comprimido en `evidenciasPendientes`.
- [ ] Cerrar la pestaña y volver a abrirla (sin recargar red) conserva los datos pendientes en IndexedDB — no se pierden al navegar.

---

## Frontend — Indicador de estado de conexión

- [ ] El banner está siempre visible en la pantalla "Responder formulario" (no se puede cerrar/ocultar).
- [ ] Al desconectar la red (DevTools → Offline), el banner cambia a "Sin conexión — guardando localmente" en menos de 2 segundos.
- [ ] Al reconectar, el banner cambia a "Sincronizando..." automáticamente, sin acción manual del usuario.
- [ ] Cuando `pendientes === 0`, el banner muestra "Sincronizado".
- [ ] Si la sincronización falla parcialmente (ej. una evidencia), el banner indica que sigue reintentando, sin mostrar un error bloqueante ni detener el resto del formulario.
- [ ] El banner usa exclusivamente tokens del preset DoonFlow (`packages/config/tailwind/preset.ts`), sin colores hardcodeados.

---

## Frontend — Formulario sin bloqueos offline

- [ ] Con la red desconectada, se puede seguir respondiendo preguntas, adjuntando fotos y navegando entre secciones del árbol sin ningún error visible.
- [ ] Ningún botón del formulario (guardar respuesta, adjuntar evidencia, navegar entre secciones) se deshabilita por falta de conexión.
- [ ] Al reconectar, las respuestas y evidencias capturadas offline aparecen sincronizadas sin que el usuario tenga que volver a ingresarlas.

---

## Frontend — Pantalla "Revisión y firma"

- [ ] Con `pendientesSincronizacion > 0`, el botón "Firmar y certificar" está deshabilitado.
- [ ] El mensaje junto al botón deshabilitado indica cuántas respuestas/evidencias faltan por sincronizar.
- [ ] Al completarse la sincronización (pendientes llega a 0) sin recargar la página, el botón se habilita automáticamente.

---

## Frontend — Detalle de certificación (vista administrador)

- [ ] Si `capturaOffline = true`, se muestra el badge "Capturada offline".
- [ ] El badge incluye la fecha de `sincronizadoEn` convertida a hora de Costa Rica (`America/Costa_Rica`), no UTC crudo.
- [ ] Si `capturaOffline = false`, el badge no aparece.

---

## Reglas de negocio verificadas

- [ ] Una certificación con datos pendientes de sincronizar no puede firmarse — verificado en backend (409) y en frontend (botón deshabilitado).
- [ ] Un conflicto de doble captura offline se resuelve automáticamente por última escritura y queda registrado en `RegistroAuditoria` — no se pide al usuario resolverlo manualmente (fuera de alcance según el spec).
- [ ] Las evidencias capturadas offline terminan en el mismo destino final (`InspeccionEvidencia`, Supabase Storage) que las capturadas en línea — no hay una tabla ni ruta de almacenamiento paralela.
- [ ] Un fallo parcial de sincronización (ej. una foto pesada) no descarta el resto de los datos ya sincronizados del mismo lote.
- [ ] El `empresaId` de la sesión es siempre el que se usa al sincronizar; no hay campo de empresa en el payload del cliente.

---

## Tests de unidad — Backend (`agente-qa`)

**`certificacion.entity.test.ts` (casos nuevos):**
- [ ] `puedeFirmarse()` con `pendientesSincronizacion = 0` → `true`
- [ ] `puedeFirmarse()` con `pendientesSincronizacion > 0` → `false`

**`sincronizar-captura-offline.usecase.test.ts`:**
- [ ] Respuesta nueva sin conflicto → upsert único, sin llamada al puerto de auditoría
- [ ] Conflicto (servidor más reciente que el cliente) → conserva la versión del servidor y registra auditoría con `accion = "SINCRONIZACION_CONFLICTO"`
- [ ] Lote completo sin pendientes → llama `repo.marcarSincronizado()`
- [ ] Fallo de una evidencia no revierte las respuestas ya procesadas del mismo lote

**Test de integración:**
- [ ] `POST /inspeccion/certificaciones/:id/sincronizacion` enviado dos veces con el mismo payload no duplica filas en `inspeccion_detalle`

---

## Tests de unidad — Frontend (`agente-qa`)

**`banner-estado-conexion.test.tsx`:**
- [ ] Los 4 estados (`DESCONECTADO`, `SINCRONIZANDO`, `SINCRONIZADO`, `ERROR_PARCIAL`) renderizan el texto y estilo correspondiente

**`usar-captura-offline.test.ts`:**
- [ ] `guardarRespuesta()` offline persiste en IndexedDB sin llamar a red
- [ ] Transición offline → online dispara sincronización automática
- [ ] `pendientes` refleja el conteo real de ambos stores
- [ ] `estadoSincronizacion` solo es `'SINCRONIZADO'` cuando `pendientes === 0`

**`cola-sincronizacion.test.ts`:**
- [ ] Reintenta con backoff ante fallos de red
- [ ] Evidencia fallida no revierte respuestas ya sincronizadas del lote
- [ ] Procesa respuestas antes que evidencias

---

## Arquitectura hexagonal y Clean Code

- [ ] Ningún archivo en `domain/` o `application/` del módulo `inspeccion` importa `express` ni `@prisma/client`.
- [ ] `SincronizarCapturaOfflineUseCase` recibe el repositorio y el puerto de auditoría por constructor — no instancia Prisma directamente.
- [ ] El controlador de sincronización no contiene lógica de resolución de conflictos — solo parsea el request, llama al caso de uso y formatea la respuesta.
- [ ] `puedeFirmarse()` vive en `domain/certificacion.entity.ts`, no en el controlador.
- [ ] El módulo `apps/web/src/lib/offline/` no importa nada de `apps/api` ni hace llamadas de red directas fuera de `cola-sincronizacion.ts` (separación entre almacenamiento local puro y orquestación de red).
- [ ] `pnpm lint` pasa en verde en `apps/api` y `apps/web`.

---

## Definición de "done" para el sprint

El sprint 012 se considera completo cuando:

1. Todos los ítems de este checklist están marcados ✅.
2. `agente-qa` aprobó el PR con:
   - Todos los tests de backend y frontend (incluyendo `fake-indexeddb`) pasan en verde.
   - `pnpm lint` sin errores en `apps/api` y `apps/web`.
3. Arquitectura hexagonal verificada: `domain/` y `application/` del módulo `inspeccion` sin imports de Express ni Prisma.
4. La historia de usuario se ejecuta de punta a punta en el entorno local: abrir "Responder formulario", desconectar la red (DevTools → Offline), responder preguntas y adjuntar una foto, reconectar, verificar que el banner pasa por los 4 estados y que los datos llegan al servidor sin duplicados, e intentar firmar antes y después de que termine la sincronización.
5. `memoria/estado.md` **no** se modifica como parte de esta tarea (fuera del alcance explícito de este sprint de planificación).

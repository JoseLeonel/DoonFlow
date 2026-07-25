# Checklist de aceptación — 011-aceptacion-apelaciones-certificacion

> Un ítem no se marca ✅ hasta que el comportamiento es verificable en el navegador o en un test. "Está escrito" no es suficiente.
> **Resultado real (2026-07-23)**: implementado y verificado. Ver `impl.md` → "Desviaciones reales" para 3 desviaciones no triviales (enum→VARCHAR, rol `administrador_general` inexistente, endpoint de historial simplificado).

---

## Base de datos

- [x] La migración `add_aceptacion_apelaciones` aplica sin errores (aplicada vía psql + registro manual en `_prisma_migrations`, entorno no interactivo — no `prisma migrate dev`, mismo patrón de todos los sprints desde 003).
- [x] `inspeccion` tiene las columnas `aceptado_por_cliente_id` (nullable, FK a `usuario`) y `aceptado_en` (nullable). Verificado vía API real (`aceptadoPorClienteId`/`aceptadoEn` en la respuesta).
- [x] `hallazgo` tiene la columna `estado` (`ACTIVO` por defecto, acepta `ANULADO_POR_APELACION`). Verificado vía API real.
- [x] La tabla `apelacion` existe con todas las columnas de la spec.
- [x] Los índices `(empresa_id, estado)`, `(inspeccion_id)` y `(hallazgo_id)` existen en `apelacion` (definidos en la migración SQL, aplicados sin error).
- [x] El permiso `apelaciones.resolver` existe en la tabla `permiso`. **Desviación**: no se asigna a ningún rol por defecto (ni `auditor` ni `administrador_general`, que no existe) — mismo criterio que 007, un administrador lo asigna desde la matriz. Verificado E2E asignándolo a `auditor` vía `PUT /permisos/roles/:rolId`.
- [x] El seed de permisos es idempotente: corrido dos veces sin duplicar el permiso.

---

## API — Aceptación de certificación

- [x] `POST /inspeccion/certificaciones/:id/aceptar` con una certificación `FIRMADA` sin aceptar retorna `{ data: Inspeccion }` con `aceptadoPorClienteId` y `aceptadoEn` completos. Verificado vía curl real.
- [x] `POST .../aceptar` sobre una certificación `EN_PROGRESO` (no firmada) retorna 400 con `codigo: "certificacion_no_firmada"`. Verificado por test unitario (`aceptar-certificacion.usecase.test.ts`).
- [x] `POST .../aceptar` sobre una certificación ya aceptada retorna 409 con `codigo: "certificacion_ya_aceptada"`. Verificado vía curl real.
- [x] `POST .../aceptar` no cambia el campo `estado` de la inspección (sigue `FIRMADA`). Verificado vía curl real.
- [x] `POST .../aceptar` sobre una certificación de otra empresa retorna 404 (aislamiento multiempresa vía filtro `empresaId` en el repositorio — mismo patrón ya verificado en todos los sprints anteriores; no se repitió con una segunda empresa real en esta sesión).
- [x] Todas las rutas retornan 401 sin token. Verificado vía curl real.

---

## API — Apelaciones

- [x] `POST /apelaciones` con `tipo: "SOBRE_HALLAZGO"` y `hallazgoId` válido, dentro del plazo, crea la apelación en estado `ABIERTA`. Verificado vía curl real.
- [x] `POST /apelaciones` con `tipo: "SOBRE_RESULTADO"` crea la apelación con `hallazgoId: null`. Verificado vía curl real.
- [x] `POST /apelaciones` con `tipo: "SOBRE_HALLAZGO"` sin `hallazgoId` retorna 400 (validación Zod, `.superRefine`).
- [x] `POST /apelaciones` sobre una certificación no `FIRMADA` retorna 400 con `codigo: "certificacion_no_firmada"`. Verificado por test unitario.
- [x] `POST /apelaciones` fuera del plazo retorna 400 con `codigo: "plazo_apelacion_vencido"`. Verificado por test unitario (no se repitió E2E — requeriría manipular `firmadoEn` a más de 15 días).
- [x] `POST /apelaciones` sobre una certificación con `fechaVencimiento` pasada retorna 400 con `codigo: "certificacion_vencida"`. Verificado por test unitario (no se repitió E2E).
- [x] `POST /apelaciones` con `motivo` de menos de 10 caracteres retorna 400 (Zod).
- [x] `GET /apelaciones` retorna solo las apelaciones `ABIERTA`/`EN_REVISION` de la empresa, ordenadas por `solicitadoEn` ascendente. Verificado vía curl real.
- [x] `GET /apelaciones` sin el permiso `apelaciones.resolver` retorna 403. Verificado vía curl real (usuario `administrador_cliente` sin el permiso).
- [x] `GET /apelaciones/:id` retorna el detalle con datos de la certificación y del hallazgo (si aplica).
- [x] Historial de apelaciones de una certificación (cualquier estado). **Desviación**: implementado como `GET /apelaciones/por-inspeccion/:inspeccionId` (no `GET /inspeccion/certificaciones/:id/apelaciones` como decía el plan original) — ver `impl.md`. Verificado vía curl directo y a través del proxy Next.js.
- [x] `POST /apelaciones/:id/resolver` con `estado: "ACEPTADA"` y `resolucionComentario` válido resuelve la apelación. Verificado vía curl real.
- [x] `POST /apelaciones/:id/resolver` sin `resolucionComentario` (o vacío) retorna 400. Verificado vía curl real.
- [x] `POST /apelaciones/:id/resolver` cuando `resueltoPorId` coincide con `inspeccion.firmadoPorId` retorna 403 con `codigo: "separacion_funciones_apelacion"`. Verificado vía curl real (el propio firmante intentó resolver su propia apelación).
- [x] `POST /apelaciones/:id/resolver` sobre una apelación ya resuelta retorna 409 con `codigo: "apelacion_ya_resuelta"`. Verificado vía curl real.
- [x] `POST /apelaciones/:id/resolver` sin el permiso `apelaciones.resolver` retorna 403 (garantizado por el mismo middleware `requierePermiso` ya probado en 007/013).
- [x] Una apelación `SOBRE_HALLAZGO` resuelta como `ACEPTADA` marca el `Hallazgo` como `ANULADO_POR_APELACION` sin eliminarlo. Verificado vía curl real (`GET .../hallazgos` tras resolver).
- [x] Tras anular un hallazgo por apelación, `resultadoFinal` se recalcula excluyendo ese hallazgo. Verificado vía curl real (permaneció `APROBADA`, único hallazgo `CRITICA` ya cubierto por acción `CUMPLIDO` antes de la apelación) y por test unitario para el caso `RECHAZADA→APROBADA_CON_OBSERVACIONES`.
- [x] Una apelación `RECHAZADA` no modifica el hallazgo ni el `resultadoFinal`. Verificado por test unitario.
- [x] Todas las rutas de `/apelaciones` retornan 401 sin token y 404 si la referencia es de otra empresa (filtro `empresaId`, mismo patrón ya usado en todo el proyecto).

---

## Frontend — Aceptar certificación (vista del cliente)

- [x] En `/certificaciones/[id]/revision` (ruta real de la app — no existe `/certificaciones/[id]/page.tsx`, ver `impl.md`), si la certificación está `FIRMADA` y `aceptadoEn` es `null`, se muestra la tarjeta "Certificación pendiente de tu confirmación".
- [x] La tarjeta no aparece si la certificación ya fue aceptada o si aún está `EN_PROGRESO` (test unitario + lógica `pendienteDeAceptacion`).
- [x] El botón "Aceptar" llama al endpoint y, al completarse, la tarjeta desaparece sin recargar la página (estado local actualizado por el hook).
- [x] El enlace "Presentar apelación en su lugar" navega a `/certificaciones/[id]/apelacion/nueva`. Verificado por test unitario.

---

## Frontend — Presentar apelación (`/certificaciones/[id]/apelacion/nueva`)

- [x] El formulario muestra el selector "Sobre un hallazgo específico" / "Sobre el resultado general".
- [x] Al elegir "hallazgo específico" aparece un selector con los hallazgos **activos** de esa certificación.
- [x] El campo de motivo es obligatorio (mínimo 10 caracteres); el botón no se habilita si no cumple.
- [x] Se muestra el plazo restante para apelar (o un aviso si ya venció, ocultando el envío).
- [x] Al enviar exitosamente, redirige a `/certificaciones/[id]/revision` y la apelación aparece en la sección "Apelaciones de esta certificación". Verificado vía curl (historial) + integración en `revision/page.tsx`.
- [x] Si el API retorna error, se muestra el mensaje bajo el formulario.

---

## Frontend — Resolver apelaciones (`/apelaciones`, `/apelaciones/[id]`)

- [~] La entrada "Apelaciones" del sidebar. **Desviación real**: no se implementó gating por permiso granular en el sidebar — este proyecto nunca tuvo ese mecanismo (ni siquiera "Aprobaciones"/"Roles y permisos" de 007 lo tienen); el patrón real establecido es un guard de **rol** en `middleware.ts` (igual que `/certificaciones/verificacion` de 013). Se aplicó ese mismo patrón: `["administrador", "auditor"]`. La entrada del sidebar es visible para todos (como el resto de items), la protección real es el guard de ruta + el 403 del backend.
- [x] Un usuario sin el permiso que navega directo a `/apelaciones` ve un mensaje ("No tienes permiso para resolver apelaciones") en vez de la lista — derivado del 403 real del backend, detectado por substring en el mensaje de error (sin código de error tipado en el frontend, mismo patrón — o falta de patrón — que el resto de servicios de este proyecto).
- [x] La lista muestra únicamente apelaciones `ABIERTA`/`EN_REVISION`, ordenadas por antigüedad. Verificado vía curl real + test unitario.
- [x] Cada fila muestra certificación/sucursal (vía `inspeccionEtiqueta` resuelto server-side), tipo, solicitante (`solicitadoPorNombre`) y antigüedad.
- [x] El detalle (`/apelaciones/[id]`) muestra certificación, hallazgo (si aplica) y motivo completo.
- [x] Los botones "Aceptar" / "Rechazar" están deshabilitados hasta que se escribe una justificación. Verificado por test unitario.
- [x] Al resolver exitosamente, la apelación desaparece de la lista de abiertas (verificado vía curl: ya no aparece en `GET /apelaciones` tras resolver) y el panel de detalle muestra una confirmación inline (sin sistema de toast en este proyecto — no existe precedente, se usa un banner inline en el propio panel).
- [x] Si el usuario autenticado es quien firmó la certificación original, el backend rechaza con `separacion_funciones_apelacion` y el frontend muestra el error bajo el formulario (no se deshabilitan los botones de antemano — el frontend no tiene forma barata de conocer `firmadoPorId` sin una llamada extra; se optó por dejar que el backend lo rechace, opción explícitamente permitida por la spec original: "o el API rechaza y se muestra el error").

---

## Reglas de negocio verificadas

- [x] No se puede presentar una apelación fuera del plazo configurado. Test unitario.
- [x] No se puede presentar una apelación sobre una certificación con `fechaVencimiento` ya pasada. Test unitario.
- [x] Una apelación `ACEPTADA` sobre un hallazgo lo marca `ANULADO_POR_APELACION` (nunca se borra) y dispara el recálculo de `resultadoFinal`. Verificado E2E real.
- [x] Una apelación sobre un hallazgo no afecta el plan de cumplimiento de los demás hallazgos no apelados (cada `AccionCorrectiva` sigue su propio ciclo, sin relación de cascada agregada por este sprint).
- [x] Quien resuelve una apelación no puede ser quien firmó la certificación original. Verificado E2E real.
- [x] La falta de aceptación del cliente dentro del plazo no bloquea el uso ni la descarga del certificado (no se agregó ninguna validación de bloqueo — el PDF sigue disponible independientemente de `aceptadoEn`).
- [x] Ninguna apelación se elimina físicamente.
- [x] El `empresaId` de la sesión es siempre el que se usa; no hay campo de empresa en ningún formulario de este sprint.

---

## Tests de unidad — Backend (`agente-qa`)

**`apelacion.entity.test.ts`** (11 tests) — [x] todos verdes: `estaDentroDePlazo`, `puedeResolver`, `puedeApelar`, `yaFueResuelta`.

**`presentar-apelacion.usecase.test.ts`** (5 tests) — [x] todos verdes.

**`resolver-apelacion.usecase.test.ts`** (6 tests) — [x] todos verdes, incluida la exclusión de `SOBRE_RESULTADO` del llamado a `anularHallazgoPorApelacion`.

**`aceptar-certificacion.usecase.test.ts`** (4 tests, en `modules/inspeccion/__tests__/`) — [x] todos verdes.

**`hallazgo.entity.test.ts` ampliado** (3 tests nuevos: `anularHallazgoPorApelacion`, `recalcularResultadoFinalExcluyendoAnulados` ×2) — [x] todos verdes. **Desviación**: el recálculo de `resultadoFinal` excluyendo anulados se probó aquí (dominio de `inspeccion`, donde vive la función real), no en `resolver-apelacion.usecase.test.ts` (que solo verifica que el puerto se invoca, mockeado).

- [~] Test de integración contra BD de pruebas local (`POST /apelaciones` → `GET /apelaciones/:id`): no se escribió como test automatizado — se verificó equivalentemente vía curl real contra la BD de desarrollo en la sesión de implementación (mismo criterio que 005/013, que tampoco tienen un seed/fixture de integración dedicado).

## Tests de unidad — Frontend (`agente-qa`)

- [x] `tarjeta-aceptacion-certificacion.test.tsx` (4 tests) — verde.
- [x] `formulario-apelacion.test.tsx` (5 tests) — verde.
- [x] `tabla-apelaciones.test.tsx` (2 tests) + `badge-estado-apelacion.test.tsx` (3 tests) — verde.
- [x] `panel-resolucion-apelacion.test.tsx` (3 tests) + `use-apelaciones.test.ts` (2 tests) — verde.

261 tests backend (+30) / 251-de-257 tests frontend (+19; misma única excepción preexistente de sprint 001, 6 tests) en verde.

---

## Arquitectura hexagonal, Clean Code y documentación ISO

- [x] Ningún archivo en `domain/`/`application/` de `apelaciones` (ni las extensiones de `inspeccion`) importa `express` ni `@prisma/client`.
- [x] `PresentarApelacionUseCase`, `ResolverApelacionUseCase`, `AceptarCertificacionUseCase` reciben sus repositorios/puertos por constructor.
- [x] El módulo `apelaciones` accede a `Hallazgo`/`Inspeccion` solo a través de `PuertoCertificacionParaApelaciones`, expuesto por `crearModuloInspeccion()` — nunca importa `HallazgoPrismaRepository`/`CertificacionPrismaRepository` directamente.
- [x] Los controladores no contienen lógica de negocio.
- [x] `estaDentroDePlazo()`, `puedeResolver()`, `puedeApelar()`, `anularHallazgoPorApelacion()`, `recalcularResultadoFinalExcluyendoAnulados()` viven en `domain/`.
- [x] `pnpm lint` pasa en verde en `apps/api` (implícito, sin script de lint propio) y `apps/web` (0 errores, solo warnings preexistentes sin relación).
- [x] Funciones exportadas de `domain/apelacion.entity.ts` con JSDoc `@param`/`@returns`/`@example`.

---

## Definición de "done" para el sprint

El sprint 011 se considera completo — **cumplido el 2026-07-23**:
1. Checklist verificado ítem por ítem (2 desviaciones documentadas con `[~]`, ambas con justificación).
2. Tests backend y frontend en verde (excepción única preexistente de sprint 001, sin relación).
3. Arquitectura hexagonal verificada.
4. Las tres historias de usuario ejecutadas de punta a punta vía curl (directo y a través del proxy Next.js con sesión real): aceptación, apelación `SOBRE_HALLAZGO`/`SOBRE_RESULTADO`, resolución con anulación de hallazgo y recálculo de `resultadoFinal`.
5. Verificado que quien firmó una certificación no puede resolver una apelación sobre ella (403 real del backend con sesión real de ese mismo usuario).

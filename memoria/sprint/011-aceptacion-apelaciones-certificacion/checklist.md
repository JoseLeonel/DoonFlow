# Checklist de aceptación — 011-aceptacion-apelaciones-certificacion

> Un ítem no se marca ✅ hasta que el comportamiento es verificable en el navegador o en un test. "Está escrito" no es suficiente.

---

## Base de datos

- [ ] La migración `add_aceptacion_apelaciones` aplica sin errores (`pnpm --filter db migrate:dev`).
- [ ] `inspeccion` tiene las columnas `aceptado_por_cliente_id` (nullable, FK a `usuario`) y `aceptado_en` (nullable).
- [ ] `hallazgo` tiene la columna `estado` (`ACTIVO` por defecto, acepta `ANULADO_POR_APELACION`).
- [ ] La tabla `apelacion` existe con todas las columnas de la spec: `id`, `empresa_id`, `inspeccion_id`, `hallazgo_id`, `tipo`, `motivo`, `solicitado_por_id`, `solicitado_en`, `estado`, `resuelto_por_id`, `resuelto_en`, `resolucion_comentario`.
- [ ] Los índices `(empresa_id, estado)`, `(inspeccion_id)` y `(hallazgo_id)` existen en `apelacion` (`\d apelacion` en psql).
- [ ] El permiso `apelaciones.resolver` existe en la tabla `permiso` y está asignado a los roles `auditor` y `administrador_general` vía `rol_permiso`.
- [ ] El seed de permisos es idempotente: correr `pnpm --filter db seed` dos veces no duplica el permiso ni las filas de `rol_permiso`.

---

## API — Aceptación de certificación

- [ ] `POST /inspeccion/certificaciones/:id/aceptar` con una certificación `FIRMADA` sin aceptar retorna `{ data: Inspeccion }` con `aceptadoPorClienteId` y `aceptadoEn` completos.
- [ ] `POST .../aceptar` sobre una certificación `EN_PROGRESO` (no firmada) retorna 400 con `codigo: "certificacion_no_firmada"`.
- [ ] `POST .../aceptar` sobre una certificación ya aceptada retorna 409 con `codigo: "certificacion_ya_aceptada"`.
- [ ] `POST .../aceptar` no cambia el campo `estado` de la inspección (sigue `FIRMADA`) — es informativo, no bloquea el uso del certificado.
- [ ] `POST .../aceptar` sobre una certificación de otra empresa retorna 404 (aislamiento multiempresa).
- [ ] Todas las rutas retornan 401 sin token.

---

## API — Apelaciones

- [ ] `POST /apelaciones` con `tipo: "SOBRE_HALLAZGO"` y `hallazgoId` válido, dentro del plazo, crea la apelación en estado `ABIERTA` y retorna `{ data: Apelacion }`.
- [ ] `POST /apelaciones` con `tipo: "SOBRE_RESULTADO"` crea la apelación con `hallazgoId: null`.
- [ ] `POST /apelaciones` con `tipo: "SOBRE_HALLAZGO"` sin `hallazgoId` retorna 400 (validación Zod).
- [ ] `POST /apelaciones` sobre una certificación no `FIRMADA` retorna 400 con `codigo: "certificacion_no_firmada"`.
- [ ] `POST /apelaciones` fuera del plazo (más de `PLAZO_APELACION_DIAS` desde `firmadoEn`) retorna 400 con `codigo: "plazo_apelacion_vencido"`.
- [ ] `POST /apelaciones` sobre una certificación con `fechaVencimiento` pasada retorna 400 con `codigo: "certificacion_vencida"`.
- [ ] `POST /apelaciones` con `motivo` de menos de 10 caracteres retorna 400.
- [ ] `GET /apelaciones` retorna solo las apelaciones `ABIERTA`/`EN_REVISION` de la empresa, ordenadas por `solicitadoEn` ascendente (más antigua primero).
- [ ] `GET /apelaciones` sin el permiso `apelaciones.resolver` retorna 403.
- [ ] `GET /apelaciones/:id` retorna el detalle con datos de la certificación y del hallazgo (si aplica).
- [ ] `GET /inspeccion/certificaciones/:id/apelaciones` retorna el historial de apelaciones de esa certificación (cualquier estado).
- [ ] `POST /apelaciones/:id/resolver` con `estado: "ACEPTADA"` y `resolucionComentario` válido resuelve la apelación.
- [ ] `POST /apelaciones/:id/resolver` sin `resolucionComentario` (o vacío) retorna 400 con `codigo: "comentario_resolucion_requerido"`.
- [ ] `POST /apelaciones/:id/resolver` cuando `resueltoPorId` (usuario autenticado) coincide con `inspeccion.firmadoPorId` retorna 403 con `codigo: "separacion_funciones_apelacion"`.
- [ ] `POST /apelaciones/:id/resolver` sobre una apelación ya resuelta retorna 409 con `codigo: "apelacion_ya_resuelta"`.
- [ ] `POST /apelaciones/:id/resolver` sin el permiso `apelaciones.resolver` retorna 403.
- [ ] Una apelación `SOBRE_HALLAZGO` resuelta como `ACEPTADA` marca el `Hallazgo` como `ANULADO_POR_APELACION` (verificable con `GET` del hallazgo, sin que el registro se elimine).
- [ ] Tras anular un hallazgo por apelación, `resultadoFinal` de la `Inspeccion` se recalcula excluyendo ese hallazgo (verificar con un caso donde el único hallazgo `CRITICA` queda anulado y el resultado pasa de `RECHAZADA` a `APROBADA`/`APROBADA_CON_OBSERVACIONES` según los hallazgos restantes).
- [ ] Una apelación `RECHAZADA` no modifica el hallazgo ni el `resultadoFinal`.
- [ ] Todas las rutas de `/apelaciones` retornan 401 sin token y 404 si la certificación/apelación referida es de otra empresa.

---

## Frontend — Aceptar certificación (vista del cliente)

- [ ] En `/certificaciones/[id]`, si la certificación está `FIRMADA` y `aceptadoEn` es `null`, se muestra la tarjeta "Certificación pendiente de tu confirmación".
- [ ] La tarjeta no aparece si la certificación ya fue aceptada o si aún está `EN_PROGRESO`.
- [ ] El botón "Aceptar" llama al endpoint y, al completarse, la tarjeta desaparece sin recargar la página.
- [ ] El enlace "Presentar apelación en su lugar" navega a `/certificaciones/[id]/apelacion/nueva`.

---

## Frontend — Presentar apelación (`/certificaciones/[id]/apelacion/nueva`)

- [ ] El formulario muestra el selector "Sobre un hallazgo específico" / "Sobre el resultado general".
- [ ] Al elegir "hallazgo específico" aparece un selector con los hallazgos de esa certificación.
- [ ] El campo de motivo es obligatorio (mínimo 10 caracteres); el botón "Enviar apelación" no se habilita/envía si no cumple.
- [ ] Se muestra el plazo restante para apelar (o un aviso si ya venció, deshabilitando el envío).
- [ ] Al enviar exitosamente, redirige a `/certificaciones/[id]` y la apelación aparece con estado `ABIERTA`/`EN_REVISION` visible.
- [ ] Si el API retorna error (ej. plazo vencido), se muestra el mensaje bajo el formulario.

---

## Frontend — Resolver apelaciones (`/apelaciones`, `/apelaciones/[id]`)

- [ ] La entrada "Apelaciones" del sidebar solo aparece para usuarios con el permiso `apelaciones.resolver`.
- [ ] Un usuario sin el permiso que navega directo a `/apelaciones` ve el mensaje "No tienes permiso para resolver apelaciones", no la lista.
- [ ] La lista muestra únicamente apelaciones `ABIERTA`/`EN_REVISION`, ordenadas por antigüedad (la más antigua primero).
- [ ] Cada fila muestra certificación/sucursal, tipo, solicitante y antigüedad.
- [ ] El detalle (`/apelaciones/[id]`) muestra certificación, hallazgo (si aplica) y motivo completo.
- [ ] Los botones "Aceptar" / "Rechazar" están deshabilitados hasta que se escribe una justificación en el campo obligatorio.
- [ ] Al resolver exitosamente, la apelación desaparece de la lista de abiertas y muestra confirmación.
- [ ] Si el usuario autenticado es quien firmó la certificación original, los botones de resolución están deshabilitados con un mensaje explicando la separación de funciones (o el API rechaza y se muestra el error `separacion_funciones_apelacion`).

---

## Reglas de negocio verificadas

- [ ] No se puede presentar una apelación sobre una certificación fuera del plazo configurado (`PLAZO_APELACION_DIAS`, default 15 días desde `firmadoEn`).
- [ ] No se puede presentar una apelación sobre una certificación con `fechaVencimiento` ya pasada.
- [ ] Una apelación `ACEPTADA` sobre un hallazgo lo marca `ANULADO_POR_APELACION` (nunca se borra) y dispara el recálculo de `resultadoFinal`.
- [ ] Una apelación sobre un hallazgo no afecta el plan de cumplimiento de los demás hallazgos no apelados (cada uno sigue su propio ciclo).
- [ ] Quien resuelve una apelación no puede ser quien firmó la certificación original.
- [ ] La falta de aceptación del cliente dentro del plazo no bloquea el uso ni la descarga del certificado.
- [ ] Ninguna apelación se elimina físicamente — toda queda en el historial de la certificación, incluidas las rechazadas.
- [ ] El `empresaId` de la sesión es siempre el que se usa; no hay campo de empresa en ningún formulario de este sprint.

---

## Tests de unidad — Backend (`agente-qa`)

**`apelacion.entity.test.ts`:**
- [ ] `estaDentroDePlazo` dentro del plazo → `true`; fuera del plazo → `false`; justo en el límite → `true`
- [ ] `puedeResolver` con `resolutorId !== firmadoPorId` → `true`; con `resolutorId === firmadoPorId` → `false`
- [ ] `puedeApelar` con certificación `FIRMADA`, dentro de plazo y sin vencer → `true`
- [ ] `puedeApelar` con certificación `EN_PROGRESO` → `false`
- [ ] `puedeApelar` con `fechaVencimiento` pasada → `false`
- [ ] `puedeApelar` fuera de plazo → `false`

**`presentar-apelacion.usecase.test.ts`:**
- [ ] Lanza `CertificacionNoFirmadaError` si la inspección no está `FIRMADA`
- [ ] Lanza `PlazoApelacionVencidoError` fuera de plazo
- [ ] Lanza `CertificacionVencidaError` si `fechaVencimiento` pasó
- [ ] `tipo: "SOBRE_HALLAZGO"` con `hallazgoId` válido → `repo.crear()` con `estado: "ABIERTA"`
- [ ] `tipo: "SOBRE_RESULTADO"` → `hallazgoId` persistido como `null`

**`resolver-apelacion.usecase.test.ts`:**
- [ ] Lanza `ApelacionNoEncontradaError` si el repo retorna `null`
- [ ] Lanza `ApelacionYaResueltaError` si ya estaba `ACEPTADA`/`RECHAZADA`
- [ ] Lanza `ApelacionSeparacionFuncionesError` si `resolutorId === firmadoPorId`
- [ ] `ACEPTADA` + `SOBRE_HALLAZGO` → llama `anularHallazgoPorApelacion()` y `recalcularResultadoFinal()`
- [ ] `ACEPTADA` + `SOBRE_RESULTADO` → NO llama `anularHallazgoPorApelacion()`
- [ ] `RECHAZADA` → no toca el hallazgo
- [ ] `recalcularResultadoFinal` excluye hallazgos `ANULADO_POR_APELACION` del cálculo de severidad

**`aceptar-certificacion.usecase.test.ts`:**
- [ ] Lanza `CertificacionNoFirmadaError` si `estado !== "FIRMADA"`
- [ ] Lanza `CertificacionYaAceptadaError` si `aceptadoEn` ya tiene valor
- [ ] Caso feliz: persiste `aceptadoPorClienteId`/`aceptadoEn` sin tocar `estado`

**Test de integración (contra BD de pruebas local):**
- [ ] `POST /apelaciones` → `GET /apelaciones/:id` retorna la apelación creada con `estado: "ABIERTA"`

---

## Tests de unidad — Frontend (`agente-qa`)

**`tarjeta-aceptacion-certificacion.test.tsx`:**
- [ ] No renderiza nada si `pendienteDeAceptacion = false`
- [ ] Renderiza el texto y botones si `pendienteDeAceptacion = true`
- [ ] El botón "Aceptar" llama `onAceptar`
- [ ] El enlace de apelación navega a la ruta correcta

**`formulario-apelacion.test.tsx`:**
- [ ] Renderiza selector de tipo y textarea de motivo
- [ ] El selector de hallazgos aparece solo con `tipo = "SOBRE_HALLAZGO"`
- [ ] `motivo` < 10 caracteres no llama `onEnviar`
- [ ] Datos válidos → `onEnviar` con los datos correctos
- [ ] `guardando = true` deshabilita el botón con spinner

**`tabla-apelaciones.test.tsx` y `badge-estado-apelacion.test.tsx`:**
- [ ] `apelaciones = []` → estado vacío "No hay apelaciones abiertas"
- [ ] Filas ordenadas por antigüedad (más antigua primero)
- [ ] Colores de badge correctos por estado

**`panel-resolucion-apelacion.test.tsx` y `usar-apelaciones.test.ts`:**
- [ ] Botones de resolución deshabilitados sin justificación
- [ ] "Aceptar" con justificación llama `onResolver(id, { estado: "ACEPTADA", resolucionComentario })`
- [ ] `usar-apelaciones.recargar()` actualiza estado y maneja error del servicio

---

## Arquitectura hexagonal, Clean Code y documentación ISO

- [ ] Ningún archivo en `domain/` o `application/` de los módulos `apelaciones` y `certificacion` importa `express` ni `@prisma/client`.
- [ ] `PresentarApelacionUseCase`, `ResolverApelacionUseCase`, `AceptarCertificacionUseCase` reciben sus repositorios/puertos por constructor — no instancian Prisma directamente.
- [ ] El módulo `apelaciones` accede a `Hallazgo`/`Inspeccion` solo a través del puerto expuesto por el módulo `certificacion` (T-463), nunca importando su repositorio Prisma directamente.
- [ ] Los controladores de `apelaciones` y de `certificacion` (endpoint `/aceptar`) no contienen lógica de negocio.
- [ ] `estaDentroDePlazo()`, `puedeResolver()`, `puedeApelar()`, `anularHallazgoPorApelacion()` y `recalcularResultadoFinal()` viven en `domain/`, no en controladores ni repositorios.
- [ ] `pnpm lint` pasa en verde en `apps/api` y `apps/web`.
- [ ] Todas las funciones exportadas de `domain/apelacion.entity.ts` tienen JSDoc con `@param`, `@returns` y al menos un `@example`.

---

## Definición de "done" para el sprint

El sprint 011 se considera completo cuando:
1. Todos los ítems de este checklist están marcados ✅.
2. `agente-qa` aprobó el PR con:
   - Todos los tests de backend y frontend pasan en verde.
   - `pnpm lint` sin errores en `apps/api` y `apps/web`.
3. Arquitectura hexagonal verificada: `domain/` y `application/` de `apelaciones` (y las extensiones de `certificacion`) sin imports de Express ni Prisma.
4. Las tres historias de usuario se ejecutan de punta a punta en el entorno local:
   - Un cliente ve la tarjeta de aceptación en una certificación `FIRMADA` y la acepta.
   - Un cliente presenta una apelación sobre un hallazgo puntual dentro del plazo y ve su estado `ABIERTA`.
   - Un auditor (distinto de quien firmó) resuelve la apelación como `ACEPTADA`, el hallazgo queda `ANULADO_POR_APELACION` y el `resultadoFinal` de la certificación se recalcula — sin errores en consola ni en la red.
5. Se verifica manualmente que un usuario que firmó una certificación **no puede** resolver apelaciones sobre esa misma certificación (bloqueo tanto en frontend como en backend).

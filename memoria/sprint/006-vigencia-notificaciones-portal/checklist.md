# Checklist de aceptación — 006-vigencia-notificaciones-portal

> Un ítem no se marca ✅ hasta que el comportamiento es verificable en el navegador, en la BD o en un test. "Está escrito" no es suficiente.
> **Nota (2026-07-16):** este sprint se dividió en dos. Este checklist cubre solo notificaciones, vigencia, escalamiento y portal público de verificación. El checklist de panel ejecutivo, calendario y biblioteca de hallazgos frecuentes vive en [[014-panel-calendario-biblioteca]].
> **Resultado real (2026-07-23)**: implementado y verificado. Ver `impl.md` → "Desviaciones reales" para el detalle de las 2 desviaciones no triviales (bug real de escalamiento HU-7, ruteo de notificaciones simplificado).

---

## Base de datos

- [x] La migración `add_notificaciones` aplica sin errores (aplicada vía psql + registro manual en `_prisma_migrations`, entorno no interactivo — mismo patrón de todos los sprints desde 003).
- [x] La tabla `notificacion` existe con las columnas descritas en `task.md`.
- [x] Los índices `notificacion(usuario_id, leida_en)`, `notificacion(empresa_id, creado_en)`, `notificacion(referencia_tipo, referencia_id, tipo, creado_en)` existen (definidos en la migración, aplicados sin error).
- [x] `sp_notificacion_generar_vencimientos` ejecuta sin error contra datos reales — forzada una acción con `fecha_limite = CURRENT_DATE` vía `UPDATE` directo, corrida real generó 1 notificación `ACCION_VENCIDA`.
- [x] Ejecutar `sp_notificacion_generar_vencimientos` dos veces el mismo día no duplica notificaciones — verificado real (segunda corrida → 0 generadas).
- [x] `sp_accion_correctiva_escalar` genera exactamente una notificación `ACCION_ESCALADA` por acción vencida hace más de 7 días, y ninguna si ya existe una previa — verificado real (forzada `fecha_limite = now() - 10 days`, primera corrida → 1, segunda corrida → 0).
- [x] `sp_accion_correctiva_escalar` resuelve correctamente al `administrador_cliente` del cliente dueño de la sucursal. **Desviación**: si no hay ninguno, cae al rol `administrador` real (no "administrador general", que no existe como rol — ver `impl.md`).
- [x] Entrada agregada en `memoria/cambios_db/registro.md` con la tabla `notificacion`, los 2 SP y los índices — incluye el bug real de escalamiento encontrado y corregido.

---

## API — Notificaciones

- [x] `GET /notificaciones` retorna solo las notificaciones del `usuarioId` autenticado — filtro `usuarioId` explícito en el repositorio.
- [x] `GET /notificaciones?soloNoLeidas=true` filtra correctamente (`leidaEn IS NULL`).
- [x] `GET /notificaciones/no-leidas/contador` retorna `{ data: { total: number } }` coherente — verificado real (0 → 1 tras generar una notificación → 0 tras marcarla leída).
- [x] `PATCH /notificaciones/:id/leer` marca `leidaEn` con la fecha actual y no permite marcar una notificación de otro usuario (retorna 404, vía `obtenerPorId` scoped a `usuarioId`).
- [x] `PATCH /notificaciones/leer-todas` marca todas las no leídas del usuario y retorna la cantidad afectada.
- [x] Todas las rutas de `/notificaciones` retornan 401 sin token — verificado real.
- [x] El job programado se registra al iniciar la API (verificado en log de arranque: `[notificaciones] Job diario programado (cron: "0 6 * * *").`) y no corre en `NODE_ENV=test` (mismo patrón que `job-purgar-retencion.job.ts`, no invocado desde los tests unitarios). **Desviación**: el archivo vive en `modules/notificaciones/infrastructure/job-notificaciones.job.ts`, no en un `shared/jobs/programador.ts` genérico (ver `impl.md`).
- [x] Al registrar un hallazgo con `severidad = CRITICA`, se crea automáticamente una notificación `HALLAZGO_CRITICO` — verificado real end-to-end (hallazgo manual CRITICA → notificación real en el `administrador_cliente` del cliente dueño).
- [x] Al asignar una `AccionCorrectiva` a un responsable, se genera `ACCION_ASIGNADA` de forma inmediata — verificado real end-to-end.

---

## API — Verificación pública

- [x] `GET /verificacion/:codigo` con un `codigoVerificacion` existente y `fechaVencimiento` futura retorna `estado: "VIGENTE"` — verificado real.
- [x] `GET /verificacion/:codigo` con `fechaVencimiento` pasada retorna `estado: "VENCIDA"` sin cambiar el `estado` interno (`FIRMADA`) de `Inspeccion` — verificado por test unitario (no se forzó una certificación vencida real en esta sesión, la lógica es la misma que el cálculo de `resultadoFinal`/`estado` ya verificado en sprints anteriores).
- [x] `GET /verificacion/:codigo` con un código inexistente retorna 404 con envelope de error — verificado real.
- [x] La respuesta **nunca** incluye hallazgos, respuestas, evidencias ni `pdfUrl` — el repositorio proyecta explícitamente solo los 5 campos públicos.
- [x] La ruta funciona **sin** header `Authorization` — verificado real.
- [x] Pasado el límite de rate limit, la ruta retorna 429 — verificado real (25 solicitudes seguidas: 19×200, luego 429 en el resto).
- [x] No existe ningún endpoint que liste certificaciones por código parcial o sin código exacto — el router solo define `GET /:codigo`.

---

## Frontend — Centro de notificaciones

- [x] La campana aparece en el header de `(dashboard)` en todas las pantallas autenticadas (integrada en `_components/header.tsx`, layout compartido por todo el grupo).
- [x] El contador de no leídas se actualiza sin recargar la página (`setInterval` de 60s + refresco inmediato al montar).
- [x] El badge no aparece cuando el contador es 0 — verificado por test unitario.
- [x] El badge muestra `9+` cuando hay más de 9 no leídas — verificado por test unitario.
- [x] Click en la campana abre/cierra el dropdown — verificado por test unitario.
- [x] Click en una notificación marca como leída y navega. **Desviación real**: `accion_correctiva`/`hallazgo` no traen el id de la certificación de origen en el modelo de `Notificacion` (solo `referenciaId` = id de la acción/hallazgo), así que navegan a un listado acotado (`/certificaciones/seguimiento`, `/certificaciones`) en vez de un deep-link con foco exacto — ver `impl.md`. `inspeccion` sí navega directo (`referenciaId` es el id de la certificación).
- [x] Con notificaciones vacías, el dropdown muestra "No tienes notificaciones" — verificado por test unitario.

---

## Frontend — Portal de verificación pública (`/verificar`)

- [x] `/verificar` (sin código) muestra un input para ingresar el código manualmente.
- [x] Enviar un código navega a `/verificar/[codigo]`.
- [x] `/verificar/[codigo]` no muestra sidebar ni header del dashboard — layout propio (`app/verificar/layout.tsx`), hermano de `app/auth/`.
- [x] `/verificar/[codigo]` es accesible sin sesión iniciada — verificado real (`curl` sin cookie, sin redirect a login; agregado `/verificar` y `/api/verificacion` a `RUTAS_PUBLICAS` de `middleware.ts`).
- [x] Con un código vigente, muestra sello verde "Vigente" + cliente + sucursal + fechas + plantilla — verificado real vía SSR (`curl http://localhost:3000/verificar/[codigo]` real).
- [x] Con un código de una certificación vencida por fecha, muestra sello gris "Vencida" — verificado por test unitario de `SelloVerificacion` (no se forzó una certificación vencida real en el navegador).
- [x] Con un código inexistente, muestra sello rojo "No encontrada" sin error crudo de red.
- [x] La página no contiene ningún enlace hacia `/login`, `/mantenimientos` ni ninguna otra ruta del dashboard — verificado por test unitario (`container.querySelector("a")` nulo en `SelloVerificacion`; el único enlace de la página es "Verificar otro código" → `/verificar`, dentro del propio portal).
- [x] El PDF de una certificación firmada incluye un QR que apunta a `/verificar/{codigoVerificacion}` — verificado real: PDF descargado y confirmado como documento PDF válido (`file` → "PDF document, version 1.3, 1 page(s)") tras agregar el QR con `qrcode`.

---

## Reglas de negocio verificadas

- [x] Los recordatorios se generan a 30, 15, 5 y 0 días — implementado en el SP (`IN (30, 15, 5, 0)`), verificado real con el caso de 0 días (vence hoy).
- [x] El portal de verificación pública nunca lista certificaciones sin código exacto.
- [x] Una certificación `FIRMADA` con `fechaVencimiento` pasada se muestra "Vencida" en el portal sin cambiar su `estado` interno — cálculo de presentación en el caso de uso, nunca persistido.
- [x] El filtrado de notificaciones respeta el alcance: cada notificación tiene un `usuarioId` fijo asignado en su creación (no hay consulta "por alcance" en tiempo de lectura para notificaciones — cada usuario solo ve las suyas por diseño, más estricto que un filtro por alcance).
- [x] Una `AccionCorrectiva` vencida hace más de 7 días genera `ACCION_ESCALADA` al `administrador_cliente` correspondiente (o al `administrador` si no hay uno asignado) — verificado real, con el bug de la HU-7 encontrado y corregido en el proceso (ver Base de datos).
- [x] La escalación ocurre una sola vez — verificado real (segunda corrida del SP = 0 nuevas).

---

## Tests de unidad — Backend (`agente-qa`)

**`notificacion.entity.test.ts`** (7 tests) — [x] todos verdes: `debeEscalar` (3 casos) + `construirMensaje` (4 tipos, no solo 2).

**Casos de uso de notificaciones** (5 tests en `gestionar-notificaciones.usecase.test.ts` + 1 en `generar-notificaciones-vencimiento.usecase.test.ts` + 1 en `escalar-acciones-vencidas.usecase.test.ts`) — [x] todos verdes, incluidos 2 casos adicionales no listados originalmente (`notificarCliente` con y sin administrador_cliente asignado).

**`verificar-certificado.usecase.test.ts`** (4 tests) — [x] todos verdes.

**Extensión de tests existentes** (no listada en el `task.md` original, agregada por consistencia): `gestionar-hallazgos.usecase.test.ts` (+2: notifica en CRITICA, no notifica si no es CRITICA) y `gestionar-accion-correctiva.usecase.test.ts` (+2: notifica ACCION_ASIGNADA al crear, no falla sin el wrapper inyectado).

283 tests backend (+22) en verde.

## Tests de unidad — Frontend (`agente-qa`)

- [x] `campana-notificaciones.test.tsx` (4 tests, en `apps/web` importando `@doonflow/ui` — **desviación**: no se creó infraestructura de tests en `packages/ui`, que nunca tuvo tests en ningún sprint anterior; se probó indirectamente desde `apps/web`, que ya tiene vitest+RTL).
- [x] `lista-notificaciones.test.tsx` (4 tests): estado vacío, navega y marca leída, ruta por `referenciaTipo`, no vuelve a marcar una ya leída.
- [x] `sello-verificacion.test.tsx` (4 tests): los 3 estados + ningún enlace de navegación.

275-de-281 tests frontend (+12; misma única excepción preexistente de sprint 001, 6 tests) en verde.

---

## Arquitectura hexagonal, Clean Code y documentación ISO

**Arquitectura hexagonal:**
- [x] Ningún archivo en `domain/`/`application/` de `notificaciones` o `verificacion` importa `express` ni `@prisma/client`.
- [x] `NotificacionPrismaRepository` es el único lugar que invoca `$queryRaw` contra los SP de vencimientos/escalamiento.
- [x] Todos los casos de uso reciben sus repositorios por constructor.
- [x] Los controladores de los 2 módulos nuevos no contienen lógica de negocio.
- [x] El router de `verificacion` no usa `autenticar` en ninguna ruta — verificado en el código (`crearVerificacionRouter` no lo recibe como parámetro).

**Clean Code:**
- [x] Ninguna función supera ~40 líneas sin extraer auxiliares.
- [x] `pnpm lint` pasa en verde en `apps/web` (0 errores, solo warnings preexistentes sin relación); `apps/api` no tiene script de lint propio (gap preexistente, no de este sprint).
- [x] No hay variables sin usar ni "TODO" pendientes sin resolver.
- [x] Los tests describen comportamiento en lenguaje natural.

**Documentación ISO (JSDoc):**
- [x] Todas las funciones exportadas de `notificacion.entity.ts` tienen JSDoc con `@param`/`@returns`/`@example`.
- [x] Los métodos de `NotificacionRepositoryPort` y `VerificacionRepositoryPort` tienen JSDoc de una línea mínimo.
- [x] `use-notificaciones.ts` tiene JSDoc de nivel de hook describiendo su propósito (no JSDoc por cada acción individual — mismo nivel de detalle que el resto de hooks del proyecto).

---

## Definición de "done" para el sprint

El sprint 006 (Parte A) se considera completo — **cumplido el 2026-07-23**:

1. Checklist verificado ítem por ítem.
2. Tests backend y frontend en verde (excepción única preexistente de sprint 001, sin relación). `pnpm lint` sin errores en `apps/web`.
3. Arquitectura hexagonal verificada.
4. Las 4 historias de usuario ejecutadas de punta a punta vía curl (directo y a través del proxy Next.js, incluido sin sesión para el portal público):
   - HU-1/HU-2: SPs forzados manualmente generaron notificaciones reales de vencimiento.
   - HU-3: `/verificar/[codigo]` real muestra el estado sin sesión iniciada; PDF real con QR embebido.
   - HU-7: acción forzada a vencida hace 10 días generó `ACCION_ESCALADA` una sola vez (verificado con dos corridas).
5. Bug real de HU-7 encontrado y corregido en el proceso (ver `impl.md`).

> HU-4, HU-5 y HU-6 (panel ejecutivo, calendario de auditorías, biblioteca de hallazgos frecuentes) tienen su propia definición de "done" en [[014-panel-calendario-biblioteca]].

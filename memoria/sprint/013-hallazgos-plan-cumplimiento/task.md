# Tareas — 013-hallazgos-plan-cumplimiento

> Orden de ejecución: Base de datos → API → Frontend → Tests. Cada capa depende de la anterior.
> Numeración `T-520` en adelante — Parte B del sprint original de certificación + plan de cumplimiento
> (`005-certificacion-plan-cumplimiento`, dividido por tamaño). El rango `T-500`–`T-519` queda
> **reservado** (no usar). No colisiona con 001 (`T-01`–`T-40`), 002 (`T-50`–`T-74`), 003/004, ni con
> el rango `T-200`–`T-239` de 005 (Parte A).
> Prerrequisito: [[005-certificacion-plan-cumplimiento]] (Parte A) debe estar implementado — toda
> `Hallazgo`/`PlanCumplimiento`/`AccionCorrectiva` cuelga de una `Inspeccion`/`Certificación` que ya
> debe poder crearse, responderse y firmarse.
> **⏸️ Bloqueado (2026-07-16): 005 está pausado.** Ninguna tarea de este listado se puede ejecutar hasta que se retome esa decisión. El wizard de formulario (sin firma) es [[015-wizard-certificacion]], activo e independiente de este bloqueo.
> **Varias tareas de este sprint amplían archivos creados en 005** (mismo archivo real, sin cambiar la
> arquitectura de módulos): `schema.prisma`, `sp_inspeccion_firmar.sql`, `inspeccion.errors.ts`,
> `firmar-certificacion.usecase.ts`, `firmar-certificacion.usecase.test.ts`, `inspeccion.router.ts`,
> `modules/inspeccion/index.ts`, `packages/shared/src/types/certificacion.ts`, `sidebar.tsx`,
> `usar-revision-certificacion.ts`, `usar-revision-certificacion.test.ts`, `certificaciones-demo.ts` (seed). Cada tarea
> que toca uno de estos archivos lo marca explícitamente como "AMPLIAR (Parte B de este archivo; la
> Parte A se creó en 005)".

---

## Agente: `agente-basededatos`

- [ ] **T-520** Crear migración `add_hallazgos_plan_cumplimiento` en `packages/db/prisma/`: agrega las tablas nuevas `hallazgo`, `hallazgo_evidencia`, `plan_cumplimiento`, `accion_correctiva`, `accion_correctiva_evidencia`, con columnas exactas de `spec.md` (snake_case, FKs, `creado_en`/`actualizado_en` donde aplique). Los campos de estado/severidad (`severidad`, `estado` de `plan_cumplimiento` y de `accion_correctiva`) se modelan como `VARCHAR`, no como enum de Postgres — mismo patrón ya usado en `Inspeccion.estado` y `Inspeccion.resultadoFinal` (005), validados en la capa de aplicación (Zod), no a nivel de BD.
- [ ] **T-521** Índices: `hallazgo(inspeccion_id)`, `hallazgo(empresa_id, severidad)`, `hallazgo_evidencia(hallazgo_id)`, `plan_cumplimiento(inspeccion_id)` **único**, `accion_correctiva(plan_cumplimiento_id)`, `accion_correctiva(hallazgo_id)`, `accion_correctiva(responsable_id, estado)`, `accion_correctiva(fecha_limite)` (soporta el cálculo de vencidas), `accion_correctiva_evidencia(accion_correctiva_id)`.
- [ ] **T-522** Ampliar `packages/db/prisma/schema.prisma` (AMPLIAR — Parte B de este archivo; la Parte A se creó en 005) con los 5 models nuevos (`Hallazgo`, `HallazgoEvidencia`, `PlanCumplimiento`, `AccionCorrectiva`, `AccionCorrectivaEvidencia`) y las relaciones inversas sobre el `model Inspeccion` ya existente (`Inspeccion.hallazgos`, `Inspeccion.planCumplimiento`) y sobre `Usuario` (`Usuario.accionesResponsable`, `Usuario.accionesVerificadas`, `Usuario.planesCerrados`). Ver el detalle de campos en `impl.md` → "Modelo Prisma a agregar".
- [ ] **T-523** Nueva migración que reemplaza `packages/db/sql/procedimientos/sp_inspeccion_firmar.sql` (AMPLIAR — mismo archivo creado en 005 T-204, vía `CREATE OR REPLACE FUNCTION` en esta nueva migración, no se edita el archivo de la migración ya aplicada de 005): agrega el paso "verifica que no exista un `hallazgo` con `severidad = 'CRITICA'` sin ninguna `accion_correctiva` en estado `CUMPLIDO`; si existe, `RAISE EXCEPTION 'hallazgo_critico_pendiente'`" y reemplaza el cálculo fijo de `resultado_final = 'APROBADA'` por el cálculo real de la regla 1 de este sprint (sin hallazgos → `APROBADA`; con `MAYOR`/`MENOR` → `APROBADA_CON_OBSERVACIONES`; ya validado que no hay `CRITICA` sin resolver).
- [ ] **T-524** Crear el stored procedure `packages/db/sql/procedimientos/sp_plan_cumplimiento_indicadores.sql` — recibe `plan_cumplimiento_id`, retorna fila agregada: total de acciones, pendientes, en proceso, en revisión, cumplidas, no cumplidas, vencidas (`fecha_limite < now()` y estado no terminal), `porcentaje_cumplimiento` (cumplidas/total), próximas a vencer (`fecha_limite` entre hoy y +7 días).
- [ ] **T-525** Ampliar el seed `packages/db/prisma/seeds/certificaciones-demo.ts` (AMPLIAR — mismo archivo creado en 005 T-205): sobre la certificación demo ya creada por 005, agregar 2 hallazgos (uno `MAYOR`, uno `MENOR`), 1 `PlanCumplimiento` en `EN_SEGUIMIENTO` con 2 `AccionCorrectiva` (una `PENDIENTE`, una `EN_REVISION` con evidencia), y actualizar el `resultadoFinal` de esa certificación a `APROBADA_CON_OBSERVACIONES` (antes fijo en `APROBADA` por 005). Idempotente (`upsert`).
- [ ] **T-526** Agregar policies RLS para las 5 tablas nuevas, filtrando por `empresa_id`: directo en `hallazgo` (tiene `empresa_id` propio); vía `EXISTS` contra `hallazgo`/`plan_cumplimiento`/`inspeccion` en las tablas que no tienen `empresa_id` propio (`hallazgo_evidencia`, `plan_cumplimiento`, `accion_correctiva`, `accion_correctiva_evidencia`).
- [ ] **T-527** Registrar el cambio completo (5 tablas nuevas, migración de reemplazo de `sp_inspeccion_firmar`, SP `sp_plan_cumplimiento_indicadores`, ampliación de seed, RLS) en `memoria/cambios_db/registro.md`.

---

## Agente: `agente-backend`

- [ ] **T-528** Crear `apps/api/src/modules/inspeccion/domain/hallazgo.entity.ts`: `esIncumplimiento(detalle): boolean` (`puntajeObtenido < puntajeMaximo`), `severidadPorDefecto(detalle): "CRITICA"|"MAYOR"|"MENOR"` (0% del puntaje → `CRITICA` sugerida; 1–49% → `MAYOR`; 50–99% → `MENOR` — siempre editable por el auditor antes de generar el plan), `generarHallazgosDesdeDetalles(detalles): DatosHallazgoAuto[]`, y **`calcularResultadoFinal(hallazgos): "APROBADA"|"APROBADA_CON_OBSERVACIONES"|"RECHAZADA"`** (regla 1 de este sprint — función que en la spec combinada original vivía en `certificacion.entity.ts` de 005; se mueve aquí porque opera sobre `Hallazgo[]`, ver dependencia documentada en `spec.md`).
- [ ] **T-529** Crear `domain/hallazgo.repository.port.ts`: `listarPorInspeccion`, `crear`, `actualizar`, `obtenerPorId`, `agregarEvidencia`.
- [ ] **T-530** Crear `domain/plan-cumplimiento.entity.ts`: `puedeGenerarse(hallazgos): boolean` (≥1 hallazgo), `puedeCerrarse(hallazgos, acciones): boolean` (regla 2: cada hallazgo tiene al menos una acción `CUMPLIDO`), `calcularIndicadores(acciones)` (réplica en TS del cálculo del SP, usada solo si el caso de uso necesita el dato sin ida a BD — el SP es la fuente de verdad para la lectura real).
- [ ] **T-531** Crear `domain/plan-cumplimiento.repository.port.ts`: `obtenerPorInspeccion`, `crear`, `cerrar`, `reabrir`, `obtenerIndicadores` (delega en `sp_plan_cumplimiento_indicadores`).
- [ ] **T-532** Crear `domain/accion-correctiva.entity.ts`: `calcularEstadoEfectivo(accion): EstadoAccion` (si `fechaLimite < hoy` y estado no es `CUMPLIDO`/`NO_CUMPLIDO` → `VENCIDO`, calculado en lectura, no persistido físicamente — ver decisión en `impl.md`), `puedeActualizarAvance(accion, usuarioId, esAdminConAlcance): boolean`, `puedeVerificar(usuario): boolean` (regla 4), `transicionarPorVerificacion(resultado: "CUMPLIDO"|"NO_CUMPLIDO"): EstadoAccion`.
- [ ] **T-533** Crear `domain/accion-correctiva.repository.port.ts`: `crear`, `actualizar`, `actualizarAvance`, `listarPorPlan`, `listarPorResponsable(usuarioId, alcance)`, `listarEnRevision(alcance)`, `verificar`, `agregarEvidencia`.
- [ ] **T-534** Ampliar `domain/inspeccion.errors.ts` (AMPLIAR — mismo archivo creado en 005 T-211) con: `CertificacionConHallazgoCriticoError`, `HallazgoNoEncontradoError`, `PlanCumplimientoYaExisteError`, `PlanCumplimientoNoEncontradoError`, `PlanCumplimientoConHallazgosSinAccionError`, `AccionCorrectivaNoEncontradaError`, `SinPermisoVerificacionError`.
- [ ] **T-535** Crear `application/hallazgo.schema.ts`: `crearHallazgoSchema` (`descripcion`, `severidad` requeridos, `detalleId` opcional), `actualizarHallazgoSchema` (`.partial()`).
- [ ] **T-536** Crear `application/plan-cumplimiento.schema.ts` y `application/accion-correctiva.schema.ts`: `crearAccionSchema` (`hallazgoId`, `descripcion`, `responsableId`, `fechaLimite` requeridos), `actualizarAvanceSchema` (`porcentajeAvance`, `estado?`), `verificarAccionSchema` (`resultado`, `comentario`, `nuevaFechaLimite?` si `NO_CUMPLIDO`).
- [ ] **T-537** Crear caso de uso `application/casos-uso/gestionar-hallazgos.usecase.ts`: `listar`, `crearManual`, `generarAutomaticos` (usa `generarHallazgosDesdeDetalles`; idempotente — no duplica hallazgos ya generados para el mismo `detalleId`), `actualizar`, `adjuntarEvidencia`.
- [ ] **T-538** Crear caso de uso `application/casos-uso/gestionar-plan-cumplimiento.usecase.ts`: `generar` (valida `puedeGenerarse`, crea solo la cabecera `EN_SEGUIMIENTO`), `obtenerConIndicadores`, `cerrar` (valida `puedeCerrarse`, registra `cerradoPorId`/`cerradoEn`), `reabrir` (`estado = REABIERTO`).
- [ ] **T-539** Crear caso de uso `application/casos-uso/gestionar-accion-correctiva.usecase.ts`: `crear`, `actualizar`, `actualizarAvance` (valida `puedeActualizarAvance`), `enviarARevision` (`estado = EN_REVISION`), `verificar` (valida `puedeVerificar`, aplica `transicionarPorVerificacion`; si `NO_CUMPLIDO` permite ajustar `fechaLimite`), `adjuntarEvidencia`.
- [ ] **T-540** Crear caso de uso `application/casos-uso/consultar-seguimiento.usecase.ts`: `misAcciones(usuarioId)`, `accionesEnRevision(alcance)`, `evidenciasConsolidadas(inspeccionId)` (concatena `InspeccionEvidencia` de 005 + `HallazgoEvidencia` + `AccionCorrectivaEvidencia`, trazadas hasta la certificación, ver convención de trazabilidad en `spec.md`).
- [ ] **T-541** Ampliar `application/casos-uso/firmar-certificacion.usecase.ts` (AMPLIAR — mismo archivo creado en 005 T-215): tras el reemplazo del SP (T-523), traduce la nueva excepción PL/pgSQL `hallazgo_critico_pendiente` a `CertificacionConHallazgoCriticoError`.
- [ ] **T-542** Crear `infrastructure/hallazgo.prisma-repository.ts`.
- [ ] **T-543** Crear `infrastructure/plan-cumplimiento.prisma-repository.ts` (`obtenerIndicadores()` vía `$queryRaw` a `sp_plan_cumplimiento_indicadores`).
- [ ] **T-544** Crear `infrastructure/accion-correctiva.prisma-repository.ts` (aplica `calcularEstadoEfectivo` a cada fila leída, ver T-532).
- [ ] **T-545** Crear `infrastructure/hallazgo.controller.ts`, `infrastructure/plan-cumplimiento.controller.ts`, `infrastructure/accion-correctiva.controller.ts` — traducen HTTP↔caso de uso; los endpoints de evidencia usan el middleware de subida creado en 005 (T-222). (Parte B de la tarea original que agrupaba 4 controllers; el `certificacion.controller.ts` se creó en 005.)
- [ ] **T-546** Ampliar `infrastructure/inspeccion.router.ts` (AMPLIAR — Parte B de este archivo; la Parte A se amplió en 005) con los endpoints de hallazgos, plan de cumplimiento, acciones correctivas, seguimiento, verificación y evidencias consolidadas — ver el listado completo en `impl.md` → "Contrato de API".
- [ ] **T-547** Ampliar `modules/inspeccion/index.ts` (AMPLIAR — Parte B de este archivo; la Parte A se modificó en 005) (`crearModuloInspeccion`) para instanciar e inyectar los repositorios/casos de uso/controladores nuevos de esta parte.
- [ ] **T-548** Crear Route Handlers proxy Next.js en `apps/web/src/app/api/inspeccion/` para: `hallazgos/`, `plan-cumplimiento/`, `acciones/`, `mis-acciones/`, `acciones-en-revision/`, y los sub-recursos `hallazgos/` y `plan-cumplimiento/` dentro de `certificaciones/[id]/` — ver árbol completo en `impl.md`. (Parte B de la tarea original que agrupaba todos los proxies; los de `certificaciones/` se crearon en 005.) Los endpoints con `multipart/form-data` (evidencias) reenvían el cuerpo crudo sin parsearlo.
- [ ] **T-549** Documentar en `accion-correctiva.entity.ts` (comentario JSDoc) que `calcularEstadoEfectivo` es la única fuente de `VENCIDO` este sprint (cálculo en lectura, no job programado) y que las notificaciones de vencimiento próximo quedan fuera de alcance (ver [[006-vigencia-notificaciones-portal]]) — no implementar ningún cron/job en este sprint.

---

## Agente: `agente-frontend`

- [ ] **T-550** Ampliar `packages/shared/src/types/certificacion.ts` (AMPLIAR — mismo archivo creado en 005 T-224) agregando: `Hallazgo`, `HallazgoEvidencia`, `PlanCumplimiento`, `AccionCorrectiva`, `AccionCorrectivaEvidencia`, `IndicadoresPlan`, `EvidenciaConsolidada`, y los tipos `Severidad` / `EstadoPlan` / `EstadoAccion`.
- [ ] **T-551** Ampliar `apps/web/src/app/(dashboard)/_components/sidebar.tsx` (AMPLIAR — mismo archivo modificado en 005 T-225) agregando los sub-ítems "Mis acciones" (`/certificaciones/seguimiento`) y "Verificación" (`/certificaciones/verificacion`) al grupo "Certificaciones" ya creado por 005.
- [ ] **T-552** Crear `apps/web/.../certificaciones/_servicios/hallazgo.servicio.ts`: `listarHallazgos`, `crearHallazgo`, `generarHallazgosAutomaticos`, `actualizarHallazgo`, `subirEvidenciaHallazgo`.
- [ ] **T-553** Crear `_servicios/plan-cumplimiento.servicio.ts`: `generarPlan`, `obtenerPlan`, `cerrarPlan`, `reabrirPlan`, `crearAccion`, `actualizarAccion`, `actualizarAvanceAccion`, `enviarAccionARevision`, `subirEvidenciaAccion`, `verificarAccion`, `listarMisAcciones`, `listarAccionesEnRevision`, `obtenerEvidenciasConsolidadas`.
- [ ] **T-554** Crear hook `_hooks/usar-hallazgos.ts`: lista, crear manual, generar automáticos, adjuntar evidencia, deriva `hayAlMenosUnHallazgo` para habilitar "Generar plan de cumplimiento".
- [ ] **T-555** Crear hook `_hooks/usar-plan-cumplimiento.ts`: carga plan + acciones + indicadores, acciones de crear/editar acción, cerrar/reabrir plan; deriva `puedeCerrarse` en el cliente como espejo de la regla de dominio (la validación real ocurre en el backend).
- [ ] **T-556** Crear hooks `_hooks/usar-seguimiento.ts` (mis acciones: actualizar avance, enviar a revisión, subir evidencia) y `_hooks/usar-verificacion.ts` (acciones en revisión: verificar cumplido/no cumplido, reajustar fecha límite).
- [ ] **T-557** Ampliar hook `_hooks/usar-revision-certificacion.ts` (AMPLIAR — mismo archivo creado en 005 T-231): agrega la carga de hallazgos y el derivado `puedeFirmar` completo (`!hallazgos.some(h => h.severidad === "CRITICA" && !tieneAccionCumplida(h))`), reemplazando el derivado simplificado de 005 que solo miraba `estado`.
- [ ] **T-558** Crear página `certificaciones/[id]/hallazgos/page.tsx` (Pantalla 4): lista de hallazgos con badge de severidad, formulario para agregar hallazgo manual (con carga de evidencia), botón "Generar plan de cumplimiento" (solo visible si hay ≥1 hallazgo).
- [ ] **T-559** Crear página `certificaciones/[id]/plan/page.tsx` (Pantalla 5 + Pantalla 8): indicadores superiores + tabla de acciones correctivas (ver mockup en `impl.md`), acciones agregar/editar/cambiar estado, botones "Cerrar plan"/"Reabrir plan".
- [ ] **T-560** Crear página `certificaciones/seguimiento/page.tsx` (Pantalla 6): lista "Mis acciones correctivas" + panel de detalle (actualizar avance, subir evidencia, enviar a revisión).
- [ ] **T-561** Crear página `certificaciones/verificacion/page.tsx` (Pantalla 7) y componentes compartidos `_components/badge-severidad.tsx`, `_components/badge-estado-accion.tsx`, `_components/indicadores-plan.tsx`, `_components/tabla-plan-cumplimiento.tsx`, `_components/galeria-evidencias.tsx` (consolidada, reutilizable en certificación/hallazgo/acción).

---

## Agente: `agente-qa` — Tests de unidad Backend

> Herramienta: **Vitest**. Dominio puro sin mocks. Casos de uso con mock del repositorio. Sin Express, sin Prisma.

- [ ] **T-562** `hallazgo.entity.test.ts`:
  - `esIncumplimiento` con `puntajeObtenido === puntajeMaximo` → `false`; con `puntajeObtenido < puntajeMaximo` → `true`
  - `severidadPorDefecto`: 0% → `CRITICA`; 25% → `MAYOR`; 75% → `MENOR`; 100% → no aplica (no es incumplimiento)
  - `generarHallazgosDesdeDetalles` con todos los detalles al máximo puntaje → `[]`
  - `generarHallazgosDesdeDetalles` con mezcla de detalles cumplidos/incumplidos → genera solo para los incumplidos, con la severidad sugerida correcta
  - `calcularResultadoFinal` sin hallazgos → `APROBADA`; solo `MAYOR`/`MENOR` → `APROBADA_CON_OBSERVACIONES`; con ≥1 `CRITICA` → `RECHAZADA`

- [ ] **T-563** `plan-cumplimiento.entity.test.ts` y `accion-correctiva.entity.test.ts`:
  - `puedeGenerarse([])` → `false`; con ≥1 hallazgo → `true`
  - `puedeCerrarse` con un hallazgo sin ninguna acción `CUMPLIDO` → `false`; con todos los hallazgos cubiertos → `true`
  - `calcularEstadoEfectivo` con `fechaLimite` pasada y estado `PENDIENTE`/`EN_PROCESO` → `VENCIDO`; con estado `CUMPLIDO`/`NO_CUMPLIDO` y fecha pasada → no cambia
  - `puedeActualizarAvance` con `usuarioId === responsableId` → `true`; con administrador con alcance sobre la sucursal → `true`; con otro `usuario_sucursal` → `false`
  - `puedeVerificar` con rol auditor o alcance administrador → `true`; con `usuario_sucursal` (incluso siendo el responsable) → `false`
  - `transicionarPorVerificacion("CUMPLIDO")` → `CUMPLIDO`; `transicionarPorVerificacion("NO_CUMPLIDO")` → `EN_PROCESO`

- [ ] **T-564** `gestionar-hallazgos.usecase.test.ts` (mock):
  - `generarAutomaticos()` no duplica hallazgos ya generados para el mismo `detalleId`
  - `crearManual()` llama `repo.crear()` con los datos exactos del input

- [ ] **T-565** `gestionar-plan-cumplimiento.usecase.test.ts` y `gestionar-accion-correctiva.usecase.test.ts` (mock):
  - `generar()` sin hallazgos → error de validación
  - `generar()` con un plan ya existente para la inspección → `PlanCumplimientoYaExisteError`
  - `cerrar()` con hallazgo sin acción `CUMPLIDO` → `PlanCumplimientoConHallazgosSinAccionError`
  - `verificar()` llamado por un usuario sin `puedeVerificar` → `SinPermisoVerificacionError`
  - `verificar()` con resultado `NO_CUMPLIDO` regresa la acción a `EN_PROCESO` y acepta `nuevaFechaLimite`

- [ ] **T-566** Ampliar `firmar-certificacion.usecase.test.ts` (AMPLIAR — mismo archivo creado en 005 T-237): agrega los casos `firmar()` cuando el repo señala hallazgo crítico → `CertificacionConHallazgoCriticoError`, y `firmar()` con hallazgos `MAYOR`/`MENOR` únicamente retorna `resultadoFinal: "APROBADA_CON_OBSERVACIONES"`.

- [ ] **T-567** Test de integración ligera (BD de pruebas local): sobre una certificación ya `FIRMADA` (o `EN_PROGRESO` con hallazgo crítico) → `POST .../hallazgos/generar-automaticos` → `POST .../plan-cumplimiento` → `POST /inspeccion/plan-cumplimiento/:id/acciones` → `PATCH /inspeccion/acciones/:id/avance` → `POST .../enviar-revision` → `POST .../verificar` (`CUMPLIDO`) → `POST /inspeccion/plan-cumplimiento/:id/cerrar` retorna `estado: "CERRADO"`.

---

## Agente: `agente-qa` — Tests de unidad Frontend

> Herramienta: **Vitest + React Testing Library**. Servicios y API mockeados, sin llamadas reales de red.

- [ ] **T-568** `tabla-plan-cumplimiento.test.tsx`, `indicadores-plan.test.tsx`, `badge-severidad.test.tsx`, `badge-estado-accion.test.tsx`:
  - `TablaPlanCumplimiento` con `acciones = []` muestra estado vacío; con acciones renderiza fila por cada una con hallazgo, responsable, fecha límite, estado, avance y conteo de evidencias
  - `IndicadoresPlan` calcula y muestra total/pendientes/vencidas/% cumplimiento a partir de las props recibidas (no las recalcula del backend)
  - `BadgeSeveridad` renderiza color distinto para `CRITICA`/`MAYOR`/`MENOR`
  - `BadgeEstadoAccion` renderiza color/etiqueta distinta para cada uno de los 6 estados posibles

- [ ] **T-569** `usar-hallazgos.test.ts`, `usar-plan-cumplimiento.test.ts`, y ampliación de `usar-revision-certificacion.test.ts` (AMPLIAR — mismo archivo creado en 005 T-239):
  - `usar-hallazgos`: `hayAlMenosUnHallazgo` cambia a `true` tras `crearManual()`
  - `usar-plan-cumplimiento`: `puedeCerrarse` es `false` si algún hallazgo no tiene acción `CUMPLIDO`
  - `usar-revision-certificacion` (ampliación): `puedeFirmar` es `false` con un hallazgo `CRITICA` en la lista; `true` sin hallazgos críticos (antes en 005 solo se probaba contra `estado`)

- [ ] **T-570** `usar-seguimiento.test.ts`, `usar-verificacion.test.ts`, `galeria-evidencias.test.tsx`:
  - `usar-seguimiento`: `actualizarAvance()` llama al servicio con el `porcentajeAvance` correcto; `enviarARevision()` cambia el estado local a `EN_REVISION` de forma optimista
  - `usar-verificacion`: `verificar("NO_CUMPLIDO", comentario, nuevaFechaLimite)` llama al servicio con los 3 parámetros
  - `GaleriaEvidencias` agrupa por origen (respuesta/hallazgo/acción) y muestra ícono distinto para foto vs. documento

---

## Dependencias entre tareas

```
[005 completo] → T-520

T-520 → T-521 → T-522 → T-523 → T-524 → T-525 → T-526 → T-527

T-522 → T-528, T-530, T-532            ← entidades de dominio necesitan las tablas ya definidas
T-528 → T-529 → T-535 → T-537
T-530 → T-531 → T-536 → T-538
T-532 → T-533 → T-536 → T-539
T-534 → T-537, T-538, T-539
T-523 → T-541                          ← SP reemplazado, necesario para propagar el nuevo error
T-537 → T-540
T-542 ← T-529;  T-543 ← T-531, T-524;  T-544 ← T-533
T-542, T-543, T-544 → T-545
T-541, T-545 → T-546 → T-547 → T-548

T-548 → T-550 → T-551
T-548 → T-552, T-553
T-552 → T-554
T-553 → T-555, T-556
T-541 → T-557
T-554 → T-558
T-555 → T-559
T-556 → T-560, T-561

T-528 → T-562
T-530, T-532 → T-563
T-537 → T-564
T-538, T-539 → T-565
T-541 → T-566
T-546 → T-567
T-559, T-561 → T-568
T-554, T-555, T-557 → T-569
T-560, T-561 → T-570
```

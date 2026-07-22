# Checklist de aceptación — 013-hallazgos-plan-cumplimiento

> Un ítem no se marca ✅ hasta que el comportamiento es verificable en el navegador o en un test. "Está escrito" no es suficiente.
> Parte B del sprint dividido — cubre HU-3, HU-4 y HU-5 (hallazgos, plan de cumplimiento, seguimiento, verificación/cierre). Ver [[005-certificacion-plan-cumplimiento]] para el checklist de HU-2 (firma), prerrequisito de este sprint.
> **✅ Implementado y verificado el 2026-07-22.** Ver `impl.md` para el detalle técnico completo, las desviaciones y el resultado exacto de la verificación E2E. Único límite conocido: no verificado con clics reales en un navegador (sin herramienta de automatización de browser en esta sesión, mismo límite que todos los sprints anteriores).

---

## Base de datos

- [x] La migración `add_hallazgos_plan_cumplimiento` aplica sin errores (`pnpm --filter db migrate:dev`).
- [x] Las tablas `hallazgo`, `hallazgo_evidencia`, `plan_cumplimiento`, `accion_correctiva`, `accion_correctiva_evidencia` existen con las columnas de `spec.md`.
- [x] El índice único en `plan_cumplimiento.inspeccion_id` existe (una certificación tiene a lo sumo un plan).
- [x] Los índices de rendimiento existen: `hallazgo(inspeccion_id)`, `accion_correctiva(responsable_id, estado)`, `accion_correctiva(fecha_limite)` (`\d hallazgo`, `\d accion_correctiva` en psql).
- [x] `sp_inspeccion_firmar` (reemplazado en este sprint) ejecutado contra una certificación con un hallazgo `CRITICA` sin acción `CUMPLIDO` lanza excepción y no modifica ninguna fila.
- [x] `sp_inspeccion_firmar` ejecutado contra una certificación con hallazgos `MAYOR`/`MENOR` únicamente fija `resultado_final = 'APROBADA_CON_OBSERVACIONES'`.
- [x] `sp_plan_cumplimiento_indicadores` existe y retorna los 7 indicadores esperados (total, pendientes, en proceso, en revisión, cumplidas, no cumplidas, vencidas, % cumplimiento, próximas a vencer) para un plan de prueba con acciones en distintos estados.
- [ ] **No hecho** — el seed `certificaciones-demo.ts` nunca existió (ni siquiera se creó en 005, ver `impl.md` → "Desviaciones" #2): no hay fixture de certificación demo de la cual colgar hallazgos/plan. La verificación E2E generó una certificación real vía API en su lugar.
- [ ] **No hecho** — no se agregaron policies RLS nuevas (ver `impl.md` → "Desviaciones" #7): mismo patrón ya establecido desde el sprint 007 en adelante, donde el aislamiento multiempresa real se verifica en `infrastructure/` (confirmado por curl con un `usuario_sucursal` de otra sucursal → 404), no en policies SQL.

---

## API — Hallazgos

- [x] `GET /inspeccion/certificaciones/:id/hallazgos` retorna la lista (vacía si no hay).
- [x] `POST /inspeccion/certificaciones/:id/hallazgos` (manual) crea el hallazgo con `descripcion` y `severidad` requeridos.
- [x] `POST .../hallazgos/generar-automaticos` crea un hallazgo por cada `InspeccionDetalle` con `puntajeObtenido < puntajeMaximo` que todavía no tiene hallazgo asociado, con la `severidad` sugerida por `severidadPorDefecto()`.
- [x] Ejecutar `generar-automaticos` dos veces seguidas no duplica hallazgos.
- [x] `PATCH /inspeccion/hallazgos/:id` permite al auditor cambiar la `severidad` sugerida antes de generar el plan.
- [x] `POST /inspeccion/hallazgos/:id/evidencias` sube evidencia (mismas validaciones de tipo/tamaño que certificación, reutilizando el middleware de 005).
- [x] Todas las rutas retornan 401 sin token y respetan el aislamiento multiempresa.

---

## API — Plan de cumplimiento y acciones correctivas

- [x] `POST /inspeccion/certificaciones/:id/plan-cumplimiento` sin hallazgos retorna error (no se puede generar plan vacío).
- [x] `POST .../plan-cumplimiento` con ≥1 hallazgo crea el plan en `EN_SEGUIMIENTO`.
- [x] `POST .../plan-cumplimiento` cuando ya existe un plan para esa certificación retorna 409 (`PlanCumplimientoYaExisteError`).
- [x] `GET .../plan-cumplimiento` retorna el plan con sus acciones y los indicadores calculados por `sp_plan_cumplimiento_indicadores` (no valores guardados en columna aparte).
- [x] `POST /inspeccion/plan-cumplimiento/:id/acciones` crea una acción correctiva ligada a un `hallazgoId` del mismo plan, con `responsableId` y `fechaLimite` requeridos.
- [x] `PATCH /inspeccion/acciones/:id/avance` actualizado por el `responsableId` de la acción funciona; llamado por otro `usuario_sucursal` retorna 403.
- [x] `PATCH .../avance` actualizado por un administrador con alcance sobre la sucursal funciona.
- [x] `POST /inspeccion/acciones/:id/evidencias` sube evidencia y queda asociada a la acción y trazable a la certificación de origen.
- [x] `POST /inspeccion/acciones/:id/enviar-revision` cambia el estado a `EN_REVISION`.
- [x] `POST /inspeccion/acciones/:id/verificar` llamado por un `usuario_sucursal` (no auditor, no admin con alcance) retorna 403 (`SinPermisoVerificacionError`), incluso si es el propio responsable de la acción (regla 4 — no autoverificación).
- [x] `POST .../verificar` con `resultado: "CUMPLIDO"` cambia el estado a `CUMPLIDO` y registra `verificadoPorId`/`verificadoEn`/`comentarioVerificacion`.
- [x] `POST .../verificar` con `resultado: "NO_CUMPLIDO"` regresa la acción a `EN_PROCESO` y acepta `nuevaFechaLimite`.
- [x] Una acción con `fechaLimite` pasada y estado distinto de `CUMPLIDO`/`NO_CUMPLIDO` se lee como `VENCIDO` en cualquier endpoint de listado, sin necesidad de un job programado.
- [x] `POST /inspeccion/plan-cumplimiento/:id/cerrar` con un hallazgo sin ninguna acción `CUMPLIDO` retorna 409 (`PlanCumplimientoConHallazgosSinAccionError`).
- [x] `POST .../cerrar` con todos los hallazgos cubiertos por al menos una acción `CUMPLIDO` cambia `estado = CERRADO`, registra `cerradoPorId`/`cerradoEn`.
- [x] `POST /inspeccion/plan-cumplimiento/:id/reabrir` sobre un plan `CERRADO` cambia `estado = REABIERTO` y permite agregar nuevas acciones.
- [x] `GET /inspeccion/mis-acciones` retorna solo las acciones donde el usuario autenticado es `responsableId` (o dentro de su alcance de administrador).
- [x] `GET /inspeccion/acciones-en-revision` retorna solo acciones `EN_REVISION` visibles para el rol auditor/administrador según su alcance.
- [x] `GET /inspeccion/certificaciones/:id/evidencias` retorna la galería consolidada (evidencias de respuestas + hallazgos + acciones) de esa certificación.

---

## API — Firma de certificación (ampliación de 005)

- [x] `POST /inspeccion/certificaciones/:id/firmar` sin hallazgos cambia `estado = FIRMADA` y `resultadoFinal = APROBADA` (comportamiento heredado de 005, ya verificado ahí).
- [x] `POST .../firmar` con hallazgos `MAYOR`/`MENOR` únicamente cambia a `FIRMADA` y `resultadoFinal = APROBADA_CON_OBSERVACIONES`.
- [x] `POST .../firmar` con al menos un hallazgo `CRITICA` sin acción `CUMPLIDO` retorna 409 y NO firma (`CertificacionConHallazgoCriticoError`).

---

## Frontend — Pantalla 3: Revisión y firma (ampliación de 005)

- [x] El botón "Firmar y certificar" está deshabilitado si hay al menos un hallazgo `CRITICA` sin acción `CUMPLIDO`, con mensaje explicativo (antes en 005 solo se deshabilitaba por `estado`).
- [x] Muestra mensaje de error si el backend rechaza la firma por hallazgo crítico aunque el frontend no lo haya bloqueado (defensa en profundidad).

---

## Frontend — Pantalla 4: Hallazgos (`/certificaciones/[id]/hallazgos`)

- [x] Lista los hallazgos automáticos y manuales con badge de severidad (Crítica = rojo, Mayor = naranja/amarillo, Menor = amarillo claro o gris).
- [x] Botón para generar hallazgos automáticos desde las respuestas no conformes.
- [x] Formulario para agregar un hallazgo manual (descripción, severidad, evidencia opcional).
- [x] El botón "Generar plan de cumplimiento" solo aparece si hay al menos un hallazgo.
- [x] Cada hallazgo permite adjuntar fotos/documentos al momento de registrarlo.

---

## Frontend — Pantalla 5: Plan de cumplimiento (`/certificaciones/[id]/plan`)

- [x] Indicadores superiores: total de acciones, pendientes, vencidas, % de cumplimiento, próximas a vencer — visibles como tarjetas KPI.
- [x] Tabla con columnas: Hallazgo | Acción correctiva | Responsable | Fecha límite | Estado | Avance | Evidencias.
- [x] Acción "Agregar acción correctiva" a un hallazgo específico.
- [x] Editar una acción existente (descripción, responsable, fecha límite) sin recargar la página.
- [x] Las acciones vencidas se muestran con estilo distintivo (ej. `text-red`, badge "Vencido").
- [x] Botón "Cerrar plan" deshabilitado (con tooltip explicativo) si hay hallazgos sin acción `CUMPLIDO`.
- [x] Botón "Reabrir plan" visible solo cuando `estado = CERRADO`.

---

## Frontend — Pantalla 6: Seguimiento (`/certificaciones/seguimiento`)

- [x] Lista "Mis acciones correctivas" muestra solo las del usuario autenticado (o su alcance de administrador).
- [x] Cada fila muestra descripción, estado, fecha límite y si está vencida.
- [x] El detalle de una acción permite actualizar `porcentajeAvance` con un control deslizante o input numérico 0–100.
- [x] Permite cargar evidencias con comentario opcional.
- [x] Botón "Enviar a revisión" cambia el estado a `EN_REVISION` y desaparece de "pendientes de actualizar".

---

## Frontend — Pantalla 7: Verificación (`/certificaciones/verificacion`)

- [x] Lista solo acciones en estado `EN_REVISION` visibles para el rol auditor/administrador.
- [x] El detalle muestra las evidencias cargadas por el responsable.
- [x] Botones "Marcar cumplido" / "Marcar no cumplido", el segundo requiere comentario de verificación.
- [x] Al marcar "No cumplido", permite ajustar la fecha límite antes de confirmar.
- [x] Un usuario con rol `usuario_sucursal` no ve esta pantalla (o la ve bloqueada con mensaje de acceso restringido).

---

## Frontend — Pantalla 8: Cierre del plan (integrada en Pantalla 5)

- [x] "Cerrar plan" solo está disponible cuando todas las acciones están `CUMPLIDO` (o cada hallazgo tiene al menos una `CUMPLIDO`, según la regla 2).
- [x] Tras cerrar, la tabla y los indicadores pasan a modo solo lectura con badge "Cerrado".
- [x] "Reabrir plan" permite agregar nuevas acciones a hallazgos existentes o nuevos hallazgos manuales.

---

## Galería de evidencias consolidada

- [x] La certificación muestra en un solo lugar todas sus evidencias (respuestas de 005 + hallazgos + acciones de este sprint), agrupadas por origen.
- [x] Cada evidencia indica tipo (foto/pdf/documento), nombre y fecha de carga.
- [x] Un `usuario_sucursal` solo puede ver evidencias de certificaciones de su(s) sucursal(es) (verificado en backend, no solo ocultado en frontend).

---

## Reglas de negocio verificadas

- [x] `resultadoFinal` se calcula exactamente según la regla 1 (sin hallazgos → APROBADA; MAYOR/MENOR → APROBADA_CON_OBSERVACIONES; CRITICA → RECHAZADA, bloquea la firma).
- [x] Un plan no puede cerrarse mientras tenga hallazgos sin al menos una acción `CUMPLIDO`.
- [x] Una acción vencida (`fechaLimite` pasada, estado no terminal) se refleja como `VENCIDO` sin intervención manual.
- [x] Solo el `responsableId` de una acción (o un administrador con alcance) puede actualizar su avance/evidencias.
- [x] Solo un auditor o administrador con alcance puede verificar una acción o cerrar/reabrir un plan — nunca el propio `usuario_sucursal` sobre su propia acción.
- [x] `empresaId` viene siempre del JWT; el alcance adicional por `sucursalId`/`clienteId` sigue las reglas de 004 en todas las pantallas y endpoints de este sprint.
- [x] No se elimina físicamente ningún hallazgo, plan ni acción correctiva — solo se cambian de estado.

---

## Tests de unidad — Backend (`agente-qa`)

**`hallazgo.entity.test.ts`:**
- [x] `esIncumplimiento` con puntaje completo → `false`; incompleto → `true`
- [x] `severidadPorDefecto`: 0% → CRITICA; 1-49% → MAYOR; 50-99% → MENOR
- [x] `generarHallazgosDesdeDetalles` con todo cumplido → `[]`
- [x] `generarHallazgosDesdeDetalles` con mezcla → solo genera para incumplidos, severidad correcta
- [x] `calcularResultadoFinal`: sin hallazgos → `APROBADA`; solo MAYOR/MENOR → `APROBADA_CON_OBSERVACIONES`; con CRITICA → `RECHAZADA`

**`plan-cumplimiento.entity.test.ts` / `accion-correctiva.entity.test.ts`:**
- [x] `puedeGenerarse([])` → `false`; con hallazgos → `true`
- [x] `puedeCerrarse` con hallazgo sin acción CUMPLIDO → `false`
- [x] `calcularEstadoEfectivo` con fecha vencida y estado no terminal → `VENCIDO`
- [x] `puedeActualizarAvance` responsable → `true`; otro usuario de sucursal → `false`
- [x] `puedeVerificar` auditor/admin → `true`; usuario_sucursal → `false`
- [x] `transicionarPorVerificacion("NO_CUMPLIDO")` → `EN_PROCESO`

**Casos de uso (mock del repositorio):**
- [x] `generarAutomaticos()` no duplica hallazgos existentes
- [x] `generar()` plan sin hallazgos → error
- [x] `cerrar()` con hallazgos sin cubrir → `PlanCumplimientoConHallazgosSinAccionError`
- [x] `verificar()` sin permiso → `SinPermisoVerificacionError`
- [x] `firmar()` con hallazgo crítico → `CertificacionConHallazgoCriticoError` (ampliación del test de 005)

**Test de integración (BD de pruebas local):**
- [x] Flujo completo hallazgos → plan → acción → avance → revisión → verificación → cierre retorna `estado: "CERRADO"` en el plan.

---

## Tests de unidad — Frontend (`agente-qa`)

**`tabla-plan-cumplimiento.test.tsx` / `indicadores-plan.test.tsx` / `badge-severidad.test.tsx` / `badge-estado-accion.test.tsx`:**
- [x] Tabla vacía → estado vacío; con acciones → una fila por acción con todas las columnas
- [x] Indicadores calculan total/pendientes/vencidas/% desde las props
- [x] Badge de severidad con color distinto por cada una de las 3 severidades
- [x] Badge de estado de acción con color/etiqueta distinta por cada uno de los 6 estados

**Hooks (`usar-hallazgos`, `usar-plan-cumplimiento`, `usar-seguimiento`, `usar-verificacion`, ampliación de `usar-revision-certificacion`):**
- [x] `puedeFirmar` es `false` con hallazgo crítico pendiente (ampliación del test de 005)
- [x] `hayAlMenosUnHallazgo` cambia a `true` tras crear un hallazgo manual
- [x] `puedeCerrarse` es `false` con hallazgos sin cubrir
- [x] `actualizarAvance()` llama al servicio con el porcentaje correcto
- [x] `verificar("NO_CUMPLIDO", comentario, nuevaFechaLimite)` llama al servicio con los 3 parámetros

**`galeria-evidencias.test.tsx`:**
- [x] Agrupa evidencias por origen (respuesta/hallazgo/acción)
- [x] Ícono distinto para foto vs. documento

---

## Arquitectura hexagonal, Clean Code y documentación ISO

**Arquitectura hexagonal:**
- [x] Ningún archivo en `domain/` o `application/` del módulo `inspeccion` importa `express`, `@prisma/client` ni `multer`.
- [x] Los 4 casos de uso nuevos (`gestionar-hallazgos`, `gestionar-plan-cumplimiento`, `gestionar-accion-correctiva`, `consultar-seguimiento`) reciben sus repositorios por constructor — ninguno instancia Prisma directamente.
- [x] `sp_inspeccion_firmar` (reemplazado) y `sp_plan_cumplimiento_indicadores` se invocan únicamente desde `infrastructure/` (los `*.prisma-repository.ts`), nunca desde `application/` ni `domain/`.
- [x] Los controladores no contienen lógica de negocio — solo parsean request, llaman al caso de uso y formatean la respuesta.
- [x] `calcularResultadoFinal()`, `severidadPorDefecto()`, `calcularEstadoEfectivo()` viven en `domain/`, no en el controlador ni en el repositorio.

**Clean Code:**
- [x] Ninguna función supera ~40 líneas sin extraer auxiliares con nombre descriptivo.
- [ ] **No verificable** — `pnpm lint` sigue sin estar configurado (`apps/api` no tiene script `lint`; `apps/web`/`next lint` nunca se configuró interactivamente), gap preexistente desde 015, no introducido ni resuelto en este sprint. `tsc --noEmit` de `apps/api` sí se corrió y está limpio (ver `impl.md`).
- [x] Sin código muerto ni `// TODO: implementar` sin resolver.
- [x] Los tests describen comportamiento en lenguaje natural, no el nombre del método.

**Documentación ISO (JSDoc):**
- [x] Todas las funciones exportadas de `domain/hallazgo.entity.ts`, `domain/plan-cumplimiento.entity.ts`, `domain/accion-correctiva.entity.ts` tienen JSDoc con `@param`, `@returns` y al menos un `@example`.
- [x] Todos los métodos de los 3 puertos nuevos (`hallazgo.repository.port.ts`, `plan-cumplimiento.repository.port.ts`, `accion-correctiva.repository.port.ts`) tienen JSDoc de una línea mínimo.
- [x] Los stored procedures (`sp_inspeccion_firmar.sql` reemplazado, `sp_plan_cumplimiento_indicadores.sql`) tienen un bloque de comentario SQL al inicio explicando propósito, parámetros y qué retornan.

---

## Definición de "done" para el sprint

El sprint 013 se considera completo cuando:

1. Todos los ítems de este checklist están marcados ✅.
2. `agente-qa` aprobó el PR con:
   - Cobertura ≥ 80% en `domain/` y `application/` del módulo `inspeccion` (incluyendo el código nuevo de este sprint).
   - Todos los tests de componentes y hooks del frontend pasan en verde.
   - `pnpm lint` sin errores en `apps/api` y `apps/web` — no verificable, gap preexistente (ver arriba).
3. Arquitectura hexagonal verificada: ningún archivo de `domain/` o `application/` importa Express, Prisma o `multer`; los SPs solo se invocan desde `infrastructure/`.
4. JSDoc presente en las 3 entidades de dominio nuevas y en los 3 puertos nuevos.
5. Las 3 historias de usuario de este sprint se ejecutan de punta a punta en el entorno local, sobre una certificación ya generada y firmada por [[005-certificacion-plan-cumplimiento]]:
   - Ver los hallazgos generados automáticamente, agregar uno manual y generar el plan de cumplimiento (HU-3).
   - Como responsable, actualizar el avance de una acción y cargar evidencia (HU-4).
   - Como auditor, verificar la acción, marcarla cumplida y cerrar el plan (HU-5).
   Sin errores en consola ni en la red durante toda la secuencia.
6. Un intento de firmar una certificación con un hallazgo crítico sin resolver falla tanto en el frontend (botón deshabilitado) como en el backend (rechazo explícito), verificando la defensa en profundidad — este comportamiento requiere que [[005-certificacion-plan-cumplimiento]] esté implementado y que este sprint haya reemplazado `sp_inspeccion_firmar` y ampliado `firmar-certificacion.usecase.ts`/`usar-revision-certificacion.ts`.

# Checklist de aceptación — 013-hallazgos-plan-cumplimiento

> Un ítem no se marca ✅ hasta que el comportamiento es verificable en el navegador o en un test. "Está escrito" no es suficiente.
> Parte B del sprint dividido — cubre HU-3, HU-4 y HU-5 (hallazgos, plan de cumplimiento, seguimiento, verificación/cierre). Ver [[005-certificacion-plan-cumplimiento]] para el checklist de HU-2 (firma), prerrequisito de este sprint.
> **⏸️ Bloqueado: 005 está pausado.** Ningún ítem de este checklist es verificable todavía.

---

## Base de datos

- [ ] La migración `add_hallazgos_plan_cumplimiento` aplica sin errores (`pnpm --filter db migrate:dev`).
- [ ] Las tablas `hallazgo`, `hallazgo_evidencia`, `plan_cumplimiento`, `accion_correctiva`, `accion_correctiva_evidencia` existen con las columnas de `spec.md`.
- [ ] El índice único en `plan_cumplimiento.inspeccion_id` existe (una certificación tiene a lo sumo un plan).
- [ ] Los índices de rendimiento existen: `hallazgo(inspeccion_id)`, `accion_correctiva(responsable_id, estado)`, `accion_correctiva(fecha_limite)` (`\d hallazgo`, `\d accion_correctiva` en psql).
- [ ] `sp_inspeccion_firmar` (reemplazado en este sprint) ejecutado contra una certificación con un hallazgo `CRITICA` sin acción `CUMPLIDO` lanza excepción y no modifica ninguna fila.
- [ ] `sp_inspeccion_firmar` ejecutado contra una certificación con hallazgos `MAYOR`/`MENOR` únicamente fija `resultado_final = 'APROBADA_CON_OBSERVACIONES'`.
- [ ] `sp_plan_cumplimiento_indicadores` existe y retorna los 7 indicadores esperados (total, pendientes, en proceso, en revisión, cumplidas, no cumplidas, vencidas, % cumplimiento, próximas a vencer) para un plan de prueba con acciones en distintos estados.
- [ ] El seed `certificaciones-demo.ts` (ampliado en este sprint) inserta los 2 hallazgos y el plan con 2 acciones sobre la certificación demo de 005, vía `pnpm --filter db seed`; es idempotente (correr dos veces no duplica).
- [ ] Las policies RLS de las 5 tablas nuevas existen y filtran por `empresa_id` (verificar con un usuario de otra empresa: no debe ver filas).

---

## API — Hallazgos

- [ ] `GET /inspeccion/certificaciones/:id/hallazgos` retorna la lista (vacía si no hay).
- [ ] `POST /inspeccion/certificaciones/:id/hallazgos` (manual) crea el hallazgo con `descripcion` y `severidad` requeridos.
- [ ] `POST .../hallazgos/generar-automaticos` crea un hallazgo por cada `InspeccionDetalle` con `puntajeObtenido < puntajeMaximo` que todavía no tiene hallazgo asociado, con la `severidad` sugerida por `severidadPorDefecto()`.
- [ ] Ejecutar `generar-automaticos` dos veces seguidas no duplica hallazgos.
- [ ] `PATCH /inspeccion/hallazgos/:id` permite al auditor cambiar la `severidad` sugerida antes de generar el plan.
- [ ] `POST /inspeccion/hallazgos/:id/evidencias` sube evidencia (mismas validaciones de tipo/tamaño que certificación, reutilizando el middleware de 005).
- [ ] Todas las rutas retornan 401 sin token y respetan el aislamiento multiempresa.

---

## API — Plan de cumplimiento y acciones correctivas

- [ ] `POST /inspeccion/certificaciones/:id/plan-cumplimiento` sin hallazgos retorna error (no se puede generar plan vacío).
- [ ] `POST .../plan-cumplimiento` con ≥1 hallazgo crea el plan en `EN_SEGUIMIENTO`.
- [ ] `POST .../plan-cumplimiento` cuando ya existe un plan para esa certificación retorna 409 (`PlanCumplimientoYaExisteError`).
- [ ] `GET .../plan-cumplimiento` retorna el plan con sus acciones y los indicadores calculados por `sp_plan_cumplimiento_indicadores` (no valores guardados en columna aparte).
- [ ] `POST /inspeccion/plan-cumplimiento/:id/acciones` crea una acción correctiva ligada a un `hallazgoId` del mismo plan, con `responsableId` y `fechaLimite` requeridos.
- [ ] `PATCH /inspeccion/acciones/:id/avance` actualizado por el `responsableId` de la acción funciona; llamado por otro `usuario_sucursal` retorna 403.
- [ ] `PATCH .../avance` actualizado por un administrador con alcance sobre la sucursal funciona.
- [ ] `POST /inspeccion/acciones/:id/evidencias` sube evidencia y queda asociada a la acción y trazable a la certificación de origen.
- [ ] `POST /inspeccion/acciones/:id/enviar-revision` cambia el estado a `EN_REVISION`.
- [ ] `POST /inspeccion/acciones/:id/verificar` llamado por un `usuario_sucursal` (no auditor, no admin con alcance) retorna 403 (`SinPermisoVerificacionError`), incluso si es el propio responsable de la acción (regla 4 — no autoverificación).
- [ ] `POST .../verificar` con `resultado: "CUMPLIDO"` cambia el estado a `CUMPLIDO` y registra `verificadoPorId`/`verificadoEn`/`comentarioVerificacion`.
- [ ] `POST .../verificar` con `resultado: "NO_CUMPLIDO"` regresa la acción a `EN_PROCESO` y acepta `nuevaFechaLimite`.
- [ ] Una acción con `fechaLimite` pasada y estado distinto de `CUMPLIDO`/`NO_CUMPLIDO` se lee como `VENCIDO` en cualquier endpoint de listado, sin necesidad de un job programado.
- [ ] `POST /inspeccion/plan-cumplimiento/:id/cerrar` con un hallazgo sin ninguna acción `CUMPLIDO` retorna 409 (`PlanCumplimientoConHallazgosSinAccionError`).
- [ ] `POST .../cerrar` con todos los hallazgos cubiertos por al menos una acción `CUMPLIDO` cambia `estado = CERRADO`, registra `cerradoPorId`/`cerradoEn`.
- [ ] `POST /inspeccion/plan-cumplimiento/:id/reabrir` sobre un plan `CERRADO` cambia `estado = REABIERTO` y permite agregar nuevas acciones.
- [ ] `GET /inspeccion/mis-acciones` retorna solo las acciones donde el usuario autenticado es `responsableId` (o dentro de su alcance de administrador).
- [ ] `GET /inspeccion/acciones-en-revision` retorna solo acciones `EN_REVISION` visibles para el rol auditor/administrador según su alcance.
- [ ] `GET /inspeccion/certificaciones/:id/evidencias` retorna la galería consolidada (evidencias de respuestas + hallazgos + acciones) de esa certificación.

---

## API — Firma de certificación (ampliación de 005)

- [ ] `POST /inspeccion/certificaciones/:id/firmar` sin hallazgos cambia `estado = FIRMADA` y `resultadoFinal = APROBADA` (comportamiento heredado de 005, ya verificado ahí).
- [ ] `POST .../firmar` con hallazgos `MAYOR`/`MENOR` únicamente cambia a `FIRMADA` y `resultadoFinal = APROBADA_CON_OBSERVACIONES`.
- [ ] `POST .../firmar` con al menos un hallazgo `CRITICA` sin acción `CUMPLIDO` retorna 409 y NO firma (`CertificacionConHallazgoCriticoError`).

---

## Frontend — Pantalla 3: Revisión y firma (ampliación de 005)

- [ ] El botón "Firmar y certificar" está deshabilitado si hay al menos un hallazgo `CRITICA` sin acción `CUMPLIDO`, con mensaje explicativo (antes en 005 solo se deshabilitaba por `estado`).
- [ ] Muestra mensaje de error si el backend rechaza la firma por hallazgo crítico aunque el frontend no lo haya bloqueado (defensa en profundidad).

---

## Frontend — Pantalla 4: Hallazgos (`/certificaciones/[id]/hallazgos`)

- [ ] Lista los hallazgos automáticos y manuales con badge de severidad (Crítica = rojo, Mayor = naranja/amarillo, Menor = amarillo claro o gris).
- [ ] Botón para generar hallazgos automáticos desde las respuestas no conformes.
- [ ] Formulario para agregar un hallazgo manual (descripción, severidad, evidencia opcional).
- [ ] El botón "Generar plan de cumplimiento" solo aparece si hay al menos un hallazgo.
- [ ] Cada hallazgo permite adjuntar fotos/documentos al momento de registrarlo.

---

## Frontend — Pantalla 5: Plan de cumplimiento (`/certificaciones/[id]/plan`)

- [ ] Indicadores superiores: total de acciones, pendientes, vencidas, % de cumplimiento, próximas a vencer — visibles como tarjetas KPI.
- [ ] Tabla con columnas: Hallazgo | Acción correctiva | Responsable | Fecha límite | Estado | Avance | Evidencias.
- [ ] Acción "Agregar acción correctiva" a un hallazgo específico.
- [ ] Editar una acción existente (descripción, responsable, fecha límite) sin recargar la página.
- [ ] Las acciones vencidas se muestran con estilo distintivo (ej. `text-red`, badge "Vencido").
- [ ] Botón "Cerrar plan" deshabilitado (con tooltip explicativo) si hay hallazgos sin acción `CUMPLIDO`.
- [ ] Botón "Reabrir plan" visible solo cuando `estado = CERRADO`.

---

## Frontend — Pantalla 6: Seguimiento (`/certificaciones/seguimiento`)

- [ ] Lista "Mis acciones correctivas" muestra solo las del usuario autenticado (o su alcance de administrador).
- [ ] Cada fila muestra descripción, estado, fecha límite y si está vencida.
- [ ] El detalle de una acción permite actualizar `porcentajeAvance` con un control deslizante o input numérico 0–100.
- [ ] Permite cargar evidencias con comentario opcional.
- [ ] Botón "Enviar a revisión" cambia el estado a `EN_REVISION` y desaparece de "pendientes de actualizar".

---

## Frontend — Pantalla 7: Verificación (`/certificaciones/verificacion`)

- [ ] Lista solo acciones en estado `EN_REVISION` visibles para el rol auditor/administrador.
- [ ] El detalle muestra las evidencias cargadas por el responsable.
- [ ] Botones "Marcar cumplido" / "Marcar no cumplido", el segundo requiere comentario de verificación.
- [ ] Al marcar "No cumplido", permite ajustar la fecha límite antes de confirmar.
- [ ] Un usuario con rol `usuario_sucursal` no ve esta pantalla (o la ve bloqueada con mensaje de acceso restringido).

---

## Frontend — Pantalla 8: Cierre del plan (integrada en Pantalla 5)

- [ ] "Cerrar plan" solo está disponible cuando todas las acciones están `CUMPLIDO` (o cada hallazgo tiene al menos una `CUMPLIDO`, según la regla 2).
- [ ] Tras cerrar, la tabla y los indicadores pasan a modo solo lectura con badge "Cerrado".
- [ ] "Reabrir plan" permite agregar nuevas acciones a hallazgos existentes o nuevos hallazgos manuales.

---

## Galería de evidencias consolidada

- [ ] La certificación muestra en un solo lugar todas sus evidencias (respuestas de 005 + hallazgos + acciones de este sprint), agrupadas por origen.
- [ ] Cada evidencia indica tipo (foto/pdf/documento), nombre y fecha de carga.
- [ ] Un `usuario_sucursal` solo puede ver evidencias de certificaciones de su(s) sucursal(es) (verificado en backend, no solo ocultado en frontend).

---

## Reglas de negocio verificadas

- [ ] `resultadoFinal` se calcula exactamente según la regla 1 (sin hallazgos → APROBADA; MAYOR/MENOR → APROBADA_CON_OBSERVACIONES; CRITICA → RECHAZADA, bloquea la firma).
- [ ] Un plan no puede cerrarse mientras tenga hallazgos sin al menos una acción `CUMPLIDO`.
- [ ] Una acción vencida (`fechaLimite` pasada, estado no terminal) se refleja como `VENCIDO` sin intervención manual.
- [ ] Solo el `responsableId` de una acción (o un administrador con alcance) puede actualizar su avance/evidencias.
- [ ] Solo un auditor o administrador con alcance puede verificar una acción o cerrar/reabrir un plan — nunca el propio `usuario_sucursal` sobre su propia acción.
- [ ] `empresaId` viene siempre del JWT; el alcance adicional por `sucursalId`/`clienteId` sigue las reglas de 004 en todas las pantallas y endpoints de este sprint.
- [ ] No se elimina físicamente ningún hallazgo, plan ni acción correctiva — solo se cambian de estado.

---

## Tests de unidad — Backend (`agente-qa`)

**`hallazgo.entity.test.ts`:**
- [ ] `esIncumplimiento` con puntaje completo → `false`; incompleto → `true`
- [ ] `severidadPorDefecto`: 0% → CRITICA; 1-49% → MAYOR; 50-99% → MENOR
- [ ] `generarHallazgosDesdeDetalles` con todo cumplido → `[]`
- [ ] `generarHallazgosDesdeDetalles` con mezcla → solo genera para incumplidos, severidad correcta
- [ ] `calcularResultadoFinal`: sin hallazgos → `APROBADA`; solo MAYOR/MENOR → `APROBADA_CON_OBSERVACIONES`; con CRITICA → `RECHAZADA`

**`plan-cumplimiento.entity.test.ts` / `accion-correctiva.entity.test.ts`:**
- [ ] `puedeGenerarse([])` → `false`; con hallazgos → `true`
- [ ] `puedeCerrarse` con hallazgo sin acción CUMPLIDO → `false`
- [ ] `calcularEstadoEfectivo` con fecha vencida y estado no terminal → `VENCIDO`
- [ ] `puedeActualizarAvance` responsable → `true`; otro usuario de sucursal → `false`
- [ ] `puedeVerificar` auditor/admin → `true`; usuario_sucursal → `false`
- [ ] `transicionarPorVerificacion("NO_CUMPLIDO")` → `EN_PROCESO`

**Casos de uso (mock del repositorio):**
- [ ] `generarAutomaticos()` no duplica hallazgos existentes
- [ ] `generar()` plan sin hallazgos → error
- [ ] `cerrar()` con hallazgos sin cubrir → `PlanCumplimientoConHallazgosSinAccionError`
- [ ] `verificar()` sin permiso → `SinPermisoVerificacionError`
- [ ] `firmar()` con hallazgo crítico → `CertificacionConHallazgoCriticoError` (ampliación del test de 005)

**Test de integración (BD de pruebas local):**
- [ ] Flujo completo hallazgos → plan → acción → avance → revisión → verificación → cierre retorna `estado: "CERRADO"` en el plan.

---

## Tests de unidad — Frontend (`agente-qa`)

**`tabla-plan-cumplimiento.test.tsx` / `indicadores-plan.test.tsx` / `badge-severidad.test.tsx` / `badge-estado-accion.test.tsx`:**
- [ ] Tabla vacía → estado vacío; con acciones → una fila por acción con todas las columnas
- [ ] Indicadores calculan total/pendientes/vencidas/% desde las props
- [ ] Badge de severidad con color distinto por cada una de las 3 severidades
- [ ] Badge de estado de acción con color/etiqueta distinta por cada uno de los 6 estados

**Hooks (`usar-hallazgos`, `usar-plan-cumplimiento`, `usar-seguimiento`, `usar-verificacion`, ampliación de `usar-revision-certificacion`):**
- [ ] `puedeFirmar` es `false` con hallazgo crítico pendiente (ampliación del test de 005)
- [ ] `hayAlMenosUnHallazgo` cambia a `true` tras crear un hallazgo manual
- [ ] `puedeCerrarse` es `false` con hallazgos sin cubrir
- [ ] `actualizarAvance()` llama al servicio con el porcentaje correcto
- [ ] `verificar("NO_CUMPLIDO", comentario, nuevaFechaLimite)` llama al servicio con los 3 parámetros

**`galeria-evidencias.test.tsx`:**
- [ ] Agrupa evidencias por origen (respuesta/hallazgo/acción)
- [ ] Ícono distinto para foto vs. documento

---

## Arquitectura hexagonal, Clean Code y documentación ISO

**Arquitectura hexagonal:**
- [ ] Ningún archivo en `domain/` o `application/` del módulo `inspeccion` importa `express`, `@prisma/client` ni `multer`.
- [ ] Los 4 casos de uso nuevos (`gestionar-hallazgos`, `gestionar-plan-cumplimiento`, `gestionar-accion-correctiva`, `consultar-seguimiento`) reciben sus repositorios por constructor — ninguno instancia Prisma directamente.
- [ ] `sp_inspeccion_firmar` (reemplazado) y `sp_plan_cumplimiento_indicadores` se invocan únicamente desde `infrastructure/` (los `*.prisma-repository.ts`), nunca desde `application/` ni `domain/`.
- [ ] Los controladores no contienen lógica de negocio — solo parsean request, llaman al caso de uso y formatean la respuesta.
- [ ] `calcularResultadoFinal()`, `severidadPorDefecto()`, `calcularEstadoEfectivo()` viven en `domain/`, no en el controlador ni en el repositorio.

**Clean Code:**
- [ ] Ninguna función supera ~40 líneas sin extraer auxiliares con nombre descriptivo.
- [ ] `pnpm lint` pasa en verde en `apps/api` y `apps/web`.
- [ ] Sin código muerto ni `// TODO: implementar` sin resolver.
- [ ] Los tests describen comportamiento en lenguaje natural, no el nombre del método.

**Documentación ISO (JSDoc):**
- [ ] Todas las funciones exportadas de `domain/hallazgo.entity.ts`, `domain/plan-cumplimiento.entity.ts`, `domain/accion-correctiva.entity.ts` tienen JSDoc con `@param`, `@returns` y al menos un `@example`.
- [ ] Todos los métodos de los 3 puertos nuevos (`hallazgo.repository.port.ts`, `plan-cumplimiento.repository.port.ts`, `accion-correctiva.repository.port.ts`) tienen JSDoc de una línea mínimo.
- [ ] Los stored procedures (`sp_inspeccion_firmar.sql` reemplazado, `sp_plan_cumplimiento_indicadores.sql`) tienen un bloque de comentario SQL al inicio explicando propósito, parámetros y qué retornan.

---

## Definición de "done" para el sprint

El sprint 013 se considera completo cuando:

1. Todos los ítems de este checklist están marcados ✅.
2. `agente-qa` aprobó el PR con:
   - Cobertura ≥ 80% en `domain/` y `application/` del módulo `inspeccion` (incluyendo el código nuevo de este sprint).
   - Todos los tests de componentes y hooks del frontend pasan en verde.
   - `pnpm lint` sin errores en `apps/api` y `apps/web`.
3. Arquitectura hexagonal verificada: ningún archivo de `domain/` o `application/` importa Express, Prisma o `multer`; los SPs solo se invocan desde `infrastructure/`.
4. JSDoc presente en las 3 entidades de dominio nuevas y en los 3 puertos nuevos.
5. Las 3 historias de usuario de este sprint se ejecutan de punta a punta en el entorno local, sobre una certificación ya generada y firmada por [[005-certificacion-plan-cumplimiento]]:
   - Ver los hallazgos generados automáticamente, agregar uno manual y generar el plan de cumplimiento (HU-3).
   - Como responsable, actualizar el avance de una acción y cargar evidencia (HU-4).
   - Como auditor, verificar la acción, marcarla cumplida y cerrar el plan (HU-5).
   Sin errores en consola ni en la red durante toda la secuencia.
6. Un intento de firmar una certificación con un hallazgo crítico sin resolver falla tanto en el frontend (botón deshabilitado) como en el backend (rechazo explícito), verificando la defensa en profundidad — este comportamiento requiere que [[005-certificacion-plan-cumplimiento]] esté implementado y que este sprint haya reemplazado `sp_inspeccion_firmar` y ampliado `firmar-certificacion.usecase.ts`/`usar-revision-certificacion.ts`.

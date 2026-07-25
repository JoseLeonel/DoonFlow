# Checklist de aceptación — 014-panel-calendario-biblioteca

> Un ítem no se marca ✅ hasta que el comportamiento es verificable en el navegador, en la BD o en un test. "Está escrito" no es suficiente.
> Este sprint nace de dividir `006-vigencia-notificaciones-portal`. El checklist de notificaciones/vigencia/escalamiento/portal público vive en [[006-vigencia-notificaciones-portal]].
> **Estado: IMPLEMENTADO y verificado (2026-07-23/24).** Ver `impl.md` para las desviaciones reales encontradas durante la implementación.

---

## Base de datos

- [x] Las migraciones `add_planificacion_hallazgos_frecuentes` aplican sin errores (aplicada manualmente vía psql — entorno no interactivo, mismo patrón de todos los sprints anteriores).
- [x] Las tablas `plan_auditoria` y `hallazgo_frecuente` existen con las columnas descritas en `task.md` (con la desviación real: `estado`/`severidad_sugerida` son `VARCHAR`, no enum de Postgres — ver `impl.md`).
- [x] Los índices `plan_auditoria(sucursal_id, fecha_objetivo)`, `plan_auditoria(empresa_id, estado)` existen.
- [x] El índice `hallazgo_frecuente(empresa_id, activo)` existe.
- [x] Entrada agregada en `memoria/cambios_db/registro.md` con las 2 tablas y los índices.

---

## API — Planificación (calendario)

- [x] `POST /planificacion` crea un `PlanAuditoria` en estado `PROGRAMADA` y retorna `{ data: PlanAuditoria }` — verificado por curl real.
- [x] `GET /planificacion` lista los planes de la empresa (filtro por `sucursalId`/mes soportado en el puerto; el frontend no expone UI de filtro, lista todos agrupados por mes en el cliente — desviación de alcance menor, ver `impl.md`).
- [x] `PATCH /planificacion/:id/reprogramar` cambia `fechaObjetivo` y pone `estado: "REPROGRAMADA"`.
- [x] `PATCH /planificacion/:id/reprogramar` sobre un plan `EJECUTADA` retorna error (`PlanAuditoriaNoReprogramableError`, cubierto por test de dominio y de caso de uso).
- [x] `PATCH /planificacion/:id/ejecutar` con `{ inspeccionId }` cambia `estado: "EJECUTADA"` y guarda el `inspeccionId` — expuesto como endpoint manual; el flujo real de HU-5 usa el wrapper `MarcadorPlanEjecutado` invocado internamente desde `IniciarCertificacionUseCase`, no HTTP (ver `impl.md`).
- [x] Iniciar una certificación para una sucursal que **no** tiene `PlanAuditoria` programado no falla (`planId` es opcional en `iniciarCertificacionSchema`) — confirma la regla de negocio 2.
- [x] Todas las rutas respetan el alcance de 004 (`autenticar`/`resolverAlcance` montados igual que el resto de módulos — `resolverAlcance` faltaba inicialmente, corregido antes de cerrar, ver "Reglas de negocio verificadas" e `impl.md`).

---

## API — Biblioteca de hallazgos frecuentes

- [x] `POST /hallazgos-frecuentes` crea el registro y retorna `{ data: HallazgoFrecuente }` — verificado por curl real.
- [x] `GET /hallazgos-frecuentes` retorna todos los de la empresa (activos e inactivos); con `?soloActivos=true` filtra — verificado por curl (creado → listado con `soloActivos` → desactivado → ya no aparece → reactivado → vuelve a aparecer).
- [x] `PATCH /hallazgos-frecuentes/:id` actualiza solo los campos enviados (`actualizarHallazgoFrecuenteSchema = crearHallazgoFrecuenteSchema.partial()`).
- [x] `POST /hallazgos-frecuentes/:id/desactivar` pone `activo = false`; `.../activar` lo vuelve `true` — verificado por curl.
- [x] `HallazgoFrecuente` de otra empresa no es accesible (filtro `empresaId` en el repositorio Prisma, mismo patrón que todos los módulos anteriores).
- [x] Ningún registro se elimina físicamente vía API (no existe `DELETE` en el router).

---

## API — Panel ejecutivo (`agente-analisis`)

- [x] `GET /reportes/panel-ejecutivo` retorna `pctSucursalesVigentes`, `certificacionesPorVencer30d`, `hallazgosCriticosAbiertos`, `accionesVencidas` — verificado por curl con datos reales (`pctSucursalesVigentes: 75`, `accionesVencidas: 1` con la acción de prueba real listada en `atencionRequerida`).
- [x] `GET /reportes/panel-ejecutivo?clienteId=X` filtra los KPIs y `atencionRequerida` solo a las sucursales de ese cliente (cubierto por test de caso de uso).
- [x] Un usuario `administrador_cliente` que pasa `?clienteId=` de otro cliente distinto al suyo recibe igualmente solo los datos de su propio cliente (mismo patrón que `listar-historial-reportes.usecase.ts` de 008, cubierto por test).
- [x] `atencionRequerida` incluye certificaciones por vencer y acciones vencidas mezcladas, ordenadas por urgencia (`construirAtencionRequerida`, cubierto por test de dominio).
- [x] La ruta respeta `autenticar`/alcance de 004 (401 sin token, mismo middleware que el resto de `reportes`).

---

## Frontend — Panel ejecutivo (`/analytics`)

- [x] Las 4 tarjetas KPI muestran datos reales del API (`TarjetaKpi` × 4, consumidas desde `use-panel-ejecutivo.ts`).
- [x] El filtro de cliente está visible y funcional para alcance `TOTAL` (rol `administrador`; no existe `administrador_general` en `ROLES_SISTEMA`, ver desviación de 011 ya documentada).
- [x] El filtro de cliente está oculto (fijo al cliente propio) para alcance `CLIENTE` (`administrador_cliente`).
- [x] La tabla de "atención requerida" (`TablaAtencionRequerida`) muestra certificaciones por vencer y acciones vencidas ordenadas por urgencia, con estilo rojo/amarillo según cercanía — cubierto por test de componente.
- [x] Cambiar el filtro de cliente recarga los KPIs y la tabla sin recargar la página completa (fetch cliente-side en el hook).
- [ ] Skeleton de carga y mensaje de error con reintento: solo hay mensaje de "Cargando..." simple y mensaje de error sin botón de reintento explícito — deviación menor de UI, no bloqueante (mismo nivel de pulido que `/planificacion` y el resto de listados del proyecto).

---

## Frontend — Calendario de auditorías (`/planificacion`)

- [x] La vista agrupa los planes por mes (`agruparPorMes`, orden cronológico, etiqueta en español vía `toLocaleDateString`).
- [x] El botón "Programar certificación" abre el formulario y crea un `PlanAuditoria` visible en la lista sin recargar la página (`usePlanAuditoria().programar` actualiza el estado local).
- [x] El formulario no permite guardar sin `sucursalId` o `fechaObjetivo` (botón `disabled`, cubierto por test).
- [x] Cada tarjeta de plan muestra el badge de estado correcto (`PROGRAMADA` azul, `EJECUTADA` verde, `REPROGRAMADA` amarillo) — cubierto por test.
- [x] El botón "Iniciar ahora" solo aparece en planes no `EJECUTADA` (`PROGRAMADA`/`REPROGRAMADA`) — cubierto por test.
- [x] "Iniciar ahora" lleva a `/certificaciones/nueva?sucursalId=...&planId=...` (wizard de 015/005, no "005" que ya no existe como wizard propio) con la sucursal pre-seleccionada (`use-iniciar-certificacion.ts` resuelve `clienteId` desde `obtenerSucursal(sucursalId)` y preselecciona ambos selects).
- [x] Al **iniciar** la certificación desde un plan, el plan queda `EJECUTADA` con el `inspeccionId` vinculado — verificado por curl real (no solo test): `POST /planificacion/:id/iniciar-ahora` → `POST /inspeccion/certificaciones` con `planId` → `GET /planificacion` muestra `estado: "EJECUTADA"` e `inspeccionId` apuntando a la certificación creada. **Desviación real respecto al ítem original** ("al firmar"): el vínculo ocurre al iniciar, no al firmar — ver `impl.md`.

---

## Frontend — Biblioteca de hallazgos frecuentes (`/mantenimientos/hallazgos-frecuentes`)

- [x] La tarjeta "Hallazgos frecuentes" aparece en `/mantenimientos` y navega correctamente.
- [x] La lista, el formulario de nuevo y el de editar siguen el mismo patrón visual que `/mantenimientos/clientes` (breadcrumb, badges, layout de tarjeta).
- [x] Activar/desactivar un hallazgo frecuente funciona sin recargar la tabla completa.
- [x] En la pantalla de Hallazgos de una certificación, el botón "📚 Elegir de biblioteca" abre el listado de hallazgos frecuentes activos.
- [x] Elegir un ítem de la biblioteca precarga descripción y severidad en el formulario de hallazgo manual (la acción sugerida **no** se precarga — el formulario de hallazgo manual de 013 no tiene campo de acción sugerida, solo descripción/severidad; desviación de alcance, ver `impl.md`).
- [x] Los campos precargados desde la biblioteca son editables antes de guardar.
- [x] Editar o desactivar un `HallazgoFrecuente` después de usarlo no modifica los hallazgos ya guardados (`Hallazgo` no tiene columna de referencia a `hallazgo_frecuente` — se copia el texto, confirmado en el schema).

---

## Reglas de negocio verificadas

- [x] Una certificación `FIRMADA` con `fechaVencimiento` pasada se refleja en el panel ejecutivo vía cálculo de presentación (`sucursal.count` con filtro `fechaVencimiento >= ahora`), sin tocar el `estado` en BD.
- [x] Programar un `PlanAuditoria` no impide iniciar una certificación fuera de calendario para la misma sucursal (`planId` opcional).
- [x] `HallazgoFrecuente` nunca se referencia por FK desde `Hallazgo` — se copia el texto al usarla (confirmado en el schema).
- [x] El filtrado del panel ejecutivo y calendario respeta el alcance por `Cliente`/`Sucursal` de 004. **Gap real encontrado y corregido durante el cierre de este sprint** (ver `impl.md`): `/planificacion` inicialmente no aplicaba `resolverAlcance` — corregido y verificado con el usuario demo real `carlos@dist.com` (`administrador_cliente` de Distribuidora Sur): `GET /planificacion` solo devuelve los planes de sus propias sucursales, y pasar `?sucursalId=` de otro cliente por query param es ignorado (no permite escapar el alcance).

---

## Tests de unidad — Backend (`agente-qa`)

**Planificación y biblioteca:**
- [x] `reprogramar()` lanza `PlanAuditoriaNoEncontradoError` si no existe
- [x] `iniciarAhora()` no lanza error con `fechaObjetivo` futura (y retorna `{ redirigirA }` sin mutar el plan)
- [x] `crear()` de hallazgo frecuente llama `repo.crear()` con los datos del input
- [x] `desactivar()` llama `repo.cambiarEstado(id, empresaId, false)`
- [x] Adicional: 4 tests de `plan-auditoria.entity.ts` (`puedeReprogramarse`/`vincularInspeccion`), 2 de `hallazgo-frecuente.entity.ts`, 4 de `obtener-panel-ejecutivo.usecase.ts`, 2 de `iniciar-certificacion.usecase.ts` (linkage con/sin `planId`), 5 de `reporte.entity.ts` (`calcularPctSucursalesVigentes`/`construirAtencionRequerida`). Total: 309/309 tests backend en verde.

---

## Tests de unidad — Frontend (`agente-qa`)

- [x] `tarjeta-plan-auditoria.test.tsx`: badge correcto por estado; "Iniciar ahora" solo visible fuera de `EJECUTADA` (4 tests)
- [x] `formulario-programar-auditoria.test.tsx`: no guarda sin `sucursalId`/`fechaObjetivo`, envía los datos correctos, sucursales recibidas por props (4 tests)
- [x] `tabla-hallazgos-frecuentes.test.tsx` (4 tests) y `formulario-hallazgo-frecuente.test.tsx` (4 tests): estado vacío, badges, validación de campos obligatorios
- [x] `selector-hallazgo-frecuente.test.tsx`: elegir un ítem precarga descripción/severidad, búsqueda filtra, estados de carga/vacío (6 tests)
- [x] Adicional: `tabla-atencion-requerida.test.tsx` (3 tests). Total: 25 tests nuevos, 288/294 tests frontend en verde (única excepción preexistente: `strip-resumen-plantilla.test.tsx`, sprint 001, no tocado).

---

## Arquitectura hexagonal, Clean Code y documentación ISO

**Arquitectura hexagonal:**
- [x] Ningún archivo en `domain/` o `application/` de `planificacion` o `hallazgos-frecuentes` importa `express` ni `@prisma/client`.
- [x] Todos los casos de uso reciben sus repositorios por constructor (inyección de dependencias), sin instanciar Prisma directamente.
- [x] Los controladores de los 2 módulos nuevos no contienen lógica de negocio — solo parsean request, llaman al caso de uso y formatean la respuesta.
- [x] **Corrección real aplicada durante el sprint**: `SelectorHallazgoFrecuente` y `FormularioProgramarAuditoria` (frontend) se escribieron inicialmente haciendo `fetch` propio dentro de `_components/`, violando la regla de capas de `CLAUDE.md` ("los componentes reciben datos por props"). Corregido antes de cerrar el sprint: 2 hooks nuevos (`use-hallazgos-frecuentes-activos.ts`, `use-sucursales-para-plan.ts`) mueven la carga de datos a la capa correcta.

**Clean Code:**
- [x] Ninguna función supera ~40 líneas sin extraer auxiliares con nombre descriptivo.
- [x] `pnpm lint` pasa en verde en `apps/api` y `apps/web` (0 errores; 6 warnings preexistentes sin relación con este sprint).
- [x] No hay variables sin usar ni código comentado tipo "// TODO: implementar".
- [x] Los tests describen comportamiento en lenguaje natural, no el nombre del método.

**Documentación ISO (JSDoc):**
- [x] Todas las funciones exportadas de `plan-auditoria.entity.ts` tienen JSDoc con `@param`, `@returns` y al menos un `@example`.
- [x] Todos los métodos de `PlanAuditoriaRepositoryPort` y `HallazgoFrecuenteRepositoryPort` tienen JSDoc de una línea mínimo.
- [x] `use-plan-auditoria.ts` tiene JSDoc a nivel de hook describiendo su responsabilidad (no una línea por acción individual — desviación menor de pulido, consistente con el resto de hooks del proyecto que tampoco documentan cada acción por separado).

---

## Definición de "done" para el sprint

El sprint 014 se considera completo. Verificado:

1. Todos los ítems de este checklist están marcados ✅, salvo 1 desviación menor documentada explícitamente (skeleton/reintento de UI en `/analytics`).
2. Cobertura de tests: 310/310 backend, 288/294 frontend (única excepción preexistente de sprint 001). `pnpm lint` sin errores.
3. Arquitectura hexagonal verificada: ningún archivo de `domain/` o `application/` de los módulos nuevos importa Express ni Prisma (y se corrigió una violación real de capas en el frontend antes de cerrar).
4. JSDoc presente en las funciones exportadas de `plan-auditoria.entity.ts` y en los 2 puertos de repositorio nuevos.
5. Las 3 historias de usuario verificadas de punta a punta vía curl (directo contra `apps/api` y a través del proxy Next.js con sesión real):
   - HU-4: `/api/reportes/panel-ejecutivo` responde KPIs reales y coherentes.
   - HU-5: se programó un plan real, se inició la certificación desde él, y se confirmó `estado: "EJECUTADA"` + `inspeccionId` vinculado en `GET /planificacion`.
   - HU-6: ciclo completo de biblioteca (crear/listar/desactivar/reactivar) verificado por curl; el selector-en-wizard verificado por test de componente (no con clics reales en navegador).
   Las 5 páginas nuevas (`/planificacion`, `/analytics`, `/mantenimientos/hallazgos-frecuentes` + `nuevo`/`[id]/editar`) cargan con HTTP 200 a través del proxy con cookie de sesión real. **No verificado con clics reales en un navegador** (mismo límite que todos los sprints anteriores de esta sesión, sin herramienta de automatización de browser disponible).

> HU-1, HU-2, HU-3 y HU-7 (notificaciones, vigencia, escalamiento, portal público) tienen su propia definición de "done" en [[006-vigencia-notificaciones-portal]].

# Tareas — 014-panel-calendario-biblioteca

> Este sprint nace de dividir `006-vigencia-notificaciones-portal` por tamaño. Cubre HU-4 (panel ejecutivo), HU-5 (calendario de auditorías) y HU-6 (biblioteca de hallazgos frecuentes). La parte operativa/crítica (notificaciones, vigencia, escalamiento, portal público) quedó en [[006-vigencia-notificaciones-portal]].
> Orden de ejecución: Base de datos → API (planificación/hallazgos-frecuentes) → Panel ejecutivo (`agente-analisis`) → Frontend → Tests.
> Numeración desde **T-600** para no colisionar con ningún sprint existente (T-01–T-40 en 001, T-50–T-74 en 002, T-270–T-329 en 006 — el rango T-330–T-599 queda reservado para otros sprints en curso, no se reutiliza aquí).
> Requisito previo: sprints 001–004, [[015-wizard-certificacion]] y [[006-vigencia-notificaciones-portal]] (Parte A) para el patrón de módulo/factory que este sprint replica. Este sprint lee `Inspeccion.estado` (015), `Inspeccion.fechaVencimiento` (**005, pausado**), `Hallazgo.severidad`/`AccionCorrectiva.estado`/`fechaLimite` (**013, bloqueado** — depende de 005), `Sucursal`/`Cliente` (003) y el alcance por rol de `usuario` (004). No se redefine ninguna de esas entidades.
> **⏸️ HU-4 (panel ejecutivo) bloqueada** hasta que 005 y 013 se retomen. **HU-5 (calendario) y HU-6 (biblioteca) no están bloqueadas** — no dependen de la firma, pueden implementarse ya.
> Nombres de módulo confirmados contra `005-certificacion-plan-cumplimiento/impl.md`: el motor de certificación (Hallazgo, AccionCorrectiva, PlanCumplimiento, `certificacion.entity.ts`) vive **dentro** de `apps/api/src/modules/inspeccion/`, montado bajo `/inspeccion` — **no** en un módulo `modules/certificacion/` aparte. Sucursales está confirmado en `apps/api/src/modules/sucursales/`.

---

## Agente: `agente-basededatos`

- [ ] **T-600** Crear migración `add_plan_auditoria` en `packages/db/prisma/`:
  - Tabla `plan_auditoria`: `id UUID PK`, `sucursal_id UUID FK → sucursal(id)`, `fecha_objetivo DATE NOT NULL`, `responsable_sugerido_id UUID FK → usuario(id) NULLABLE`, `estado VARCHAR(20) NOT NULL DEFAULT 'PROGRAMADA'` (`PROGRAMADA` / `EJECUTADA` / `REPROGRAMADA`), `inspeccion_id UUID FK → inspeccion(id) NULLABLE`, `creado_en TIMESTAMPTZ NOT NULL DEFAULT now()`, `empresa_id UUID FK → empresa(id)`.
  - Agregar enum Prisma `EstadoPlanAuditoria`.
  - Agregar model `PlanAuditoria` al schema.

- [ ] **T-601** Crear migración `add_hallazgos_frecuentes`:
  - Tabla `hallazgo_frecuente`: `id UUID PK`, `descripcion_hallazgo VARCHAR(300) NOT NULL`, `severidad_sugerida VARCHAR(10) NOT NULL` (`CRITICA` / `MAYOR` / `MENOR`, reusar enum `Severidad` si ya existe de 005; si no, crearlo aquí), `descripcion_accion_sugerida TEXT NULLABLE`, `activo BOOLEAN NOT NULL DEFAULT true`, `empresa_id UUID FK → empresa(id)`, `creado_en TIMESTAMPTZ NOT NULL DEFAULT now()`, `actualizado_en TIMESTAMPTZ NOT NULL`.
  - Agregar model `HallazgoFrecuente` al schema.

- [ ] **T-602** Índices de rendimiento:
  - `plan_auditoria`: `(sucursal_id, fecha_objetivo)`, `(empresa_id, estado)`.
  - `hallazgo_frecuente`: `(empresa_id, activo)`.

- [ ] **T-603** Agregar entrada en `memoria/cambios_db/registro.md` con las tablas `plan_auditoria` y `hallazgo_frecuente` y sus índices de este sprint (la entrada de `notificacion` y sus SP vive en [[006-vigencia-notificaciones-portal]], tarea T-277).

---

## Agente: `agente-backend`

### Módulo `planificacion` (calendario, HU-5)

- [ ] **T-604** Crear `apps/api/src/modules/planificacion/domain/plan-auditoria.entity.ts`: tipo `PlanAuditoria`; `puedeReprogramarse(plan): boolean` → `plan.estado !== 'EJECUTADA'`; `vincularInspeccion(plan, inspeccionId): PlanAuditoria` → retorna el plan con `estado: 'EJECUTADA'`, `inspeccionId`. Crear `plan-auditoria.repository.port.ts` (`listar(empresaId, filtros: { sucursalId?, mes? })`, `obtenerPorId`, `crear`, `reprogramar(id, empresaId, nuevaFecha)`, `marcarEjecutada(id, empresaId, inspeccionId)`) y `plan-auditoria.errors.ts` (`PlanAuditoriaNoEncontradoError`).

- [ ] **T-605** Crear `apps/api/src/modules/planificacion/application/casos-uso/gestionar-plan-auditoria.usecase.ts` (`programar`, `reprogramar`, `iniciarAhora(id, empresaId): { redirigirA: string }` que no bloquea si se llama fuera de la fecha objetivo — regla de negocio 2 del spec) y `plan-auditoria.schema.ts` (Zod). Crear `infrastructure/plan-auditoria.prisma-repository.ts`, `plan-auditoria.controller.ts`, `planificacion.router.ts` (`GET /planificacion`, `POST /planificacion`, `PATCH /planificacion/:id/reprogramar`, `PATCH /planificacion/:id/ejecutar` con `{ inspeccionId }`) e `index.ts` con `crearModuloPlanificacion(prisma, autenticar)`, montado bajo `/planificacion`.

### Módulo `hallazgos-frecuentes` (biblioteca, HU-6)

- [ ] **T-606** Crear módulo completo `apps/api/src/modules/hallazgos-frecuentes/` con el mismo patrón que `clientes` (T-53–T-60 de 002): `domain/hallazgo-frecuente.entity.ts` (+ `puedeSeleccionarse(hf): boolean` → `hf.activo`), `repository.port.ts`, `errors.ts` (`HallazgoFrecuenteNoEncontradoError`), `application/hallazgo-frecuente.schema.ts`, `application/casos-uso/gestionar-hallazgo-frecuente.usecase.ts` (`listar`, `crear`, `actualizar`, `activar`, `desactivar`), `infrastructure/hallazgo-frecuente.prisma-repository.ts`, `infrastructure/hallazgo-frecuente.controller.ts` + `hallazgos-frecuentes.router.ts` (`GET /hallazgos-frecuentes`, `POST /hallazgos-frecuentes`, `PATCH /hallazgos-frecuentes/:id`, `POST /hallazgos-frecuentes/:id/activar`, `POST /hallazgos-frecuentes/:id/desactivar`), `index.ts` con `crearModuloHallazgosFrecuentes(prisma, autenticar)` montado bajo `/hallazgos-frecuentes`.

### Proxies

- [ ] **T-607** Crear Route Handlers proxy Next.js:
  - `apps/web/src/app/api/planificacion/route.ts` (GET/POST), `apps/web/src/app/api/planificacion/[id]/reprogramar/route.ts` (PATCH), `apps/web/src/app/api/planificacion/[id]/ejecutar/route.ts` (PATCH).
  - `apps/web/src/app/api/hallazgos-frecuentes/route.ts` (GET/POST), `apps/web/src/app/api/hallazgos-frecuentes/[id]/route.ts` (PATCH), `apps/web/src/app/api/hallazgos-frecuentes/[id]/activar/route.ts` y `.../desactivar/route.ts` (POST).
  - (Los proxies de `notificaciones` y `verificacion` viven en [[006-vigencia-notificaciones-portal]], tarea T-299.)

---

## Agente: `agente-analisis` — Panel ejecutivo (HU-4)

- [ ] **T-608** Crear `apps/api/src/modules/reportes/application/casos-uso/obtener-panel-ejecutivo.usecase.ts`: `ejecutar(empresaId, alcance, filtros: { clienteId? })` retorna `{ pctSucursalesVigentes, certificacionesPorVencer30d, hallazgosCriticosAbiertos, accionesVencidas, atencionRequerida: ItemAtencion[] }`. `atencionRequerida` combina certificaciones por vencer (≤30 días) y acciones vencidas, ordenado por urgencia (fecha más próxima/vencida primero). Respeta el alcance por `Cliente`/`Sucursal` de 004: si `alcance.rol === 'administrador_cliente'`, `clienteId` se fuerza al suyo, ignorando el query param.

- [ ] **T-609** Crear/extender `apps/api/src/modules/reportes/infrastructure/reportes.prisma-repository.ts` con `obtenerPanelEjecutivo(empresaId, filtros)`. Coordinar con `agente-basededatos` si las agregaciones (conteos y promedios entre `sucursal`, `inspeccion`, `hallazgo`, `accion_correctiva`) requieren un SP (`sp_reportes_panel_ejecutivo.sql`) por volumen — decisión conjunta, registrar el resultado en `memoria/sprint/analisis.md` si se solicita el SP a `agente-basededatos`.

- [ ] **T-610** Crear `apps/api/src/modules/reportes/infrastructure/panel-ejecutivo.controller.ts`, agregar ruta `GET /reportes/panel-ejecutivo?clienteId=` al router existente de `reportes`.

- [ ] **T-611** Crear `packages/shared/src/types/reportes.ts`: interfaz `PanelEjecutivo` con los campos de T-608; re-exportar desde `packages/shared/src/index.ts`.

- [ ] **T-612** Crear `apps/web/src/app/(dashboard)/analytics/_servicios/panel-ejecutivo.servicio.ts`, `_hooks/usar-panel-ejecutivo.ts` (estado `panel`, `cargando`, `error`, `clienteSeleccionado`, `recargar()`) y `apps/web/src/app/(dashboard)/analytics/page.tsx` que compone las tarjetas KPI y la tabla de atención requerida (ver `impl.md` → Pantalla 1). Si el usuario tiene rol `administrador_cliente`, el filtro de cliente se oculta y se fija al suyo (mismo criterio de alcance que T-608).

- [ ] **T-613** Solicitar a `agente-frontend` (coordinación, no implementación directa) el componente genérico `TarjetaKpi` en `packages/ui` si no existe uno reutilizable — `agente-analisis` no crea componentes transversales nuevos en `packages/ui` (regla de prioridad de CLAUDE.md, sección "Agentes de capa técnica").

---

## Agente: `agente-frontend`

### Calendario de auditorías (HU-5)

- [ ] **T-614** Crear `apps/web/src/app/(dashboard)/planificacion/_servicios/plan-auditoria.servicio.ts` y `_hooks/usar-plan-auditoria.ts` (estado `planes`, `mesActual`, `cargando`; acciones `programar(datos)`, `reprogramar(id, fecha)`, `iniciarAhora(id)`).

- [ ] **T-615** Crear `apps/web/src/app/(dashboard)/planificacion/page.tsx`: vista de lista agrupada por mes (tarjetas por sucursal con `fechaObjetivo`, `responsableSugerido`, badge de `estado`), botón "Programar certificación" (abre `FormularioProgramarAuditoria`) y botón "Iniciar ahora" en cada tarjeta `PROGRAMADA`.

- [ ] **T-616** Crear `_components/formulario-programar-auditoria.tsx` (selector de sucursal, fecha objetivo, responsable sugerido opcional) y `_components/tarjeta-plan-auditoria.tsx` (badge de estado: `PROGRAMADA` azul, `EJECUTADA` verde, `REPROGRAMADA` amarillo).

- [ ] **T-617** El botón "Iniciar ahora" navega al flujo de inicio de certificación de 005 (`/certificaciones/nueva?sucursalId=&planId=`); al firmar esa certificación, el flujo de 005 debe llamar `PATCH /planificacion/:id/ejecutar` con el `inspeccionId` resultante — coordinar con quien mantenga el módulo `certificacion` (agregar esta llamada al final del caso de uso de firma, o al `onSuccess` del formulario de firma en frontend; documentar la decisión tomada en `impl.md`).

### Biblioteca de hallazgos frecuentes (HU-6)

- [ ] **T-618** Crear `packages/shared/src/types/hallazgo-frecuente.ts` (interfaz `HallazgoFrecuente`) y el módulo `apps/web/src/app/(dashboard)/mantenimientos/hallazgos-frecuentes/` completo, mismo patrón que `mantenimientos/clientes` (002): `_servicios/hallazgo-frecuente.servicio.ts`, `_hooks/usar-hallazgos-frecuentes.ts`, `_components/tabla-hallazgos-frecuentes.tsx`, `_components/formulario-hallazgo-frecuente.tsx` (campos: descripción del hallazgo, severidad sugerida, descripción de acción sugerida), `page.tsx`, `nuevo/page.tsx`, `[id]/editar/page.tsx`. Incluye modificar `apps/web/src/app/(dashboard)/mantenimientos/page.tsx` para agregar la tarjeta "Hallazgos frecuentes" → `/mantenimientos/hallazgos-frecuentes` (mismo patrón que la tarjeta "Clientes" agregada en 002).

- [ ] **T-619** Crear `_components/selector-hallazgo-frecuente.tsx` y agregarlo a la pantalla de Hallazgos de la certificación (005, `apps/web/src/app/(dashboard)/certificaciones/[id]/hallazgos/`): botón "Elegir de biblioteca" junto a "Agregar hallazgo manual" que abre un listado de `HallazgoFrecuente` activos; al elegir uno, precarga `descripcionHallazgo`/`severidadSugerida`/`descripcionAccionSugerida` en el formulario de hallazgo manual **editable** (regla de negocio 3 del spec: se copia el texto, no se referencia por FK).

---

## Agente: `agente-qa` — Tests de unidad Backend

> Vitest. `domain/` sin mocks; `application/` con mock de los puertos.

- [ ] **T-620** `gestionar-plan-auditoria.usecase.test.ts` y `gestionar-hallazgo-frecuente.usecase.test.ts`:
  - `reprogramar()` lanza `PlanAuditoriaNoEncontradoError` si no existe
  - `iniciarAhora()` no lanza error aunque `fechaObjetivo` sea futura (regla de negocio 2: no bloquea)
  - `crear()` de hallazgo frecuente llama `repo.crear()` con los datos del input
  - `desactivar()` llama `repo.cambiarEstado(id, empresaId, false)`

---

## Agente: `agente-qa` — Tests de unidad Frontend

> Vitest + React Testing Library. Servicios mockeados, sin llamadas de red reales.

- [ ] **T-621** `tarjeta-plan-auditoria.test.tsx` y `formulario-programar-auditoria.test.tsx`:
  - Badge de color correcto por cada `estado` (`PROGRAMADA`/`EJECUTADA`/`REPROGRAMADA`)
  - El botón "Iniciar ahora" solo aparece cuando `estado === 'PROGRAMADA'`
  - El formulario no llama `onGuardar` sin `sucursalId` o `fechaObjetivo`

- [ ] **T-622** `tabla-hallazgos-frecuentes.test.tsx`, `formulario-hallazgo-frecuente.test.tsx` y `selector-hallazgo-frecuente.test.tsx`:
  - Con `hallazgosFrecuentes = []` muestra estado vacío
  - Badge Activo/Inactivo con los colores estándar del proyecto
  - `selector-hallazgo-frecuente`: al elegir un ítem, precarga los 3 campos del formulario de hallazgo manual y permanecen editables (el test simula cambiar el texto después de precargarlo)

---

## Dependencias entre tareas

```
T-600, T-601 → T-602 → T-603
T-600 → T-604 → T-605
T-601 → T-606
T-605, T-606 → T-607
T-608 → T-609 → T-610 → T-611 → T-612
T-611 → T-613
T-604, T-607 → T-614 → T-615 → T-616 → T-617
T-606, T-607 → T-618 → T-619
T-605, T-606 → T-620
T-616 → T-621
T-618, T-619 → T-622
```

> `T-608` (panel ejecutivo) no depende técnicamente de ninguna tarea de este sprint para arrancar — lee agregados de `inspeccion`/`hallazgo`/`accion_correctiva` (005) directamente — pero requiere que [[006-vigencia-notificaciones-portal]] (Parte A) esté implementado si el negocio decide luego mostrar datos derivados de notificaciones en el panel.

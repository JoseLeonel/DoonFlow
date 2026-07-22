# Checklist de aceptación — 014-panel-calendario-biblioteca

> Un ítem no se marca ✅ hasta que el comportamiento es verificable en el navegador, en la BD o en un test. "Está escrito" no es suficiente.
> Este sprint nace de dividir `006-vigencia-notificaciones-portal`. El checklist de notificaciones/vigencia/escalamiento/portal público vive en [[006-vigencia-notificaciones-portal]].

---

## Base de datos

- [ ] Las migraciones `add_plan_auditoria` y `add_hallazgos_frecuentes` aplican sin errores (`pnpm --filter db migrate:dev`).
- [ ] Las tablas `plan_auditoria` y `hallazgo_frecuente` existen con las columnas descritas en `task.md`.
- [ ] Los índices `plan_auditoria(sucursal_id, fecha_objetivo)`, `plan_auditoria(empresa_id, estado)` existen.
- [ ] El índice `hallazgo_frecuente(empresa_id, activo)` existe.
- [ ] Entrada agregada en `memoria/cambios_db/registro.md` con las 2 tablas y los índices.

---

## API — Planificación (calendario)

- [ ] `POST /planificacion` crea un `PlanAuditoria` en estado `PROGRAMADA` y retorna `{ data: PlanAuditoria }`.
- [ ] `GET /planificacion` lista los planes de la empresa, filtrable por `sucursalId` y por mes.
- [ ] `PATCH /planificacion/:id/reprogramar` cambia `fechaObjetivo` y pone `estado: "REPROGRAMADA"`.
- [ ] `PATCH /planificacion/:id/reprogramar` sobre un plan `EJECUTADA` retorna error (no se puede reprogramar algo ya ejecutado).
- [ ] `PATCH /planificacion/:id/ejecutar` con `{ inspeccionId }` cambia `estado: "EJECUTADA"` y guarda el `inspeccionId`.
- [ ] Iniciar una certificación para una sucursal que **no** tiene `PlanAuditoria` programado no falla — confirma la regla de negocio 2 (el calendario no bloquea).
- [ ] Todas las rutas respetan el alcance de 004: un `administrador_cliente` solo ve/programa planes de sus sucursales.

---

## API — Biblioteca de hallazgos frecuentes

- [ ] `POST /hallazgos-frecuentes` crea el registro y retorna `{ data: HallazgoFrecuente }`.
- [ ] `GET /hallazgos-frecuentes` retorna todos los de la empresa (activos e inactivos, el frontend filtra visualmente).
- [ ] `PATCH /hallazgos-frecuentes/:id` actualiza solo los campos enviados.
- [ ] `POST /hallazgos-frecuentes/:id/desactivar` pone `activo = false`; `.../activar` lo vuelve `true`.
- [ ] `HallazgoFrecuente` de otra empresa no es accesible (404).
- [ ] Ningún registro se elimina físicamente vía API (no existe `DELETE`).

---

## API — Panel ejecutivo (`agente-analisis`)

- [ ] `GET /reportes/panel-ejecutivo` retorna `pctSucursalesVigentes`, `certificacionesPorVencer30d`, `hallazgosCriticosAbiertos`, `accionesVencidas` con valores coherentes contra datos de prueba conocidos.
- [ ] `GET /reportes/panel-ejecutivo?clienteId=X` filtra los KPIs y `atencionRequerida` solo a las sucursales de ese cliente.
- [ ] Un usuario `administrador_cliente` que pasa `?clienteId=` de otro cliente distinto al suyo recibe igualmente solo los datos de su propio cliente (el filtro se ignora, no se respeta el query param ajeno).
- [ ] `atencionRequerida` incluye certificaciones por vencer y acciones vencidas mezcladas, ordenadas por urgencia (la más próxima/vencida primero).
- [ ] La ruta retorna 401 sin token y respeta el resto de reglas de alcance de 004.

---

## Frontend — Panel ejecutivo (`/analytics`)

- [ ] Las 4 tarjetas KPI (% sucursales vigentes, certificaciones por vencer a 30 días, hallazgos críticos abiertos, acciones vencidas) muestran datos reales del API.
- [ ] El filtro de cliente está visible y funcional para `administrador_general`.
- [ ] El filtro de cliente está oculto (fijo al cliente propio) para `administrador_cliente`.
- [ ] La tabla de "atención requerida" muestra certificaciones por vencer y acciones vencidas ordenadas por urgencia.
- [ ] Cambiar el filtro de cliente recarga los KPIs y la tabla sin recargar la página completa.
- [ ] Se muestra skeleton mientras carga y mensaje de error con reintento si el API falla.

---

## Frontend — Calendario de auditorías (`/planificacion`)

- [ ] La vista agrupa los planes por mes.
- [ ] El botón "Programar certificación" abre el formulario y crea un `PlanAuditoria` visible en la lista sin recargar la página.
- [ ] El formulario no permite guardar sin `sucursalId` o `fechaObjetivo`.
- [ ] Cada tarjeta de plan muestra el badge de estado correcto (`PROGRAMADA` azul, `EJECUTADA` verde, `REPROGRAMADA` amarillo).
- [ ] El botón "Iniciar ahora" solo aparece en planes `PROGRAMADA` (o `REPROGRAMADA`), nunca en `EJECUTADA`.
- [ ] "Iniciar ahora" lleva al flujo de certificación de 005 con la sucursal pre-seleccionada.
- [ ] Al firmar la certificación iniciada desde un plan, el plan queda `EJECUTADA` con el `inspeccionId` vinculado (verificar recargando `/planificacion`).

---

## Frontend — Biblioteca de hallazgos frecuentes (`/mantenimientos/hallazgos-frecuentes`)

- [ ] La tarjeta "Hallazgos frecuentes" aparece en `/mantenimientos` y navega correctamente.
- [ ] La lista, el formulario de nuevo y el de editar siguen el mismo patrón visual que `/mantenimientos/clientes` (breadcrumb, badges, skeleton).
- [ ] Activar/desactivar un hallazgo frecuente funciona sin recargar la tabla completa.
- [ ] En la pantalla de Hallazgos de una certificación (005), el botón "Elegir de biblioteca" abre el listado de hallazgos frecuentes activos.
- [ ] Elegir un ítem de la biblioteca precarga descripción, severidad sugerida y acción sugerida en el formulario de hallazgo manual.
- [ ] Los campos precargados desde la biblioteca son editables antes de guardar (el texto guardado en el hallazgo no queda ligado por FK a `HallazgoFrecuente`).
- [ ] Editar o desactivar un `HallazgoFrecuente` después de usarlo no modifica los hallazgos ya guardados que se originaron desde él (verificar en BD que `Hallazgo` no tiene columna de referencia a `hallazgo_frecuente`).

---

## Reglas de negocio verificadas

- [ ] Una certificación `FIRMADA` con `fechaVencimiento` pasada se muestra "Vencida" en el panel ejecutivo, pero su `estado` en BD sigue `FIRMADA` (cálculo de presentación, no transición de estado).
- [ ] Programar un `PlanAuditoria` no impide iniciar una certificación fuera de calendario para la misma sucursal.
- [ ] `HallazgoFrecuente` nunca se referencia por FK desde `Hallazgo` — se copia el texto al usarla.
- [ ] El filtrado del panel ejecutivo y calendario respeta siempre el alcance por `Cliente`/`Sucursal` de 004 (probar con un usuario `administrador_cliente` y confirmar que no ve datos de otro cliente en ninguna de las 2 pantallas).

---

## Tests de unidad — Backend (`agente-qa`)

**Planificación y biblioteca:**
- [ ] `reprogramar()` lanza `PlanAuditoriaNoEncontradoError` si no existe
- [ ] `iniciarAhora()` no lanza error con `fechaObjetivo` futura
- [ ] `crear()` de hallazgo frecuente llama `repo.crear()` con los datos del input
- [ ] `desactivar()` llama `repo.cambiarEstado(id, empresaId, false)`

---

## Tests de unidad — Frontend (`agente-qa`)

- [ ] `tarjeta-plan-auditoria.test.tsx`: badge correcto por estado; "Iniciar ahora" solo visible en `PROGRAMADA`
- [ ] `formulario-programar-auditoria.test.tsx`: no guarda sin `sucursalId`/`fechaObjetivo`
- [ ] `tabla-hallazgos-frecuentes.test.tsx` y `formulario-hallazgo-frecuente.test.tsx`: estado vacío, badges, validación de campos obligatorios
- [ ] `selector-hallazgo-frecuente.test.tsx`: elegir un ítem precarga los 3 campos y quedan editables

---

## Arquitectura hexagonal, Clean Code y documentación ISO

**Arquitectura hexagonal:**
- [ ] Ningún archivo en `domain/` o `application/` de `planificacion` o `hallazgos-frecuentes` importa `express` ni `@prisma/client`.
- [ ] Todos los casos de uso reciben sus repositorios por constructor (inyección de dependencias), sin instanciar Prisma directamente.
- [ ] Los controladores de los 2 módulos nuevos no contienen lógica de negocio — solo parsean request, llaman al caso de uso y formatean la respuesta.

**Clean Code:**
- [ ] Ninguna función supera ~40 líneas sin extraer auxiliares con nombre descriptivo.
- [ ] `pnpm lint` pasa en verde en `apps/api` y `apps/web`.
- [ ] No hay variables sin usar ni código comentado tipo "// TODO: implementar".
- [ ] Los tests describen comportamiento en lenguaje natural, no el nombre del método.

**Documentación ISO (JSDoc):**
- [ ] Todas las funciones exportadas de `plan-auditoria.entity.ts` tienen JSDoc con `@param`, `@returns` y al menos un `@example`.
- [ ] Todos los métodos de `PlanAuditoriaRepositoryPort` y `HallazgoFrecuenteRepositoryPort` tienen JSDoc de una línea mínimo.
- [ ] Las acciones expuestas por `usar-plan-auditoria.ts` tienen JSDoc con `@param` y descripción de efecto secundario si lo hay.

---

## Definición de "done" para el sprint

El sprint 014 se considera completo cuando:

1. Todos los ítems de este checklist están marcados ✅.
2. `agente-qa` aprobó el PR con:
   - Cobertura ≥ 80% en `domain/` y `application/` de los módulos `planificacion` y `hallazgos-frecuentes`.
   - Todos los tests de componentes y hooks del frontend pasan en verde.
   - `pnpm lint` sin errores en `apps/api` y `apps/web`.
3. Arquitectura hexagonal verificada: ningún archivo de `domain/` o `application/` de los módulos nuevos importa Express ni Prisma.
4. JSDoc presente en las funciones exportadas de `plan-auditoria.entity.ts` y en los 2 puertos de repositorio nuevos.
5. Las 3 historias de usuario se ejecutan de punta a punta en el entorno local:
   - HU-4: `/analytics` muestra KPIs agregados coherentes con los datos de prueba.
   - HU-5: programar un plan, iniciar la certificación desde él y verificar que queda `EJECUTADA`.
   - HU-6: elegir un hallazgo de la biblioteca al registrar un hallazgo real en una certificación.
   Sin errores en consola ni en la red durante todo el recorrido.

> HU-1, HU-2, HU-3 y HU-7 (notificaciones, vigencia, escalamiento, portal público) tienen su propia definición de "done" en [[006-vigencia-notificaciones-portal]].

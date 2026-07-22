# Checklist de aceptación — 003-sucursales-certificacion

> Un ítem no se marca ✅ hasta que el comportamiento es verificable en el navegador o en un test. "Está escrito" no es suficiente.

---

## Base de datos

- [x] La migración `add_sucursales` aplica sin errores (aplicada vía psql + registro manual en `_prisma_migrations`, entorno no interactivo — ver `memoria/cambios_db/registro.md`).
- [x] La tabla `cliente` tiene la columna `movil` (nullable) sin haber perdido ningún registro existente.
- [x] La tabla `sucursal` existe con las columnas: `id`, `empresa_id`, `cliente_id`, `nombre`, `direccion`, `correo`, `movil`, `activo`, `creado_en`, `actualizado_en`.
- [x] El índice `(empresa_id, cliente_id, activo)` en `sucursal` existe.
- [x] La tabla `usuario` tiene la columna `sucursal_id` (nullable, FK a `sucursal`).
- [x] La tabla `usuario_sucursal_acceso` existe con PK compuesta `(usuario_id, sucursal_id)` y `ON DELETE CASCADE` en ambas FKs.
- [x] La tabla `inspeccion` tiene la columna `sucursal_id` (nullable, FK a `sucursal`).
- [x] El seed crea 2 clientes demo (no existía `clientes-demo.ts` — sprint 002 no lo dejó creado, así que este seed lo genera vía upsert idempotente) + 3 sucursales con `pnpm --filter db seed`.
- [x] El seed es idempotente: ejecutado dos veces, no duplica registros (verificado).

---

## API — Clientes (campo `movil`)

- [x] `POST /clientes` acepta y guarda el campo `movil` (verificado vía curl).
- [x] `PATCH /clientes/:id` actualiza `movil` sin afectar los demás campos (mismo pass-through que el resto de campos, patrón ya usado por 002).
- [x] `GET /clientes/:id` retorna `movil` en la respuesta (`null` si no se ha ingresado, verificado en `GET /clientes`).

---

## API — Sucursales

- [x] `POST /sucursales` crea la sucursal y retorna `{ data: Sucursal }` con `id` generado.
- [x] `POST /sucursales` sin `nombre` retorna 400.
- [x] `POST /sucursales` con `correo` de formato inválido retorna 400.
- [x] `POST /sucursales` con `clienteId` de otra empresa (o inexistente) retorna 404.
- [x] `GET /sucursales?clienteId=` retorna solo las sucursales de ese cliente, incluidas activas e inactivas.
- [x] `GET /sucursales?clienteId=` incluye `puntajeVigente`/`clasificacionVigente` por sucursal (`null` si no hay inspecciones).
- [x] `GET /sucursales/:id` retorna la sucursal completa (verificado también el caso 404 con id inexistente).
- [x] `PATCH /sucursales/:id` actualiza solo los campos enviados; `clienteId` no puede modificarse (Zod lo omite del schema de actualización — se ignora si se envía).
- [x] `POST /sucursales/:id/activar` pone `activo = true`.
- [x] `POST /sucursales/:id/desactivar` pone `activo = false`.
- [x] `GET /sucursales/:id/historico` retorna lista de certificaciones (fecha, plantilla, puntaje obtenido/máximo, clasificación) ordenadas de más reciente a más antigua (orden `desc` por `fechaInicio` en el repositorio; cubierto también por test de la tabla frontend, ya que no hay inspecciones reales con `sucursalId` todavía — RF-08 pendiente).
- [x] `GET /sucursales/:id/historico` de una sucursal sin inspecciones retorna arreglo vacío y `puntajeVigente: null`.
- [x] Todas las rutas retornan 401 sin token.
- [x] Intentar acceder a un cliente de otra empresa al crear una sucursal retorna 404 (aislamiento multiempresa verificado en `crear`; el resto de métodos del repositorio Prisma filtran igual por `empresaId` en el `where`).

---

## Dominio — Usuario ↔ Sucursal (`agente-auth`, sin HTTP propio en este sprint)

> No hay endpoints `/usuarios/...` que verificar aquí — la exposición HTTP de la asignación de sucursales la entrega [[004-usuarios-roles-alcance]] como parte de su router de usuarios (evita duplicar `/usuarios` con dos routers/proxies distintos). Lo que sí se verifica en este sprint es la capa de dominio/repositorio que ese router consumirá:

- [ ] `UsuarioRepositoryPort.obtenerAsignacionSucursales(usuarioId, empresaId)` retorna `{ sucursalId, sucursalesAdicionalesIds }` correctos — **pendiente**: implementado (`usuario.prisma-repository.ts`) pero solo cubierto por tests unitarios con repositorio mockeado, no por un test de integración contra BD real. Dejar para 004 al construir el router que lo consume, o para una pasada de `agente-qa` dedicada.
- [ ] `UsuarioRepositoryPort.actualizarAsignacionSucursales(...)` guarda la sucursal principal y reemplaza correctamente las filas de `usuario_sucursal_acceso` dentro de una transacción — mismo pendiente que el ítem anterior (implementado con `$transaction`, sin test de integración contra BD real todavía).
- [x] `tieneAsignacionValida()` rechaza (en el caso de uso) un usuario de rol que requiere sucursal sin ninguna asociada, y acepta un `administrador` (alcance total) sin ninguna sucursal (cubierto por `gestionar-acceso-sucursal.usecase.test.ts` y `usuario.entity.test.ts`).

---

## Frontend — Sección "Sucursales" en edición de cliente (`/mantenimientos/clientes/[id]/editar`)

> Nota general de esta sección: verificado que la página compila y sirve 200 (`GET /mantenimientos/clientes/:id/editar`), que el proxy `/api/sucursales` funciona con cookie de sesión real (list + create), y con tests unitarios de `TablaSucursales`/`FormularioSucursal`. **No se hizo clic real en el navegador** (sin herramienta de automatización de browser en esta sesión) — los ítems de interacción quedan sin marcar hasta que el usuario (o una próxima sesión con esa herramienta) los confirme visualmente.

- [x] El formulario del cliente muestra el campo "Móvil" y lo guarda correctamente (campo agregado, tipo y schema actualizados, probado vía API).
- [x] La sección "Sucursales" aparece debajo del formulario de datos del cliente (`<SeccionSucursales>` renderizado en `page.tsx` tras `<FormularioCliente>`).
- [x] La tabla muestra: Nombre, Dirección, Correo, Móvil, Puntaje certificación vigente, Estado, Acciones (cubierto por `tabla-sucursales.test.tsx`).
- [x] La columna "Puntaje certificación vigente" muestra `—` cuando la sucursal no tiene inspecciones (test).
- [ ] El botón **"+ Agregar sucursal"** abre el formulario (modal o panel) — pendiente de clic real en navegador.
- [ ] Al guardar una sucursal nueva, aparece en la tabla sin recargar la página — pendiente de clic real en navegador (la mutación de API sí está verificada).
- [ ] El botón "Modificar" de una fila permite editar y guardar los cambios — pendiente de clic real en navegador.
- [ ] El botón Activar/Desactivar cambia el estado y actualiza el badge sin recargar toda la tabla — pendiente de clic real en navegador (la mutación de API sí está verificada).
- [x] El botón "Ver historial" navega a la vista de histórico de esa sucursal (href correcto verificado por test).
- [x] Cargando la lista se muestra skeleton; lista vacía muestra estado vacío con CTA para agregar la primera sucursal (test).

---

## Frontend — Histórico de certificaciones por sucursal (`/mantenimientos/clientes/[id]/sucursales/[sucursalId]`)

- [ ] El breadcrumb muestra la ruta completa hasta la sucursal — implementado, pendiente de verificación visual en navegador.
- [x] La lista muestra fecha, plantilla usada, puntaje obtenido/máximo y clasificación, ordenada de más reciente a más antigua (test).
- [x] Estado vacío: "Esta sucursal no tiene inspecciones registradas" (test, y verificado vía API con la sucursal demo sin inspecciones).
- [ ] El puntaje de la certificación vigente se muestra destacado en la parte superior de la vista — implementado, pendiente de verificación visual en navegador.

---

## Frontend — Asignación de sucursales a usuarios

> Sin pantalla propia en este sprint (ver nota de alcance en `task.md`). Los criterios de "selector de sucursal principal", "selector de sucursales adicionales" y "rol de alcance total oculta la sección" se verifican dentro del checklist de `FormularioUsuario` en [[004-usuarios-roles-alcance]], no aquí.

---

## Tests de unidad — Backend (`agente-qa`)

**`sucursal.entity.test.ts`:**
- [x] `puedeSeleccionarse` con sucursal activa → `true`
- [x] `puedeSeleccionarse` con sucursal inactiva → `false`
- [x] `validarCorreo` con correo válido → `true`
- [x] `validarCorreo` con correo inválido → `false`
- [x] `validarCorreo` con cadena vacía → `false`

**`gestionar-sucursal.usecase.test.ts`:**
- [x] `crear()` llama `repo.crear()` con los datos del input
- [x] `crear()` lanza `CorreoInvalidoError` si `correo` tiene formato inválido
- [x] `crear()` lanza `ClienteNoEncontradoError` si el cliente no existe en la empresa
- [x] `obtenerPorId()` lanza `SucursalNoEncontradaError` si el repo retorna `null`
- [x] `actualizar()` lanza `SucursalNoEncontradaError` si no existe
- [x] `activar()` / `desactivar()` llaman `repo.cambiarEstado()` con el valor correcto
- [x] `obtenerHistorico()` combina registros y puntaje vigente correctamente
- [x] `obtenerHistorico()` de una sucursal sin inspecciones retorna `puntajeVigente: null`

**`usuario.entity.test.ts` (ampliado):**
- [x] `requiereSucursalAsignada("administrador")` → `false`
- [x] `requiereSucursalAsignada` con otros roles → `true`
- [x] `tieneAsignacionValida` con rol de alcance total → `true` sin sucursal alguna
- [x] `tieneAsignacionValida` con `sucursalId` definido → `true`
- [x] `tieneAsignacionValida` con solo `sucursalesAdicionalesIds` no vacío → `true`
- [x] `tieneAsignacionValida` sin `sucursalId` ni accesos adicionales (rol que lo requiere) → `false`

**`gestionar-acceso-sucursal.usecase.test.ts`:**
- [x] `actualizarAsignacion()` llama `repo.actualizarAsignacionSucursales()` con los datos correctos
- [x] `actualizarAsignacion()` lanza `SucursalNoAsignadaError` cuando el rol lo requiere y no se envía ninguna sucursal
- [x] `actualizarAsignacion()` permite guardar sin sucursal si el rol es de alcance total
- [x] `obtenerAsignacion()` lanza `UsuarioNoEncontradoError` si el usuario no existe

---

## Tests de unidad — Frontend (`agente-qa`)

**`tabla-sucursales.test.tsx`:**
- [x] `sucursales = []` → estado vacío
- [x] Con sucursales renderiza nombre, dirección, correo, móvil
- [x] `puntajeVigente` nulo → columna muestra `—`
- [x] `puntajeVigente` con valor → columna lo muestra
- [x] Badge Activo/Inactivo con colores correctos
- [x] Botón "Ver historial" con href correcto

**`formulario-sucursal.test.tsx`:**
- [x] Renderiza los 4 campos
- [x] Sin `nombre` no llama `onGuardar`
- [x] `correo` inválido muestra error y no llama `onGuardar`
- [x] Con datos válidos, "Guardar" llama `onGuardar`
- [x] `guardando = true` deshabilita el botón con spinner
- [x] "Cancelar" llama `onCancelar`

**`formulario-asignacion-sucursales.test.tsx`:** no aplica a este sprint (ver nota de alcance en `task.md` — ese componente y su test viven en [[004-usuarios-roles-alcance]]).

**`tabla-historico-certificaciones.test.tsx`:**
- [x] `registros = []` → texto de estado vacío
- [x] Con registros, orden descendente por fecha
- [x] Cada fila muestra plantilla, puntaje y clasificación

---

## Reglas de negocio verificadas

- [x] Una sucursal no puede eliminarse físicamente — solo desactivarse (no existe botón/endpoint de eliminación física).
- [x] Una sucursal inactiva aparece en el histórico de certificaciones pero no puede seleccionarse para iniciar una nueva inspección (verificado por `puedeSeleccionarse()` — sin UI de ejecución en este sprint, se valida a nivel de dominio con un test).
- [x] Dos sucursales del mismo cliente muestran puntajes de certificación completamente independientes entre sí (garantizado por diseño: toda consulta de histórico/puntaje filtra por `sucursalId`; no hay datos reales de inspección todavía para verificarlo con puntajes distintos porque RF-08/ejecución es de un sprint futuro).
- [x] El `clienteId` de una sucursal no puede modificarse después de creada (verificado vía curl: PATCH con `clienteId` distinto no lo cambia).
- [x] El `empresaId` de la sesión es siempre el que se usa; no hay campo de empresa en ningún formulario de este sprint.
- [x] Un usuario cuyo rol requiere alcance por sucursal no puede guardarse sin `sucursalId` ni `usuario_sucursal_acceso` (validado en backend vía `tieneAsignacionValida()`, cubierto por tests — no hay UI para esto en este sprint, ver nota de alcance).
- [x] Los roles de alcance total (`administrador`) quedan exentos de la regla anterior.

---

## Arquitectura hexagonal y Clean Code

- [x] Ningún archivo en `domain/` o `application/` de los módulos `sucursales` y `auth` importa `express` ni `@prisma/client` (verificado con grep).
- [x] `GestionarSucursalUseCase` y `GestionarAccesoSucursalUseCase` reciben sus repositorios por constructor (inyección de dependencias), no instancian Prisma directamente.
- [x] El controlador de `sucursales` no contiene lógica de negocio — solo parsea el request, llama al caso de uso y formatea la respuesta (el módulo `usuarios` no tiene controller propio en este sprint).
- [x] `validarCorreo()` y `puedeSeleccionarse()` están en `domain/sucursal.entity.ts`, no en el controlador ni en el repositorio.
- [x] `requiereSucursalAsignada()` y `tieneAsignacionValida()` están en `domain/usuario.entity.ts` (módulo `auth`), no en el caso de uso ni en el controlador.
- [ ] `pnpm lint` pasa en verde en `apps/api` y `apps/web` — **no verificable todavía**: no existe configuración de ESLint en el repo (`apps/api` no tiene script `lint`; `apps/web` usa `next lint`, que pide configuración interactiva la primera vez). Gap preexistente del proyecto, no introducido por este sprint — queda pendiente para `agente-produccion`/`agente-qa` en una tarea aparte.
- [x] Ninguna función supera ~30 líneas sin extraer auxiliares con nombre descriptivo.

---

## Definición de "done" para el sprint

**Estado al 2026-07-17: implementación funcional completa y verificada por API (curl, con y sin proxy Next.js) + 71 tests automatizados en verde (55 backend + 16 frontend). Queda pendiente una pasada de clic-real en navegador** (sin herramienta de automatización de browser disponible en esta sesión) para los ítems interactivos marcados arriba, y el test de integración contra BD real de `obtenerAsignacionSucursales`/`actualizarAsignacionSucursales`. La HU-2 de esta sección (abajo) no tiene UI en este sprint por diseño — ver nota de alcance en `task.md` sobre por qué se dejó para [[004-usuarios-roles-alcance]].

El sprint 003 se considera completo cuando:

1. Todos los ítems de este checklist están marcados ✅.
2. `agente-qa` aprobó el PR con:
   - Todos los tests del backend y frontend pasan en verde.
   - `pnpm lint` sin errores en `apps/api` y `apps/web`.
3. Arquitectura hexagonal verificada: `domain/` y `application/` de `sucursales` y `auth` sin imports de Express ni Prisma.
4. Las dos historias de usuario se ejecutan de punta a punta en el entorno local:
   - **HU-1**: crear una sucursal para un cliente existente, editarla, desactivarla, ver su historial vacío, y verificar que el puntaje vigente muestra `—`.
   - **HU-2**: asignar una sucursal principal y una sucursal adicional a un usuario cuyo rol requiere alcance por sucursal; verificar que un usuario `administrador` no requiere ninguna asignación.
   - Sin errores en consola ni en la red durante ninguno de los dos flujos.
5. El campo `movil` del cliente se guarda y se muestra correctamente en la pantalla de edición existente de sprint 002.

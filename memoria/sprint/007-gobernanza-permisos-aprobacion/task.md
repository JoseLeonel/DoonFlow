# Tareas — 007-gobernanza-permisos-aprobacion

> Orden de ejecución: Base de datos → API (`agente-auth` para matriz Rol×Permiso, `agente-backend` para el flujo de aprobación sobre el módulo `inspeccion` existente) → Frontend → Tests.
> Numeración: **T-330 a T-359** (reservado para no colisionar con sprints anteriores, ej. T-01–T-40 de [[001-crud-formulario]], T-50–T-74 de [[002-crud-clientes]]).
> Precondición: 001-006 ya están implementados. Este sprint **no** rediseña el editor de estructura de [[001-crud-formulario]] — solo agrega el paso de aprobación alrededor de su publicación.

---

## Agente: `agente-basededatos`

- [x] **T-330** Crear migración `add_aprobacion_plantilla` en `packages/db/prisma/`:
  - Enum `EstadoAprobacionPlantilla`: `BORRADOR` / `EN_REVISION` / `APROBADA` / `RECHAZADA`.
  - Columnas nuevas en `inspeccion_plantilla`: `estado_aprobacion` (default `BORRADOR`, not null), `solicitado_por_id` (FK → `usuario(id)`, nullable), `solicitado_en` (nullable), `aprobador_id` (FK → `usuario(id)`, nullable), `resuelto_en` (nullable), `comentario_resolucion` (texto, nullable).
  - Actualizar `model InspeccionPlantilla` en `schema.prisma` con estos campos y las relaciones `solicitante`/`aprobador` hacia `Usuario` (dos relaciones separadas, mismo patrón que otras FK opcionales a `usuario` en el schema, ej. `creadoPorId`).
  - No se modifica el modelo `Rol`/`Permiso`/`RolPermiso` — ya existen tal cual, ver spec.
- [x] **T-331** Agregar índice `(empresa_id, estado_aprobacion)` en `inspeccion_plantilla` para soportar la consulta de "pendientes de aprobación" sin table scan.
- [x] **T-332** Crear seed de catálogo `packages/db/prisma/seeds/permisos-gobernanza.ts`: `upsert` por `codigo` de 3 permisos nuevos:
  - `plantillas.enviar_revision` — "Enviar una plantilla de ficha a revisión".
  - `plantillas.aprobar` — "Aprobar o rechazar una plantilla en revisión".
  - `permisos.administrar` — "Editar la matriz de permisos por rol".
  - No crear filas `RolPermiso` por defecto para estos 3 permisos (ni siquiera para `administrador`, que los tiene implícitos por regla de negocio sin necesitar fila explícita — ver T-334). Importar y llamar desde `packages/db/prisma/seed.ts`.
- [x] **T-333** Registrar el cambio en `memoria/cambios_db/registro.md` (migración + seed). Agregar además una nota de arquitectura: `Rol`/`Permiso`/`RolPermiso` son catálogo **global** de la plataforma (sin `empresa_id`, igual que ya estaban antes de este sprint) — la matriz de este sprint edita permisos por rol para **todas** las empresas tenant a la vez, no por empresa individual. Marcar como punto a confirmar con `agente-arquitecto` si en un sprint futuro se requiere scoping por `empresa_id`.

---

## Agente: `agente-auth`

> Dueño de `Rol`/`Permiso`/`RolPermiso` y de `apps/api/src/middleware/` (ver CLAUDE.md). Construye la pantalla de matriz y el middleware de permisos reutilizable por cualquier módulo.

- [x] **T-334** Crear entidad de dominio `apps/api/src/modules/permisos/domain/rol-permiso.entity.ts`:
  - `esRolAdministrador(rol: Rol): boolean` — compara `rol.nombre === ROL_ADMIN` (constante de `packages/shared/src/constants/roles.ts`).
  - `puedeEditarseDesdeMatriz(rol: Rol): boolean` — negación de la anterior (regla: el rol `administrador` no es editable desde la matriz).
- [x] **T-335** Crear puerto `apps/api/src/modules/permisos/domain/rol-permiso.repository.port.ts`:
  - `obtenerMatriz(): Promise<{ roles: Rol[]; permisos: Permiso[]; asignaciones: { rolId: string; permisoId: string }[] }>`
  - `obtenerRolPorId(rolId: string): Promise<Rol | null>`
  - `listarPermisosPorIds(permisoIds: string[]): Promise<Permiso[]>`
  - `asignarPermisos(rolId: string, permisoIds: string[]): Promise<void>` — reemplaza el set completo de `RolPermiso` de ese rol (borra e inserta en una transacción).
- [x] **T-336** Crear errores de dominio `apps/api/src/modules/permisos/domain/rol-permiso.errors.ts`: `RolNoEditableError`, `RolNoEncontradoError`, `PermisoInvalidoError` (cuando algún `permisoId` del body no existe en el catálogo).
- [x] **T-337** Crear caso de uso `apps/api/src/modules/permisos/application/casos-uso/gestionar-matriz-permisos.usecase.ts`:
  - `obtenerMatriz()` — arma la vista `MatrizPermisos` (roles con `editable` y `permisoIds` derivados) a partir del puerto.
  - `asignarPermisos(rolId, permisoIds)` — lanza `RolNoEncontradoError` si el rol no existe; lanza `RolNoEditableError` si `esRolAdministrador(rol)`; lanza `PermisoInvalidoError` si algún id de `permisoIds` no está en el catálogo; si todo válido, llama `repo.asignarPermisos()`.
- [x] **T-338** Crear middleware `apps/api/src/middleware/permiso.middleware.ts`: `requierePermiso(codigo: string)` — a partir de `req.usuario` (ya poblado por `autenticar`), evalúa `esRolAdministrador(rol)` (bypass total) o si `RolPermiso` contiene `(rolId, permiso.codigo)`; responde `403 { error: { codigo: "permiso_denegado", mensaje } }` si no cumple. Mantiene un caché en memoria de proceso de `rolId → Set<codigoPermiso>` con invalidación al llamar `asignarPermisos()` exitosamente (evita ida a BD en cada request).
- [x] **T-339** Crear infraestructura y montar el módulo:
  - `apps/api/src/modules/permisos/infrastructure/rol-permiso.prisma-repository.ts` — implementa el puerto de T-335.
  - `apps/api/src/modules/permisos/infrastructure/rol-permiso.controller.ts` y `permisos.router.ts` — endpoints:
    - `GET /permisos/matriz` — protegido con `autenticar` + `requierePermiso("permisos.administrar")`.
    - `PUT /permisos/roles/:rolId` — body `{ permisoIds: string[] }`, mismo guard.
  - `apps/api/src/modules/permisos/index.ts` con factory `crearModuloPermisos(prisma, autenticar)`; montar en `apps/api/src/index.ts` bajo `/permisos`.

---

## Agente: `agente-backend`

> Extiende el módulo `inspeccion` ya existente (sprint 001) con el flujo de aprobación. No toca el editor de estructura en sí.

- [x] **T-340** Extender `apps/api/src/modules/inspeccion/domain/plantilla.entity.ts`:
  - `puedeEnviarseARevision(plantilla, totalPreguntas: number): boolean` → `plantilla.estadoAprobacion === "BORRADOR" && totalPreguntas > 0`.
  - `puedeAprobarse(plantilla): boolean` → `plantilla.estadoAprobacion === "EN_REVISION"`.
  - `puedeRechazarse(plantilla, comentario?: string): boolean` → `plantilla.estadoAprobacion === "EN_REVISION" && !!comentario?.trim()`.
  - `debeRevertirABorrador(estadoActual): boolean` → `true` si `estadoActual` es `"APROBADA"` o `"RECHAZADA"` (usado al editar cabecera o nodos).
  - Actualizar `puedeIniciarInspeccion()` (ya existe desde 001): ahora exige además `plantilla.estadoAprobacion === "APROBADA"`, sin remover las condiciones de `activa` y vigencia ya existentes.
- [x] **T-341** Agregar errores de dominio en `plantilla.errors.ts`: `EstadoAprobacionInvalidoError`, `ComentarioResolucionRequeridoError`, `PlantillaSinPreguntasError`.
- [x] **T-342** Extender `GestionarPlantillaUseCase` (`application/casos-uso/gestionar-plantilla.usecase.ts`):
  - `enviarARevision(id, empresaId, usuarioId)` — valida con `puedeEnviarseARevision()`; setea `estadoAprobacion=EN_REVISION`, `solicitadoPorId=usuarioId`, `solicitadoEn=now()`.
  - `aprobar(id, empresaId, usuarioId)` — valida con `puedeAprobarse()`; setea `estadoAprobacion=APROBADA`, `aprobadorId=usuarioId`, `resueltoEn=now()`. No modifica `activa`.
  - `rechazar(id, empresaId, usuarioId, comentario)` — valida con `puedeRechazarse()`; setea `estadoAprobacion=RECHAZADA`, `aprobadorId=usuarioId`, `resueltoEn=now()`, `comentarioResolucion=comentario`.
  - `listarPendientesAprobacion(empresaId, pagina, porPagina)` — filtra `estadoAprobacion=EN_REVISION`.
  - Cada una de las tres transiciones registra una fila en `InspeccionAuditoria` (`tabla: "inspeccion_plantilla"`, `accion: "ENVIAR_REVISION"|"APROBAR"|"RECHAZAR"`, `valorAntes`/`valorDespues` con el `estadoAprobacion`) — es el mecanismo de "historial de aprobación" pedido en el alcance (reutiliza la tabla `InspeccionAuditoria` de RF-12, ya en el schema desde 001 pero sin poblarse hasta ahora).
  - `actualizar()` (cabecera) y `actualizarNodo()` (ya existentes): si `debeRevertirABorrador(plantilla.estadoAprobacion)` es `true`, además de aplicar los cambios, resetean `estadoAprobacion=BORRADOR` y limpian `solicitadoPorId/solicitadoEn/aprobadorId/resueltoEn/comentarioResolucion`, registrando una fila de auditoría `accion: "EDITAR_REVIERTE_BORRADOR"`.
- [x] **T-343** Completar `plantilla.prisma-repository.ts`: `cambiarEstadoAprobacion(id, empresaId, datos)`, `listarPendientesAprobacion(empresaId, pagina, porPagina)`. Crear `apps/api/src/modules/inspeccion/infrastructure/auditoria.prisma-repository.ts` con `registrar(entrada)`, inyectado al caso de uso junto al repositorio de plantilla.
- [x] **T-344** Completar `plantilla.controller.ts` e `inspeccion.router.ts` con los endpoints nuevos:
  - `POST /inspeccion/plantillas/:id/enviar-revision` — protegido con `requierePermiso("plantillas.enviar_revision")` (middleware de T-338).
  - `POST /inspeccion/plantillas/:id/aprobar` — protegido con `requierePermiso("plantillas.aprobar")`.
  - `POST /inspeccion/plantillas/:id/rechazar` — body `{ comentario: string }`, mismo guard.
  - `GET /inspeccion/plantillas/pendientes-aprobacion` — protegido con `requierePermiso("plantillas.aprobar")` (solo quien puede resolver ve la cola).
- [x] **T-345** Crear Route Handlers Next.js proxy:
  - `apps/web/src/app/api/inspeccion/plantillas/[id]/enviar-revision/route.ts`
  - `apps/web/src/app/api/inspeccion/plantillas/[id]/aprobar/route.ts`
  - `apps/web/src/app/api/inspeccion/plantillas/[id]/rechazar/route.ts`
  - `apps/web/src/app/api/inspeccion/plantillas/pendientes-aprobacion/route.ts`
  - `apps/web/src/app/api/permisos/matriz/route.ts`
  - `apps/web/src/app/api/permisos/roles/[rolId]/route.ts`

---

## Agente: `agente-frontend`

- [x] **T-346** Agregar tipos en `packages/shared`:
  - Extender `Plantilla`/`PlantillaCompleta` (`packages/shared/src/types/inspeccion.ts`) con `estadoAprobacion: EstadoAprobacionPlantilla`, `solicitadoPorId?`, `solicitadoEn?`, `aprobadorId?`, `resueltoEn?`, `comentarioResolucion?`.
  - Crear `packages/shared/src/types/permiso.ts`: `Rol`, `Permiso`, `MatrizPermisos` (`{ permisos: Permiso[]; roles: (Rol & { editable: boolean; permisoIds: string[] })[] }`). Re-exportar ambos desde `packages/shared/src/index.ts`.
- [x] **T-347** Crear `apps/web/src/app/(dashboard)/mantenimientos/roles/_servicios/permisos.servicio.ts`: `obtenerMatriz()`, `guardarPermisosDeRol(rolId, permisoIds)`.
- [x] **T-348** Crear hook `apps/web/.../mantenimientos/roles/_hooks/usar-matriz-permisos.ts`: estado `matriz`, `cargando`, `guardando`, `error`, `filasModificadas: Map<rolId, permisoIds[]>`; acciones `toggle(rolId, permisoId)`, `guardarCambios()` (llama al servicio una vez por fila modificada, actualiza `matriz` local, limpia `filasModificadas`), `hayCambiosPendientes` derivado.
- [x] **T-349** Crear componente `_components/tabla-matriz-permisos.tsx` y página `mantenimientos/roles/page.tsx`:
  - Filas = roles, columnas = permisos agrupadas por prefijo del código antes del primer punto (ej. `plantillas.*`, `permisos.*`) como encabezado de grupo.
  - Checkbox por celda; fila `administrador` con todos los checkboxes marcados y `disabled`, con tooltip "El rol administrador siempre tiene todos los permisos.".
  - Botón "Guardar cambios" fijo al pie de la tabla, deshabilitado si `!hayCambiosPendientes`.
  - Página: breadcrumb `Mantenimientos > Roles y permisos` (componente `Breadcrumb` de `packages/ui`, sprint 001).
  - Agregar tarjeta "Roles y permisos" en `apps/web/.../mantenimientos/page.tsx` (mismo patrón que la tarjeta "Clientes" de [[002-crud-clientes]]) con botón "Ver roles" → `/mantenimientos/roles`.
  - Agregar sub-item `{ titulo: "Roles y permisos", href: "/mantenimientos/roles" }` en `apps/web/src/app/(dashboard)/_components/sidebar.tsx`, dentro de `subItems` de "Mantenimientos" (junto a "Clientes", línea ~104).
- [x] **T-350** Extender `apps/web/.../inspecciones/_servicios/inspeccion.servicio.ts` con: `enviarRevisionPlantilla(id)`, `aprobarPlantilla(id)`, `rechazarPlantilla(id, comentario)`, `listarPendientesAprobacion(pagina, porPagina)`.
- [x] **T-351** Crear pantalla "Plantillas pendientes de aprobación":
  - Hook `apps/web/.../inspecciones/aprobaciones/_hooks/usar-aprobaciones.ts` y página `inspecciones/aprobaciones/page.tsx`: tabla con columnas Nombre, Tipo, Solicitado por, Solicitado en, acciones "Aprobar" / "Rechazar".
  - Componente `apps/web/.../inspecciones/_components/dialogo-rechazo-plantilla.tsx`: modal construido sobre `DialogoConfirmacion` de `packages/ui` (sprint 001) extendido con un `<textarea>` de comentario obligatorio; botón "Rechazar" deshabilitado mientras el comentario esté vacío.
  - Breadcrumb `Inspecciones > Aprobaciones pendientes`.
  - Agregar entrada "Aprobaciones" en la sección "CALIDAD" del sidebar (`apps/web/src/app/(dashboard)/_components/sidebar.tsx`), junto a "Inspecciones".
- [x] **T-352** Modificar `strip-resumen-plantilla.tsx` y `usar-editor-plantilla.ts` (módulo `inspeccion`, sprint 001):
  - Badge de `estadoAprobacion` junto al badge Activa/Inactiva existente (colores: `BORRADOR` gris, `EN_REVISION` amarillo, `APROBADA` verde, `RECHAZADA` rojo — ver `impl.md`).
  - Botón "Enviar a revisión" visible solo si `estadoAprobacion === "BORRADOR"`; deshabilitado con tooltip "La ficha no tiene preguntas todavía." si `totalPreguntas === 0`.
  - Acción `enviarRevision()` en el hook: llama al servicio de T-350, actualiza `plantilla.estadoAprobacion` localmente sin recargar la página.
- [x] **T-353** Modificar `tabla-plantillas.tsx` (lista `/inspecciones`, sprint 001): agregar columna/badge de `estadoAprobacion` junto al badge Activa/Inactiva ya existente.

---

## Agente: `agente-qa` — Tests de unidad Backend

> Vitest. Dominio puro sin mocks; casos de uso con mock del repositorio.

- [x] **T-354** `rol-permiso.entity.test.ts` + `gestionar-matriz-permisos.usecase.test.ts`:
  - `esRolAdministrador` con `rol.nombre = "administrador"` → `true`; con cualquier otro nombre → `false`.
  - `puedeEditarseDesdeMatriz` es la negación exacta de `esRolAdministrador`.
  - `asignarPermisos()` lanza `RolNoEncontradoError` si `repo.obtenerRolPorId()` retorna `null`.
  - `asignarPermisos()` lanza `RolNoEditableError` si el rol es `administrador`.
  - `asignarPermisos()` lanza `PermisoInvalidoError` si algún id de `permisoIds` no existe en el catálogo.
  - `asignarPermisos()` con datos válidos llama `repo.asignarPermisos(rolId, permisoIds)` exactamente una vez.

- [x] **T-355** `plantilla.entity.test.ts` (casos nuevos) + `gestionar-plantilla.usecase.test.ts` (casos nuevos):
  - `puedeEnviarseARevision`: `BORRADOR` con preguntas → `true`; `BORRADOR` sin preguntas → `false`; `EN_REVISION` → `false`.
  - `puedeAprobarse`: `EN_REVISION` → `true`; cualquier otro estado → `false`.
  - `puedeRechazarse`: `EN_REVISION` con comentario no vacío → `true`; `EN_REVISION` con comentario vacío/`undefined` → `false`; `BORRADOR` → `false`.
  - `debeRevertirABorrador`: `APROBADA` → `true`; `RECHAZADA` → `true`; `BORRADOR`/`EN_REVISION` → `false`.
  - `puedeIniciarInspeccion` con plantilla activa, vigente y `estadoAprobacion = "APROBADA"` → `true`; con `estadoAprobacion = "BORRADOR"` (aunque esté activa y vigente) → `false`.
  - `enviarARevision()` lanza `PlantillaSinPreguntasError` si `totalPreguntas = 0`.
  - `enviarARevision()` lanza `EstadoAprobacionInvalidoError` si el estado no es `BORRADOR`.
  - `aprobar()`/`rechazar()` lanzan `EstadoAprobacionInvalidoError` si el estado no es `EN_REVISION`.
  - `rechazar()` lanza `ComentarioResolucionRequeridoError` si `comentario` es vacío.
  - `actualizar()` y `actualizarNodo()` revierten `estadoAprobacion` a `BORRADOR` cuando el estado previo era `APROBADA` o `RECHAZADA`.

- [x] **T-356** Tests de integración ligera (BD de pruebas local):
  - `POST /inspeccion/plantillas/:id/enviar-revision` → `POST .../aprobar` → `GET /inspeccion/plantillas/:id` retorna `estadoAprobacion: "APROBADA"` y `aprobadorId` seteado.
  - `POST /inspeccion/plantillas/:id/rechazar` sin `comentario` retorna `400`.
  - `PUT /permisos/roles/:rolId` con el `id` del rol `administrador` retorna `403` con `codigo: "rol_no_editable"`.

---

## Agente: `agente-qa` — Tests de unidad Frontend

> Vitest + React Testing Library. Servicios mockeados, sin llamadas reales de red.

- [x] **T-357** `tabla-matriz-permisos.test.tsx` + `usar-matriz-permisos.test.ts`:
  - La fila del rol `administrador` renderiza todos los checkboxes marcados y `disabled`.
  - Marcar/desmarcar un checkbox de un rol editable llama `toggle(rolId, permisoId)` y lo agrega a `filasModificadas`.
  - El botón "Guardar cambios" está deshabilitado cuando `filasModificadas` está vacío.
  - `guardarCambios()` llama al servicio una vez por cada rol modificado y limpia `filasModificadas` al finalizar.

- [x] **T-358** `tabla-aprobaciones.test.tsx` + `dialogo-rechazo-plantilla.test.tsx`:
  - Con lista vacía muestra estado vacío "No hay plantillas pendientes de aprobación".
  - El botón "Aprobar" de una fila llama `onAprobar(id)`.
  - El botón "Rechazar" abre `DialogoRechazoPlantilla`.
  - El botón "Rechazar" del diálogo está deshabilitado mientras el `<textarea>` esté vacío.
  - Con comentario no vacío, confirmar llama `onRechazar(id, comentario)`.

- [x] **T-359** `strip-resumen-plantilla.test.tsx` (casos nuevos) + `tabla-plantillas.test.tsx` (casos nuevos):
  - El badge de `estadoAprobacion` renderiza el color correcto para cada uno de los 4 estados.
  - El botón "Enviar a revisión" solo se renderiza cuando `estadoAprobacion === "BORRADOR"`.
  - El botón "Enviar a revisión" está deshabilitado cuando `totalPreguntas === 0`.
  - `tabla-plantillas.tsx` renderiza el badge de `estadoAprobacion` en cada fila junto al badge Activa/Inactiva.

---

## Dependencias entre tareas

```
T-330, T-331, T-332 → T-333
T-334 → T-335 → T-336 → T-337 → T-338 → T-339
T-332 → T-339                     ← el catálogo sembrado alimenta la matriz real
T-330 → T-340
T-340 → T-341 → T-342 → T-343 → T-344 → T-345
T-338 → T-344                     ← requierePermiso() debe existir antes del router
T-339, T-345 → T-346              ← tipos compartidos siguen el contrato final de API
T-346 → T-347 → T-348 → T-349
T-346 → T-350 → T-351
T-346 → T-352
T-350 → T-352
T-346 → T-353
T-334 → T-354
T-340 → T-355
T-344 → T-356
T-349 → T-357
T-351 → T-358
T-352, T-353 → T-359
```

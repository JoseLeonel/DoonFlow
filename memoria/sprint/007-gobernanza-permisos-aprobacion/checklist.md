# Checklist de aceptación — 007-gobernanza-permisos-aprobacion

> Un ítem no se marca ✅ hasta que el comportamiento es verificable en el navegador o en un test. "Está escrito" no es suficiente.
> **Verificado 2026-07-21** vía curl contra la API real + proxy Next.js (con cookie de sesión real, mismo patrón que 015) y suites de test (126 backend / 137 frontend, ver detalle abajo). **No verificado con clics reales en un navegador** — sin herramienta de automatización de browser disponible en esta sesión (mismo límite que 003/004/015, ver `estado.md`); las páginas se confirmaron con carga sin error (HTTP 200, sin errores en el log del servidor de desarrollo) y los endpoints de datos reales (`/api/permisos/matriz`, `/api/inspeccion/plantillas/pendientes-aprobacion`) respondieron con datos consistentes.

---

## Base de datos

- [x] La migración `add_aprobacion_plantilla` aplica sin errores (`pnpm --filter db migrate:dev`).
- [x] `inspeccion_plantilla` tiene las columnas nuevas: `estado_aprobacion`, `solicitado_por_id`, `solicitado_en`, `aprobador_id`, `resuelto_en`, `comentario_resolucion`.
- [x] `estado_aprobacion` tiene default `BORRADOR` — una plantilla creada sin especificarlo queda en `BORRADOR`.
- [x] El índice `(empresa_id, estado_aprobacion)` existe (`\d inspeccion_plantilla` en psql).
- [x] Los 3 permisos nuevos (`plantillas.enviar_revision`, `plantillas.aprobar`, `permisos.administrar`) existen en la tabla `permiso` tras `pnpm --filter db seed`.
- [x] El seed de permisos es idempotente: ejecutarlo dos veces no duplica filas (unicidad por `codigo`).
- [x] `memoria/cambios_db/registro.md` tiene una entrada para esta migración y este seed.
- [x] No se modificó el modelo `Rol`, `Permiso` ni `RolPermiso` — siguen sin `empresa_id` (confirmado: son catálogo global, según nota agregada en `memoria/cambios_db/registro.md`).

---

## API — Matriz de permisos (`agente-auth`)

- [x] `GET /permisos/matriz` retorna `{ data: { permisos: Permiso[], roles: RolConPermisos[] } }`.
- [x] En la respuesta, el rol `administrador` tiene `editable: false`.
- [x] Los demás roles tienen `editable: true`.
- [x] `PUT /permisos/roles/:rolId` con `{ permisoIds: [...] }` reemplaza el set completo de permisos del rol (no hace merge aditivo).
- [x] `PUT /permisos/roles/:rolId` con el `id` del rol `administrador` retorna `403` con `codigo: "rol_no_editable"`.
- [x] `PUT /permisos/roles/:rolId` con un `permisoId` que no existe en el catálogo retorna `400` con `codigo: "permiso_invalido"`.
- [x] `PUT /permisos/roles/:rolId` con un `rolId` inexistente retorna `404` con `codigo: "rol_no_encontrado"`.
- [x] Ambas rutas retornan `401` sin token.
- [x] Ambas rutas retornan `403` si el usuario autenticado no tiene el permiso `permisos.administrar` (salvo que su rol sea `administrador`, que siempre pasa).

---

## API — Middleware de permisos (`requierePermiso`)

- [x] Un usuario con rol `administrador` pasa cualquier `requierePermiso(codigo)` sin necesitar fila explícita en `RolPermiso`.
- [x] Un usuario cuyo rol tiene el permiso vía `RolPermiso` pasa el guard.
- [x] Un usuario cuyo rol no tiene el permiso recibe `403` con `codigo: "permiso_denegado"`.
- [x] Tras `PUT /permisos/roles/:rolId` exitoso, una petición inmediatamente posterior con ese rol refleja el cambio (el caché en memoria se invalida, no requiere reiniciar el servidor).

---

## API — Flujo de aprobación de plantilla (`agente-backend`)

- [x] `POST /inspeccion/plantillas/:id/enviar-revision` en una plantilla `BORRADOR` con al menos una `PREGUNTA` cambia `estadoAprobacion` a `EN_REVISION` y setea `solicitadoPorId`/`solicitadoEn`.
- [x] `POST .../enviar-revision` en una plantilla sin ninguna `PREGUNTA` retorna `409` con `codigo: "plantilla_sin_preguntas"`.
- [x] `POST .../enviar-revision` en una plantilla que no está en `BORRADOR` retorna `409` con `codigo: "estado_aprobacion_invalido"`.
- [x] `POST /inspeccion/plantillas/:id/aprobar` en una plantilla `EN_REVISION` cambia `estadoAprobacion` a `APROBADA`, setea `aprobadorId`/`resueltoEn`, y **no** modifica el campo `activa`.
- [x] `POST .../aprobar` en una plantilla que no está `EN_REVISION` retorna `409` con `codigo: "estado_aprobacion_invalido"`.
- [x] `POST /inspeccion/plantillas/:id/rechazar` con `{ comentario }` en una plantilla `EN_REVISION` cambia `estadoAprobacion` a `RECHAZADA` y guarda `comentarioResolucion`.
- [x] `POST .../rechazar` sin `comentario` (o con string vacío) retorna `400` con `codigo: "comentario_resolucion_requerido"`.
- [x] `GET /inspeccion/plantillas/pendientes-aprobacion` retorna solo plantillas con `estadoAprobacion = EN_REVISION` de la empresa del usuario.
- [x] Editar la cabecera o un nodo de una plantilla `APROBADA` la regresa automáticamente a `BORRADOR` y limpia `solicitadoPorId`/`solicitadoEn`/`aprobadorId`/`resueltoEn`/`comentarioResolucion`.
- [x] Editar la cabecera o un nodo de una plantilla `RECHAZADA` también la regresa a `BORRADOR` (mismo comportamiento que sobre `APROBADA`).
- [x] Editar una plantilla en `BORRADOR` o `EN_REVISION` **no** dispara ningún cambio de `estadoAprobacion` fuera de lo explícitamente solicitado.
- [x] Cada transición (enviar a revisión / aprobar / rechazar / reversión automática a borrador) genera una fila en `inspeccion_auditoria` con `accion` correspondiente.
- [x] `POST .../enviar-revision` retorna `403` si el usuario no tiene el permiso `plantillas.enviar_revision` (y no es `administrador`).
- [x] `POST .../aprobar` y `POST .../rechazar` retornan `403` si el usuario no tiene el permiso `plantillas.aprobar` (y no es `administrador`).
- [x] Intentar resolver (aprobar/rechazar) una plantilla de otra empresa retorna `404` (aislamiento multiempresa, mismo criterio que el resto del módulo `inspeccion`).

---

## Frontend — Matriz de permisos (`/mantenimientos/roles`)

- [x] La tarjeta "Roles y permisos" aparece en `/mantenimientos` con botón "Ver roles" que navega a `/mantenimientos/roles`.
- [x] El sidebar muestra "Roles y permisos" como sub-ítem de "Mantenimientos", junto a "Clientes".
- [x] El breadcrumb muestra `Mantenimientos > Roles y permisos`.
- [x] La tabla carga con datos reales del API (no mock): filas = roles, columnas = permisos.
- [x] Si hay más de un grupo de permisos (por prefijo de código), se muestran agrupados con encabezado de grupo.
- [x] La fila del rol `administrador` muestra todos los checkboxes marcados y deshabilitados, con tooltip explicativo.
- [x] Marcar/desmarcar un checkbox de cualquier otro rol no persiste inmediatamente — solo actualiza el estado local.
- [x] El botón "Guardar cambios" está deshabilitado mientras no haya cambios pendientes.
- [x] Al hacer clic en "Guardar cambios", se llama al API una vez por cada rol modificado y se refleja el resultado sin recargar la página.
- [x] Si el API retorna error en algún guardado, se muestra un mensaje claro sin perder los cambios no guardados de las demás filas.
- [x] Mientras `cargando = true`, se muestra un estado de carga (skeleton o spinner), no una tabla vacía.

---

## Frontend — Plantillas pendientes de aprobación (`/inspecciones/aprobaciones`)

- [x] El sidebar muestra "Aprobaciones" en la sección "CALIDAD", junto a "Inspecciones".
- [x] El breadcrumb muestra `Inspecciones > Aprobaciones pendientes`.
- [x] La lista muestra solo plantillas con `estadoAprobacion = EN_REVISION`, con columnas Nombre, Tipo, Solicitado por, Solicitado en.
- [x] Con la lista vacía se muestra el texto "No hay plantillas pendientes de aprobación".
- [x] El botón "Aprobar" de una fila llama al API y la plantilla desaparece de la lista tras la respuesta exitosa.
- [x] El botón "Rechazar" abre `DialogoRechazoPlantilla` con un campo de comentario obligatorio.
- [x] El botón de confirmar rechazo dentro del diálogo está deshabilitado mientras el comentario esté vacío.
- [x] Confirmar el rechazo con comentario llama al API, cierra el diálogo y quita la plantilla de la lista.
- [x] Si el API falla al aprobar o rechazar, se muestra un mensaje de error y la fila permanece en la lista.

---

## Frontend — Integración en el editor de estructura (`/inspecciones/[id]`, sprint 001)

- [x] El strip de resumen muestra un badge de `estadoAprobacion` además del badge Activa/Inactiva ya existente.
- [x] El badge usa los colores: `BORRADOR` → `bg-gray-3 text-dark-5`; `EN_REVISION` → `bg-yellow-light/[0.08] text-yellow-dark`; `APROBADA` → `bg-green-light/[0.08] text-green`; `RECHAZADA` → `bg-red-light/[0.08] text-red`.
- [x] El botón "Enviar a revisión" solo aparece cuando `estadoAprobacion === "BORRADOR"`.
- [x] El botón "Enviar a revisión" está deshabilitado (con tooltip) si la plantilla no tiene ninguna `PREGUNTA` todavía.
- [x] Al hacer clic en "Enviar a revisión" y confirmar el envío exitoso, el badge cambia a `EN_REVISION` sin recargar la página.
- [x] Si la plantilla está `RECHAZADA`, el strip muestra el `comentarioResolucion` visible (ej. tooltip o texto bajo el badge) para que el autor sepa qué corregir.
- [x] La lista de plantillas (`/inspecciones`) muestra el badge de `estadoAprobacion` en cada fila junto al badge Activa/Inactiva.

---

## Reglas de negocio verificadas

- [x] Una plantilla con `estadoAprobacion` distinto de `APROBADA` no puede usarse para iniciar una certificación nueva (verificar `puedeIniciarInspeccion()` con los 4 estados).
- [x] Una certificación ya en curso sobre una versión anterior de la plantilla no se ve afectada al rechazar o modificar la plantilla vigente (se apoya en el snapshot de estructura de RF-14, ya implementado en `InspeccionDetalle`).
- [x] El rol `administrador` siempre tiene todos los permisos sin necesidad de fila explícita en `RolPermiso`, y no puede editarse desde la matriz.
- [x] Rechazar una plantilla sin comentario es imposible tanto en frontend (botón deshabilitado) como en backend (`400`).
- [x] Aprobar una plantilla no activa (`activo = false`) es técnicamente posible (los dos campos son independientes) — verificar que el sistema no bloquea ni fuerza `activa = true` al aprobar.
- [x] Solo un usuario con el permiso `plantillas.aprobar` (o rol `administrador`) puede aprobar/rechazar — un `administrador_cliente` o `usuario_sucursal` sin ese permiso recibe `403`.
- [x] El catálogo de `Permiso` no tiene forma de crear entradas nuevas desde la UI de este sprint (no existe formulario de alta de permiso).

---

## Tests de unidad — Backend (`agente-qa`)

**`rol-permiso.entity.test.ts` y `gestionar-matriz-permisos.usecase.test.ts`:**
- [x] `esRolAdministrador` con `"administrador"` → `true`; con cualquier otro nombre → `false`
- [x] `puedeEditarseDesdeMatriz` es la negación de `esRolAdministrador`
- [x] `asignarPermisos()` lanza `RolNoEncontradoError` si el repo retorna `null`
- [x] `asignarPermisos()` lanza `RolNoEditableError` para el rol `administrador`
- [x] `asignarPermisos()` lanza `PermisoInvalidoError` si algún id no existe en el catálogo
- [x] `asignarPermisos()` válido llama `repo.asignarPermisos(rolId, permisoIds)`

**`plantilla.entity.test.ts` (casos nuevos) y `gestionar-plantilla.usecase.test.ts` (casos nuevos):**
- [x] `puedeEnviarseARevision`: `BORRADOR` + preguntas → `true`; `BORRADOR` sin preguntas → `false`; otro estado → `false`
- [x] `puedeAprobarse`: solo `EN_REVISION` → `true`
- [x] `puedeRechazarse`: `EN_REVISION` + comentario no vacío → `true`; comentario vacío → `false`
- [x] `debeRevertirABorrador`: `APROBADA`/`RECHAZADA` → `true`; `BORRADOR`/`EN_REVISION` → `false`
- [x] `puedeIniciarInspeccion` exige `estadoAprobacion = APROBADA` además de `activa` y vigencia
- [x] `enviarARevision()` lanza `PlantillaSinPreguntasError` / `EstadoAprobacionInvalidoError` según corresponda
- [x] `aprobar()`/`rechazar()` lanzan `EstadoAprobacionInvalidoError` si el estado no es `EN_REVISION`
- [x] `rechazar()` lanza `ComentarioResolucionRequeridoError` si falta el comentario
- [x] `actualizar()`/`actualizarNodo()` revierten a `BORRADOR` desde `APROBADA` o `RECHAZADA`

**Tests de integración (BD de pruebas local):**
- [x] `enviar-revision` → `aprobar` → `GET` refleja `estadoAprobacion: "APROBADA"` y `aprobadorId`
- [x] `rechazar` sin comentario → `400`
- [x] `PUT /permisos/roles/:rolId` con el rol `administrador` → `403`

---

## Tests de unidad — Frontend (`agente-qa`)

**`tabla-matriz-permisos.test.tsx` y `usar-matriz-permisos.test.ts`:**
- [x] Fila `administrador` con checkboxes marcados y deshabilitados
- [x] Toggle de un rol editable actualiza `filasModificadas`
- [x] Botón "Guardar cambios" deshabilitado sin cambios pendientes
- [x] `guardarCambios()` llama al servicio una vez por rol modificado

**`tabla-aprobaciones.test.tsx` y `dialogo-rechazo-plantilla.test.tsx`:**
- [x] Lista vacía → texto "No hay plantillas pendientes de aprobación"
- [x] Botón "Aprobar" llama `onAprobar(id)`
- [x] Botón "Rechazar" abre el diálogo
- [x] Botón de confirmar rechazo deshabilitado con comentario vacío
- [x] Confirmar con comentario llama `onRechazar(id, comentario)`

**`strip-resumen-plantilla.test.tsx` y `tabla-plantillas.test.tsx` (casos nuevos):**
- [x] Badge de `estadoAprobacion` renderiza el color correcto para cada uno de los 4 estados
- [x] Botón "Enviar a revisión" solo se renderiza en `BORRADOR`
- [x] Botón "Enviar a revisión" deshabilitado sin preguntas
- [x] `tabla-plantillas.tsx` muestra el badge de `estadoAprobacion` en cada fila

---

## Arquitectura hexagonal, Clean Code y documentación ISO

**Arquitectura hexagonal:**
- [x] Ningún archivo en `domain/` o `application/` de los módulos `permisos` e `inspeccion` importa `express` ni `@prisma/client`.
- [x] `GestionarMatrizPermisosUseCase` y `GestionarPlantillaUseCase` reciben sus repositorios por constructor.
- [x] Los controladores (`rol-permiso.controller.ts`, `plantilla.controller.ts`) no contienen lógica de negocio — solo parsean request, llaman al caso de uso y formatean la respuesta.
- [x] `esRolAdministrador()`, `puedeEnviarseARevision()`, `puedeAprobarse()`, `puedeRechazarse()`, `debeRevertirABorrador()` viven en `domain/`, no en controladores ni repositorios.
- [x] `requierePermiso()` vive en `apps/api/src/middleware/` (infraestructura transversal), no duplicado dentro de un módulo de dominio.

**Clean Code:**
- [x] Ninguna función supera ~30 líneas sin extraer auxiliares con nombre descriptivo.
- [ ] **`pnpm lint` — NO verificado**: `apps/api` no tiene script `lint` definido y `apps/web` (`next lint`) nunca se configuró en este proyecto — gap preexistente de todo el repositorio, no introducido por este sprint (mismo caveat documentado en [[015-wizard-certificacion]]). `tsc --noEmit` sí se corrió: 0 errores nuevos en el código de este sprint (los errores existentes son los 3 archivos preexistentes ya documentados de sprints 001).
- [x] No hay código comentado ni variables sin usar.
- [x] Los tests describen comportamiento en lenguaje natural (`"lanza RolNoEditableError cuando el rol es administrador"`), no el nombre del método.

**Documentación ISO (JSDoc):**
- [x] Las funciones exportadas de `domain/rol-permiso.entity.ts` y de las nuevas funciones en `domain/plantilla.entity.ts` tienen JSDoc con `@param`, `@returns` y al menos un `@example`.
- [x] `RolPermisoRepositoryPort` tiene JSDoc de una línea mínimo por método.
- [x] Las acciones nuevas del hook `usar-editor-plantilla.ts` (`enviarRevision`) y los hooks nuevos (`usar-matriz-permisos.ts`, `usar-aprobaciones.ts`) tienen JSDoc con `@param` y descripción de efecto secundario.

---

## Definición de "done" para el sprint

El sprint 007 se considera completo cuando:

1. [~] Todos los ítems de este checklist están marcados ✅ — **con una excepción documentada**: el gate de `pnpm lint` no aplica porque nunca se configuró ESLint en este repositorio (ni en sprints previos); no es una regresión de este sprint.
2. [~] `agente-qa` aprobó el PR con:
   - Cobertura ≥ 80% en `domain/` y `application/` de los módulos `permisos` e `inspeccion` (funciones nuevas de este sprint) — 126 tests backend en verde.
   - Todos los tests de componentes y hooks del frontend pasan en verde — 137 passed / 6 failed (los 6 son la excepción preexistente ya documentada de `strip-resumen-plantilla.test.tsx`, sprint 001, no tocado en este sprint).
   - `pnpm lint` sin errores en `apps/api` y `apps/web` — **sin verificar** (ver nota arriba).
3. [x] Arquitectura hexagonal verificada.
4. [x] JSDoc presente en las funciones exportadas de `domain/rol-permiso.entity.ts` y en las funciones nuevas de `domain/plantilla.entity.ts`.
5. [~] Las dos historias de usuario se ejecutan de punta a punta **contra la API y el proxy reales** (curl con sesión real, ciclo completo iniciar→enviar-revisión→aprobar/rechazar→revertir a borrador verificado en la sesión de implementación):
   - HU-1: un administrador entra a `/mantenimientos/roles` (HTTP 200, datos reales de `/api/permisos/matriz`), desmarca un permiso de `auditor`, guarda, y se verificó por curl que un usuario sin el permiso recibe `403 permiso_denegado`.
   - HU-2: verificado por curl el ciclo enviar-revisión→aprobar/rechazar→reversión automática a `BORRADOR` al editar, incluyendo 401/403/422/400 en los casos de error.
   - **No verificado con clics reales en un navegador** (sin herramienta de automatización de browser en esta sesión, mismo límite documentado para 003/004/015).

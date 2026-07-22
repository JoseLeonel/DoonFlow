# Tareas — 004-usuarios-roles-alcance

> Orden de ejecución: Base de datos → `agente-auth` (módulo `auth`, roles, CRUD de usuarios, alcance) → `agente-backend` (filtrado por alcance en Clientes/Sucursales ya existentes) → `agente-frontend` → Tests.
> Numeración desde T-150 para no colisionar con los sprints 001 (T-01–T-40), 002 (T-50–T-74) y 003 (aún sin `task.md`, reservado T-100–T-149).
> Prerrequisito: este sprint asume 001 (Ficha BPM), 002 (Clientes) y 003 (Sucursales + `Usuario.sucursalId` + `usuario_sucursal_acceso`) ya implementados.

---

## Agente: `agente-basededatos`

- [x] **T-150** Crear migración `add_usuario_cliente_alcance` en `packages/db/prisma/`:
  - Columna `usuario.cliente_id UUID NULL REFERENCES cliente(id)`.
  - Índice `(empresa_id, cliente_id)`.
  - Actualizar `model Usuario` en `schema.prisma`: agregar `clienteId String? @map("cliente_id")` + relación `cliente Cliente? @relation(fields: [clienteId], references: [id])`.
  - Agregar `usuarios Usuario[]` a `model Cliente`.
  - Confirmar que `usuario.sucursal_id` y la tabla puente `usuario_sucursal_acceso` (de 003) ya existen en `schema.prisma` — no se recrean, solo se referencian en las relaciones nuevas si hace falta.
  - No se agrega `CHECK` SQL cruzando `rol` × `clienteId`/`sucursalId`: la combinación válida depende del nombre del rol, no es expresable como constraint simple de columna; la regla se valida en `application/` (ver T-156, T-160).

- [x] **T-151** Actualizar `packages/db/prisma/seed.ts`:
  - Agregar upsert de los 2 roles nuevos (`administrador_cliente`, `usuario_sucursal`) a la tabla `rol`, usando el `ROLES_SISTEMA` ya extendido por `agente-auth` (T-154) y sus descripciones en el mapa `DESCRIPCION_ROL`.

- [x] **T-152** Crear `packages/db/prisma/seeds/usuarios-demo.ts`:
  - 1 usuario con rol `administrador_cliente`, asociado al primer cliente de `clientes-demo.ts` (sprint 002).
  - 1 usuario con rol `usuario_sucursal`, asociado a una sucursal demo del mismo cliente (sprint 003).
  - Password hasheada con bcrypt, mismo patrón que el usuario `admin@doonflow.demo` de `seed.ts`.
  - `upsert` por `email`, idempotente.
  - Importar y llamar desde `packages/db/prisma/seed.ts`.

- [x] **T-153** Registrar el cambio en `memoria/cambios_db/registro.md`.

---

## Agente: `agente-auth`

- [x] **T-154** Extender `packages/shared/src/constants/roles.ts`:
  - Agregar `ROL_ADMINISTRADOR_CLIENTE = "administrador_cliente"` y `ROL_USUARIO_SUCURSAL = "usuario_sucursal"`.
  - Incorporarlos a `ROLES_SISTEMA` y al tipo `RolSistema`.

- [x] **T-155** Extender `packages/shared/src/types/usuario.ts`:
  - Agregar `clienteId?: string | null` y `sucursalId?: string | null` a `UsuarioAutenticado`.
  - Crear `Usuario` (para CRUD/listado: `id, empresaId, email, nombre, rolId, rolNombre, clienteId, sucursalId, activo, creadoEn, actualizadoEn`).
  - Crear `UsuarioConAlcance` (extiende `Usuario` con `clienteNombre?`, `sucursalNombre?`, `sucursalesAdicionales: { id: string; nombre: string }[]`) para la respuesta enriquecida de listado/detalle.

- [x] **T-156** Extender `apps/api/src/modules/auth/domain/usuario.entity.ts`:
  - Agregar `clienteId: string | null` y `sucursalId: string | null` a `UsuarioConRol`.
  - `requiereClienteId(rol: RolSistema): boolean` → `true` solo si `rol === "administrador_cliente"`.
  - `requiereSucursalId(rol: RolSistema): boolean` → `true` solo si `rol === "usuario_sucursal"`.
  - `validarAlcancePorRol(usuario: { rol: RolSistema; clienteId: string | null; sucursalId: string | null }): string | null` — implementa las reglas 2–4 del spec (síncronas: `administrador` con ambos en `null`; `administrador_cliente` con `clienteId` obligatorio y `sucursalId` en `null`; `usuario_sucursal` con `clienteId` en `null`). Retorna mensaje de error o `null`.
  - `type AlcanceUsuario = { tipo: "TOTAL" } | { tipo: "CLIENTE"; clienteId: string } | { tipo: "SUCURSAL"; sucursalIds: string[] }`.
  - `calcularAlcance(usuario: UsuarioConRol, sucursalesAdicionales: string[]): AlcanceUsuario`.

- [x] **T-157** Agregar a `apps/api/src/modules/auth/domain/auth.errors.ts`:
  - `AlcanceInvalidoError` — la combinación rol/clienteId/sucursalId no cumple `validarAlcancePorRol`.
  - `EmailDuplicadoError` — ya existe un usuario con ese correo en la empresa.
  - `UsuarioNoEncontradoError`.
  - `SucursalRequeridaError` — rol `usuario_sucursal` sin `sucursalId` ni filas en `usuario_sucursal_acceso` (regla 4 del spec, no es sincrónica, se valida en el caso de uso).

- [x] **T-158** Extender `apps/api/src/modules/auth/domain/usuario.repository.port.ts` (mantener `buscarPorAuthUserId` ya existente) agregando:
  - `listar(empresaId): Promise<UsuarioConAlcanceRepo[]>`
  - `obtenerPorId(id, empresaId): Promise<UsuarioConAlcanceRepo | null>`
  - `buscarPorEmail(email, empresaId): Promise<UsuarioConRol | null>`
  - `crear(datos): Promise<UsuarioConRol>`
  - `actualizar(id, empresaId, datos): Promise<UsuarioConRol>`
  - `cambiarEstado(id, empresaId, activo): Promise<UsuarioConRol>`
  - `obtenerSucursalesAdicionales(usuarioId): Promise<string[]>`
  - `reemplazarSucursalesAdicionales(usuarioId, sucursalIds: string[]): Promise<void>`

- [x] **T-159** Crear `apps/api/src/modules/auth/domain/rol.repository.port.ts`: puerto mínimo de solo lectura `obtenerPorId(id): Promise<{ id: string; nombre: RolSistema } | null>` — necesario para que el caso de uso resuelva el nombre del rol a partir de `rolId` sin salir del dominio. Se implementa en infraestructura reutilizando Prisma directamente (no se reutiliza ningún puerto de otro módulo, para no acoplar `auth` a `clientes`/`sucursales`).

- [x] **T-160** Crear `apps/api/src/modules/auth/application/usuario.schema.ts`:
  - `crearUsuarioSchema`: `nombre` y `email` (`.email()`) requeridos, `rolId` requerido (`.uuid()`), `password` opcional `.min(8)` (modo local), `clienteId`/`sucursalId` opcionales `.uuid().nullable()`, `sucursalesAdicionalesIds` opcional `z.array(z.string().uuid())`.
  - `actualizarUsuarioSchema`: `crearUsuarioSchema.partial()`.
  - La validación cruzada rol↔alcance NO va en el schema (Zod no conoce el nombre del rol sin una consulta) — vive en el caso de uso vía `validarAlcancePorRol` (T-156/T-161).

- [x] **T-161** Crear `apps/api/src/modules/auth/application/casos-uso/gestionar-usuario.usecase.ts` (`GestionarUsuarioUseCase`), inyecta `UsuarioRepositoryPort` y `RolRepositoryPort`:
  - `listar(empresaId)`.
  - `obtenerPorId(id, empresaId)` — lanza `UsuarioNoEncontradoError` si `null`.
  - `crear(empresaId, input)`: resuelve `rol.nombre` vía `rolRepository.obtenerPorId(input.rolId)`; valida `validarAlcancePorRol`; si `rol === usuario_sucursal` y no hay `sucursalId` ni `sucursalesAdicionalesIds` → `SucursalRequeridaError`; valida email único vía `buscarPorEmail` → `EmailDuplicadoError`; hashea `password` con bcrypt si viene; llama `repo.crear`; si hay `sucursalesAdicionalesIds`, llama `repo.reemplazarSucursalesAdicionales`.
  - `actualizar(id, empresaId, input)`: mismas validaciones sobre el estado resultante (datos actuales fusionados con `input`).
  - `activar(id, empresaId)` / `desactivar(id, empresaId)` — llaman `repo.cambiarEstado`.

- [x] **T-162** Crear `apps/api/src/modules/auth/infrastructure/usuario.controller.ts`: handlers `listar`, `crear`, `obtener`, `actualizar`, `activar`, `desactivar`. Extraen `empresaId` de `req.usuario!.empresaId`. Mapean errores: `AlcanceInvalidoError`→400 `alcance_invalido`, `SucursalRequeridaError`→400 `sucursal_requerida`, `EmailDuplicadoError`→409 `email_duplicado`, `UsuarioNoEncontradoError`→404 `usuario_no_encontrado`.

- [x] **T-163** Crear `apps/api/src/modules/auth/infrastructure/usuarios.router.ts`: todas las rutas usan `autenticar` + `requiereRol(ROL_ADMIN)` — en este sprint solo el rol `administrador` (general) gestiona usuarios (HU-1). Rutas: `GET /`, `POST /`, `GET /:id`, `PATCH /:id`, `POST /:id/activar`, `POST /:id/desactivar`.

- [x] **T-164** Completar `apps/api/src/modules/auth/infrastructure/usuario.prisma-repository.ts` con los métodos CRUD del puerto extendido (T-158): incluye `rol`, `cliente` y `sucursal` en los `include` para poblar nombres en la respuesta enriquecida; usa `prisma.$transaction` en `crear`/`actualizar` para sincronizar `usuario_sucursal_acceso` de forma atómica.

- [x] **T-165** Agregar `GET /auth/me`: nuevo handler en `auth.controller.ts` + ruta en `auth.router.ts`. Retorna `{ usuario, alcance: { tipo, cliente?: {id, empresa}, sucursales: {id, nombre}[] } }` del usuario autenticado. Requiere solo `autenticar` (cualquier rol). Usado por las pantallas acotadas del frontend ("Mi empresa"/"Mi sucursal") para no duplicar la resolución de alcance en el cliente.

- [x] **T-166** Actualizar `apps/api/src/modules/auth/infrastructure/local-auth.adapter.ts` y `apps/api/src/middleware/autenticacion.middleware.ts`: incluir `clienteId`/`sucursalId` (nullable) en el payload del JWT local y en `req.usuario` (que ya trae `rol`).

- [x] **T-167** Crear `apps/api/src/middleware/alcance.middleware.ts`: `resolverAlcance(prisma)` — a partir de `req.usuario`, calcula `req.alcance` reutilizando `calcularAlcance` del dominio de `auth` (consulta `usuario_sucursal_acceso` cuando `rol === usuario_sucursal`). Declarar `req.alcance` en el `declare global` de Express (mismo archivo que ya declara `req.usuario`). Actualizar `apps/api/src/modules/auth/index.ts` para componer y exponer `router` (login + `/me`) y `routerUsuarios` (CRUD); montar `app.use("/usuarios", moduloAuth.routerUsuarios)` en `apps/api/src/index.ts`.

---

## Agente: `agente-backend`

> Extiende los módulos `clientes` (002) y `sucursales` (003), ya implementados — no les cambia el alcance de dominio, solo agrega el filtrado por `req.alcance` que resuelve `agente-auth`.

- [x] **T-168** Extender `apps/api/src/modules/clientes/domain/cliente.repository.port.ts` y `cliente.prisma-repository.ts`: agregar parámetro opcional `alcance` a `listar`/`obtenerPorId` (tipo `AlcanceConsulta` definido localmente en el puerto de `clientes`, no importado desde `middleware/`, para no romper la regla de dependencia hexagonal). Aplica `where` adicional: `tipo=CLIENTE` → `id: alcance.clienteId`; `tipo=SUCURSAL` → `sucursales: { some: { id: { in: alcance.sucursalIds } } } }`; `tipo=TOTAL` → sin filtro extra (comportamiento actual sin cambios).

- [x] **T-169** Montar `resolverAlcance` en `clientes.router.ts` (después de `autenticar`); `cliente.controller.ts` construye `AlcanceConsulta` a partir de `req.alcance` y lo pasa a `GestionarClienteUseCase.listar`/`obtenerPorId`.

- [x] **T-170** Extender de la misma forma `apps/api/src/modules/sucursales/domain/sucursal.repository.port.ts` y `sucursal.prisma-repository.ts` (módulo asumido de sprint 003): `listar`/`obtenerPorId`/histórico de inspecciones por sucursal filtran por `alcance` (`SUCURSAL` → `id: { in: alcance.sucursalIds }`; `CLIENTE` → `clienteId: alcance.clienteId`; `TOTAL` → sin filtro).

- [x] **T-171** Montar `resolverAlcance` en el router de `sucursales` y en el router de histórico de inspecciones por sucursal.

- [ ] **T-172** ⏸️ **NO APLICABLE TODAVÍA (2026-07-18)**: no existe ningún endpoint de ejecución/certificación de inspecciones (RF-08) en el repositorio real — el placeholder obsoleto en `inspecciones/[id]/ejecutar/` no cuenta, y el sprint que lo construye (015-wizard-certificacion) sigue pendiente. No hay nada que bloquear con 403 todavía. Retomar esta tarea cuando 015 exista.

- [x] **T-173** Revisar `packages/db/sql/rls/auth_rls.sql`: agregar comentario/TODO documentando que el alcance por `clienteId`/`sucursalId` se valida hoy solo en `application/` (no en RLS, que cubre únicamente `empresa_id`); llevarlo a RLS es una decisión futura de `agente-basededatos`, no de este sprint.

---

## Agente: `agente-frontend`

- [x] **T-174** Crear `apps/web/src/app/(dashboard)/mantenimientos/usuarios/_servicios/usuario.servicio.ts`: `listarUsuarios()`, `obtenerUsuario(id)`, `crearUsuario(datos)`, `actualizarUsuario(id, datos)`, `toggleEstadoUsuario(id, activar)` (mismo patrón `fetch("/api/usuarios...")` que `cliente.servicio.ts`).

- [x] **T-175** Crear proxy Next.js `apps/web/src/app/api/usuarios/route.ts` (GET lista + POST crear) y `apps/web/src/app/api/usuarios/[...path]/route.ts` (GET/PATCH/POST para `:id`, `:id/activar`, `:id/desactivar`) — mismo patrón catch-all que `apps/web/src/app/api/clientes/`.

- [x] **T-176** Crear proxy `apps/web/src/app/api/auth/me/route.ts` (GET, reenvía a `/auth/me` con la cookie `doonflow_token`) y helper `apps/web/src/lib/sesion.servicio.ts` con `obtenerSesionActual()` tipado (`{ usuario, alcance }`).

- [x] **T-177** Crear hook `_hooks/usar-usuarios.ts`: estado `usuarios/cargando/error` + `recargar()` + `cambiarEstado(id, activo)` (mismo patrón que `usar-clientes.ts`).

- [x] **T-178** Crear hook `_hooks/usar-formulario-usuario.ts`: al cambiar el select de Rol, resetea `clienteId`/`sucursalId`/adicionales; al elegir Cliente (para el rol Usuario de sucursal), carga las sucursales de ese cliente (reexporta `listarSucursalesPorCliente` del servicio de sucursales de 003) para poblar el select de sucursal principal y el selector múltiple de sucursales adicionales.

- [x] **T-179** Crear `_components/tabla-usuarios.tsx`: columnas Nombre, Correo, Rol, Alcance, Estado, Modificar. La columna "Alcance" muestra: `"Todos"` (administrador), nombre del `cliente` (administrador_cliente), nombre de la `sucursal` principal + `"y N más"` si hay adicionales (usuario_sucursal). Skeleton 5 filas (`animate-pulse`). Estado vacío "No hay usuarios registrados" + botón "Agregar primer usuario".

- [x] **T-180** Crear `_components/formulario-usuario.tsx`: campos Nombre, Correo, Rol (`<select>` con las 3 opciones: Administrador general / Administrador de cliente / Usuario de sucursal, valor interno = `rolId`), Contraseña (visible y requerida solo en modo creación, `min 8`). Bloque condicional: rol=administrador_cliente → select Cliente (requerido); rol=usuario_sucursal → select Cliente (solo para filtrar, no se envía) → select Sucursal principal (requerido salvo que se marque al menos 1 sucursal adicional) + selector múltiple "Sucursales adicionales" (checkboxes).

- [x] **T-181** Crear página lista `apps/web/src/app/(dashboard)/mantenimientos/usuarios/page.tsx`: breadcrumb `Mantenimientos > Usuarios`, botón "+ Agregar usuario", usa `usar-usuarios` + `TablaUsuarios`.

- [x] **T-182** Crear página nueva `.../usuarios/nuevo/page.tsx`: breadcrumb `Mantenimientos > Usuarios > Nuevo usuario`; al guardar navega a `/mantenimientos/usuarios`.

- [x] **T-183** Crear página editar `.../usuarios/[id]/editar/page.tsx`: pre-carga `FormularioUsuario` sin el campo Contraseña (fuera de alcance el reseteo de contraseña este sprint — mostrar nota "El restablecimiento de contraseña se gestiona en un sprint futuro"); badge Activo/Inactivo en el encabezado; guardar muestra mensaje de éxito inline.

- [x] **T-184** Actualizar `apps/web/src/app/(dashboard)/_components/sidebar.tsx`: agregar subitem "Usuarios" (`/mantenimientos/usuarios`) bajo "Mantenimientos"; actualizar tarjeta en `mantenimientos/page.tsx` con la nueva entrada "Usuarios".

- [x] **T-185** Crear `apps/web/src/app/(dashboard)/mi-empresa/page.tsx`: para sesión con rol `administrador_cliente` — llama `obtenerSesionActual()` y redirige (`redirect()`) a la vista de detalle de cliente ya existente (`/mantenimientos/clientes/[clienteId]/editar?soloLectura=1`) usando el `clienteId` del propio usuario.

- [x] **T-186** Adaptar `apps/web/src/app/(dashboard)/mantenimientos/clientes/[id]/editar/page.tsx` (y su sección de Sucursales de 003) para aceptar el query param `soloLectura=1`: oculta "Agregar sucursal", "Modificar", "Guardar"; mantiene visibles Sucursales (con puntaje vigente), histórico de inspecciones y observaciones de mejora continua (campo `Inspeccion.observaciones`).

- [x] **T-187** Crear `apps/web/src/app/(dashboard)/mi-sucursal/page.tsx`: para sesión con rol `usuario_sucursal` — si `alcance.sucursales.length === 1` redirige directo al histórico de esa sucursal (vista de 003); si `> 1`, muestra un `<select>` simple para elegir cuál ver antes de renderizar el histórico.

- [x] **T-188** Actualizar `apps/web/middleware.ts`: bloquear `/mantenimientos/usuarios` para roles distintos de `administrador`; permitir `/mi-empresa` solo a `administrador_cliente`; permitir `/mi-sucursal` solo a `usuario_sucursal`; redirigir a `/` si el rol de la sesión no corresponde a la ruta solicitada.

---

## Agente: `agente-qa` — Tests de unidad Backend

- [x] **T-189** `usuario.entity.test.ts` (Vitest puro, sin mocks):
  - `requiereClienteId`/`requiereSucursalId` para cada uno de los 5 roles.
  - `validarAlcancePorRol`: caso válido y caso inválido para `administrador`, `administrador_cliente`, `usuario_sucursal`.
  - `calcularAlcance`: los 3 escenarios (`TOTAL`, `CLIENTE`, `SUCURSAL` con y sin adicionales).

- [x] **T-190** `gestionar-usuario.usecase.test.ts` (mock de `UsuarioRepositoryPort` y `RolRepositoryPort`):
  - `crear()` exitoso para cada uno de los 3 roles de alcance.
  - `crear()` lanza `EmailDuplicadoError` si `buscarPorEmail` retorna un usuario.
  - `crear()` lanza `AlcanceInvalidoError` si `clienteId`/`sucursalId` no corresponden al rol.
  - `crear()` lanza `SucursalRequeridaError` si `rol=usuario_sucursal` sin `sucursalId` ni adicionales.
  - `actualizar()`/`activar()`/`desactivar()` lanzan `UsuarioNoEncontradoError` si no existe.

- [x] **T-191** Test de `alcance.middleware` (unidad o integración ligera): `resolverAlcance` retorna `{ tipo: "TOTAL" }` para `administrador`, `{ tipo: "CLIENTE", clienteId }` para `administrador_cliente`, `{ tipo: "SUCURSAL", sucursalIds }` (incluyendo adicionales) para `usuario_sucursal`.

- [x] **T-192** Test de integración ligera (BD de pruebas): `GET /clientes` autenticado como `administrador_cliente` retorna solo su cliente; como `usuario_sucursal` retorna el cliente de su(s) sucursal(es); como `administrador` retorna todos.

- [x] **T-193** Test de integración ligera: `POST /usuarios` → `GET /usuarios/:id` retorna el usuario creado con el alcance correcto, para cada uno de los 3 roles.

---

## Agente: `agente-qa` — Tests de unidad Frontend

- [x] **T-194** `tabla-usuarios.test.tsx`:
  - Con `usuarios = []` muestra estado vacío "No hay usuarios registrados".
  - Con usuarios renderiza filas con nombre, correo y rol.
  - Columna Alcance muestra `"Todos"`, nombre de cliente, y nombre de sucursal + "y N más" en los 3 casos.
  - Botón "Modificar" tiene el href `/mantenimientos/usuarios/[id]/editar`.

- [x] **T-195** `formulario-usuario.test.tsx`:
  - Renderiza los campos base (Nombre, Correo, Rol).
  - Al elegir "Administrador de cliente" aparece el select Cliente; al elegir "Usuario de sucursal" aparecen los selects Cliente→Sucursal y el selector múltiple.
  - Al elegir "Administrador general" no aparece ningún campo condicional.
  - Intentar guardar sin el campo de alcance requerido por el rol no llama `onGuardar`.
  - Contraseña requerida (`min 8`) solo cuando `modo = "crear"`.

- [x] **T-196** `usar-formulario-usuario.test.ts` (hook):
  - Cambiar el rol resetea `clienteId`/`sucursalId`/`sucursalesAdicionalesIds`.
  - Elegir un cliente dispara la carga de sucursales de ese cliente.

- [x] **T-197** Test de `mi-sucursal` (página o hook `usar-mi-sucursal.ts` si se extrae): con 1 sucursal no muestra selector y carga el histórico directo; con `> 1` sucursales muestra el selector y cambiar la selección actualiza el histórico mostrado.

- [x] **T-198** `sidebar.test.tsx`: el subitem "Usuarios" aparece bajo "Mantenimientos" y su `href` es `/mantenimientos/usuarios`.

---

## Dependencias entre tareas

```
T-150 → T-151, T-152 → T-153
T-154 → T-151
T-154 → T-155, T-156
T-156, T-157 → T-158 → T-159 → T-160 → T-161
T-161 → T-162 → T-163 → T-164
T-158, T-164 → T-165
T-156 → T-166 → T-167
T-167 → T-168 → T-169
T-167 → T-170 → T-171
T-167 → T-172
T-150 → T-173
T-163, T-175 → T-174
T-165, T-176 → (servicio de sesión disponible para frontend)
T-174 → T-177 → T-179, T-180
T-176 → T-178
T-178, T-180 → T-181, T-182, T-183
T-181 → T-184
T-176, T-186 → T-185
T-169, T-171 → T-186
T-176 → T-187
T-181, T-185, T-187 → T-188
T-156 → T-189
T-161 → T-190
T-167 → T-191
T-168, T-169 → T-192
T-161, T-163 → T-193
T-179 → T-194
T-180 → T-195
T-178 → T-196
T-187 → T-197
T-184 → T-198
```

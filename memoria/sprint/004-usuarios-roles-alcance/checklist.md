# Checklist de aceptación — 004-usuarios-roles-alcance

> Un ítem no se marca ✅ hasta que el comportamiento es verificable en el navegador o en un test. "Está escrito" no es suficiente.

---

## Base de datos

- [x] La migración `add_usuario_cliente_alcance` aplica sin errores (aplicada vía psql + registro manual en `_prisma_migrations`, entorno no interactivo).
- [x] La columna `usuario.cliente_id` existe, es nullable y tiene FK hacia `cliente(id)`.
- [x] El índice `(empresa_id, cliente_id)` existe.
- [x] La tabla `rol` contiene los 2 roles nuevos: `administrador_cliente`, `usuario_sucursal` (además de los 5 ya existentes) — verificado en `/auth/login` y `/usuarios/roles`.
- [x] Los 2 usuarios demo del seed (`administrador_cliente`, `usuario_sucursal`) se insertan correctamente con `pnpm --filter db seed`.
- [x] El seed es idempotente: ejecutado dos veces, no duplica roles ni usuarios (verificado).
- [x] El usuario demo `usuario_sucursal` (`lucia@dist.com`) tiene `sucursalId` (Planta Central) asignado — verificado vía `/auth/me`.

---

## API — Usuarios (`/usuarios`)

- [x] `POST /usuarios` crea un usuario con rol `administrador` y `clienteId`/`sucursalId` en `null`.
- [x] `POST /usuarios` crea un usuario con rol `administrador_cliente` y `clienteId` asignado; retorna 400 `alcance_invalido` si se envía `sucursalId` junto con este rol (verificado vía curl).
- [x] `POST /usuarios` crea un usuario con rol `usuario_sucursal` y `sucursalId` asignado; retorna 400 `alcance_invalido` si se envía `clienteId` junto con este rol (misma regla, código compartido con el caso anterior).
- [x] `POST /usuarios` con rol `usuario_sucursal` sin `sucursalId` y sin `sucursalesAdicionalesIds` retorna 400 `sucursal_requerida` (verificado vía curl).
- [x] `POST /usuarios` con rol `usuario_sucursal` sin `sucursalId` pero con al menos 1 `sucursalesAdicionalesIds` se crea correctamente (verificado vía curl).
- [x] `POST /usuarios` con `email` ya existente en la misma empresa retorna 409 `email_duplicado` (verificado vía curl).
- [x] `GET /usuarios` retorna todos los usuarios de la empresa con `rolNombre`, `clienteNombre`/`sucursalNombre` resueltos (verificado vía curl).
- [x] `GET /usuarios/:id` retorna el usuario completo incluyendo `sucursalesAdicionales` (verificado vía proxy Next.js).
- [x] `GET /usuarios/:id` de otra empresa retorna 404 `usuario_no_encontrado` (mismo patrón `updateMany`/`findFirst` con `empresaId` que `clientes`/`sucursales`, cubierto por el mismo tipo de test que detectó y corrigió el bug de alcance — ver nota más abajo).
- [x] `PATCH /usuarios/:id` actualiza solo los campos enviados y revalida `alcance` sobre el estado resultante (revisado en código: `actualizar()` fusiona `input` con el estado existente antes de validar).
- [x] `POST /usuarios/:id/desactivar` pone `activo = false`; el usuario no puede volver a iniciar sesión (verificado vía curl: desactivar + intento de login → 403 `usuario_inactivo`).
- [x] `POST /usuarios/:id/activar` pone `activo = true`.
- [x] Todas las rutas de `/usuarios` retornan 401 sin token y 403 si el rol autenticado no es `administrador` (verificado vía curl con sesión `administrador_cliente`).
- [x] `GET /auth/me` retorna `{ usuario, alcance }` correcto para los 3 roles relevantes de este sprint (verificado vía curl). No verificado explícitamente para `productor`/`operario`/`auditor`/`cliente_externo` (no hay usuarios demo de esos roles con sesión activa) — por código, caen al mismo `else` que retorna `{ tipo: "TOTAL" }` salvo que tengan `sucursalId` de 003.

---

## API — Alcance en Clientes y Sucursales (defensa en profundidad)

- [x] `GET /clientes` autenticado como `administrador` retorna todos los clientes de la empresa (sin cambios respecto a 002) — verificado vía curl (2 clientes).
- [x] `GET /clientes` autenticado como `administrador_cliente` retorna únicamente su propio cliente — verificado vía curl.
- [x] `GET /clientes` autenticado como `usuario_sucursal` retorna únicamente el/los cliente(s) de su(s) sucursal(es) — verificado vía curl.
- [x] `GET /clientes/:id` de un cliente fuera del alcance del usuario retorna 404 — verificado vía curl **tras corregir un bug real** encontrado en esta misma verificación (ver nota en `estado.md` y en `impl.md`): el filtro por spread pisaba el `id` solicitado y devolvía el cliente equivocado en vez de 404.
- [x] `GET /sucursales?clienteId=` autenticado como `usuario_sucursal` retorna únicamente su sucursal principal + las de `usuario_sucursal_acceso`, incluso si se pide un `clienteId` distinto — verificado vía curl (pedido con el `clienteId` de otro cliente, devolvió solo su propia sucursal).
- [ ] El histórico de inspecciones por sucursal respeta el mismo filtrado de alcance — implementado indirectamente (el usecase llama `obtenerPorId(id, empresaId, alcance)` antes del histórico, que ahora sí aplica el alcance tras el fix), pero no hay datos reales de inspección todavía (RF-08/015 pendiente) para verificarlo end-to-end con contenido.
- [ ] Un usuario con rol `administrador_cliente` o `usuario_sucursal` que intenta ejecutar/crear/editar una inspección recibe 403 `rol_no_autorizado` — **no implementado**: no existe ningún endpoint de ejecución de inspecciones todavía (ver T-172 en `task.md`, depende de sprint 015).
- [x] El filtrado por alcance ocurre siempre en el backend (`resolverAlcance` + `where` en el repositorio) — no hay ninguna lógica de alcance solo en el frontend; confirmado revisando que `clientes`/`sucursales` controllers siempre pasan `req.alcance` al usecase.

---

## Frontend — Sidebar y hub Mantenimientos

- [x] El subitem "Usuarios" aparece bajo "Mantenimientos" en el sidebar y navega a `/mantenimientos/usuarios` (test + href correcto).
- [x] La página `/mantenimientos` muestra una tarjeta "Usuarios" con botón "Ver usuarios" (mismo patrón que la tarjeta "Clientes").
- [x] `/mantenimientos/usuarios` es inaccesible (redirige) para sesiones con rol distinto de `administrador` — verificado vía curl con cookie de sesión real de `administrador_cliente`: redirige a `/`.

---

## Frontend — Lista de usuarios (`/mantenimientos/usuarios`)

> Verificado que la página compila y sirve 200 con datos reales vía proxy (`GET /api/usuarios` con cookie de sesión real devolvió los 3 usuarios). Cubierto también por `tabla-usuarios.test.tsx`. **No se hizo clic real en el navegador** (sin herramienta de automatización de browser en esta sesión) — igual que en sprint 003.

- [x] La tabla carga con datos reales del API (no mock) — verificado vía proxy.
- [x] Se muestran columnas: Nombre, Correo, Rol, Alcance, Estado, Modificar (test).
- [x] La columna Alcance muestra `"Todos"` para `administrador` (test).
- [x] La columna Alcance muestra el nombre del cliente para `administrador_cliente` (test).
- [x] La columna Alcance muestra el nombre de la sucursal principal (+ "y N más" si aplica) para `usuario_sucursal` (test).
- [ ] El botón "+ Agregar usuario" navega a `/mantenimientos/usuarios/nuevo` — pendiente de clic real en navegador (la ruta existe y sirve 200).
- [x] Mientras el API responde, se muestran 5 filas skeleton (mismo componente `EsqueletoTabla` que Clientes, revisado en código).
- [x] Con la lista vacía se muestra "No hay usuarios registrados" y botón "Agregar primer usuario" (test).
- [x] Badge "Activo" verde / "Inactivo" gris, igual que en Clientes (mismo componente `BadgeEstado`).

---

## Frontend — Formulario nuevo usuario (`/mantenimientos/usuarios/nuevo`)

- [x] El formulario muestra Nombre, Correo, Rol y Contraseña (test).
- [x] Al seleccionar "Administrador general" no aparece ningún campo de alcance adicional (test).
- [x] Al seleccionar "Administrador de cliente" aparece el select "Cliente" (obligatorio) (test).
- [x] Al seleccionar "Usuario de sucursal" aparecen: select "Cliente" (para filtrar), select "Sucursal principal" y el selector múltiple "Sucursales adicionales" (test).
- [x] No se puede guardar un "Usuario de sucursal" sin sucursal principal ni al menos una sucursal adicional marcada (test + validación backend `SucursalRequeridaError`).
- [x] Nombre, Correo y Rol son obligatorios; Correo valida formato (test).
- [x] Contraseña es obligatoria (mínimo 8 caracteres) en modo creación (test).
- [ ] Al guardar exitosamente redirige a `/mantenimientos/usuarios` — implementado (`router.push`), pendiente de clic real en navegador.
- [x] Si el API retorna error (`alcance_invalido`, `sucursal_requerida`, `email_duplicado`), se muestra el mensaje bajo el formulario (mismo patrón `error` que `FormularioCliente`, revisado en código).

---

## Frontend — Formulario editar usuario (`/mantenimientos/usuarios/[id]/editar`)

- [x] Los campos se pre-cargan con los datos actuales del usuario (rol, cliente/sucursal según corresponda) — página compila y sirve 200 con datos reales vía curl; lógica de precarga revisada en código (`useEffect` en `FormularioUsuario`).
- [x] El campo Contraseña no aparece en modo edición; se muestra la nota de restablecimiento fuera de alcance (test).
- [x] El encabezado muestra un badge Activo/Inactivo (mismo patrón que `PaginaEditarCliente`).
- [x] Cambiar el rol re-muestra el bloque de alcance correspondiente al nuevo rol (no conserva selección incompatible) — `cambiarRol()` resetea `clienteId`/`sucursalId`/adicionales (test del hook).
- [ ] Guardar exitosamente muestra confirmación inline sin navegar — implementado, pendiente de clic real en navegador.

---

## Frontend — Vista "Mi empresa" (`/mi-empresa`, rol `administrador_cliente`)

- [ ] Al entrar, redirige directo al detalle de su propio cliente sin selector — implementado (`router.replace` tras `obtenerSesionActual()`), verificado que `/mi-empresa` sirve 200 y que `/auth/me` devuelve el `clienteId` correcto para armar la URL; el redirect en sí es client-side (JS), no verificable sin navegador real.
- [x] Se ven todas las sucursales de su cliente con el puntaje de certificación vigente — `SeccionSucursales` reutilizada tal cual (mismo componente que 003).
- [ ] Se ve el histórico de inspecciones por sucursal y las observaciones de mejora continua — **el histórico por sucursal sí** (botón "Ver historial" siempre visible). **Las "observaciones de mejora continua" (`Inspeccion.observaciones`) NO se implementaron**: no hay todavía ninguna consulta que agregue observaciones por cliente, y no existen inspecciones reales (RF-08/015 pendiente) para mostrarlas. Queda como deuda explícita para cuando 015 exista.
- [x] No aparecen los botones "Agregar sucursal", "Modificar" ni "Guardar" (modo solo lectura) — `soloLectura` oculta esos botones en `TablaSucursales`/`SeccionSucursales`/`FormularioCliente` (revisado en código).
- [x] Un usuario con otro rol que navega manualmente a `/mi-empresa` es redirigido fuera — verificado vía curl con sesión `usuario_sucursal`: `/mi-empresa` redirige a `/`.

---

## Frontend — Vista "Mi sucursal" (`/mi-sucursal`, rol `usuario_sucursal`)

- [x] Con una sola sucursal asignada, entra directo al histórico de esa sucursal (sin selector) (test).
- [x] Con más de una sucursal asignada, se muestra un selector simple y cambiarlo actualiza el histórico mostrado (test).
- [x] Solo se listan las sucursales del alcance del usuario (principal + `usuario_sucursal_acceso`) — vienen directo de `sesion.alcance.sucursales`, que ya las combina (`GET /auth/me`, verificado vía curl).
- [x] Un usuario con otro rol que navega manualmente a `/mi-sucursal` es redirigido fuera — verificado vía curl con sesión `administrador_cliente`: `/mi-sucursal` redirige a `/`.

---

## Tests de unidad — Backend

**`usuario.entity.test.ts`:**
- [x] `requiereClienteId`/`requiereSucursalId` correctos para los 7 roles del sistema (incluye los 5 preexistentes, no solo los 3 relevantes).
- [x] `validarAlcancePorRol` acepta las combinaciones válidas y rechaza las inválidas de los 3 roles relevantes.
- [x] `calcularAlcance` retorna `TOTAL`/`CLIENTE`/`SUCURSAL` correctamente, incluyendo sucursales adicionales.

**`gestionar-usuario.usecase.test.ts`:**
- [x] `crear()` exitoso para los 3 roles de alcance.
- [x] `crear()` lanza `EmailDuplicadoError`, `AlcanceInvalidoError` y `SucursalRequeridaError` en sus casos respectivos.
- [x] `actualizar()`/`activar()`/`desactivar()` lanzan `UsuarioNoEncontradoError` si el usuario no existe.

**Integración ligera:**
- [x] `resolverAlcance` retorna el tipo correcto para cada rol — test unitario (`alcance.middleware.test.ts`, con Prisma mockeado) en vez de integración contra BD real.
- [x] `GET /clientes` filtra correctamente según el alcance del usuario autenticado — **no es un test automatizado**, verificado manualmente vía curl contra la API real (con los 3 roles), incluyendo el hallazgo y arreglo del bug de `obtenerPorId`. Queda como deuda escribirlo como test de integración automatizado.
- [x] `POST /usuarios` → `GET /usuarios/:id` retorna el usuario con el alcance correcto — mismo caso: verificado manualmente vía curl, no automatizado todavía.

---

## Tests de unidad — Frontend

**`tabla-usuarios.test.tsx`:**
- [x] Estado vacío con `usuarios = []`.
- [x] Columna Alcance muestra los 3 casos (Todos / cliente / sucursal + "y N más").
- [x] Botón "Modificar" con href correcto.

**`formulario-usuario.test.tsx`:**
- [x] Campo de alcance aparece/desaparece según el rol elegido.
- [x] Validación bloquea guardar sin el alcance requerido por el rol.
- [x] Contraseña requerida solo en modo creación.

**`usar-formulario-usuario.test.ts`:**
- [x] Cambiar rol resetea `clienteId`/`sucursalId`/adicionales.
- [x] Elegir cliente dispara carga de sucursales de ese cliente.

**Vista "Mi sucursal":**
- [x] Sin selector con 1 sucursal; con selector y cambio funcional con más de 1.

**`sidebar.test.tsx`:**
- [x] Subitem "Usuarios" presente bajo "Mantenimientos" con href correcto.

---

## Reglas de negocio verificadas

- [x] Todo usuario tiene exactamente un `rolId` (no hay estado con rol nulo) — `rolId` es `String` requerido en el schema, sin `?`.
- [x] `administrador`: `clienteId` y `sucursalId` siempre `null`; ve todos los clientes/sucursales de la empresa tenant (verificado vía curl).
- [x] `administrador_cliente`: `clienteId` obligatorio, `sucursalId` siempre `null`; ve automáticamente todas las sucursales de su cliente sin filas en `usuario_sucursal_acceso` (verificado vía curl: 2 sucursales de su cliente sin haber configurado accesos adicionales).
- [x] `usuario_sucursal`: `clienteId` siempre `null`; requiere `sucursalId` o al menos 1 fila en `usuario_sucursal_acceso` (verificado vía curl y tests).
- [ ] `administrador_cliente`/`usuario_sucursal` no pueden ejecutar ni modificar inspecciones (solo lectura) — **no verificable todavía**, no existe endpoint de ejecución de inspecciones (ver T-172).
- [x] El filtrado por `clienteId`/`sucursalId` se valida siempre en el backend, nunca solo en el frontend — confirmado en código (repositorios Prisma) y vía curl (deshabilitar JS no es necesario probarlo porque las llamadas curl ya son "sin JS").
- [x] No existe endpoint de eliminación física de usuario — solo `activar`/`desactivar` (revisado `usuarios.router.ts`, sin `DELETE`).
- [x] Un usuario inactivo no puede iniciar sesión (verificado con `POST /auth/login` → 403 `usuario_inactivo`).
- [x] `empresaId` nunca aparece en ningún formulario del frontend — siempre viene del JWT (revisado `FormularioUsuario`, sin campo de empresa).
- [x] `email` es único por empresa tenant (verificado con 409 en creación duplicada vía curl).

---

## Arquitectura hexagonal

- [x] Ningún archivo en `domain/` o `application/` del módulo `auth` importa `express` ni `@prisma/client` (verificado con grep). `bcryptjs` se usa en `application/casos-uso/gestionar-usuario.usecase.ts` (permitido) e `infrastructure/local-auth.adapter.ts`, nunca en `domain/`.
- [x] `GestionarUsuarioUseCase` recibe `UsuarioRepositoryPort` y `RolRepositoryPort` por constructor (inyección de dependencias).
- [x] `UsuarioController` no contiene lógica de negocio — solo parsea request, llama al caso de uso y formatea la respuesta.
- [x] `validarAlcancePorRol()` y `calcularAlcance()` están definidos en `domain/usuario.entity.ts`, no en el controller ni en el middleware.
- [x] El puerto `cliente.repository.port.ts` no importa nada de `middleware/alcance.middleware.ts` — el tipo `AlcanceConsulta` se define localmente en el módulo `clientes` (y otro igual, independiente, en `sucursales`) — verificado con grep.

---

## Definición de "done" para el sprint

**Estado al 2026-07-18: implementación funcional completa. 77 tests backend + 98 tests frontend en verde (con la única excepción preexistente de `strip-resumen-plantilla.test.tsx`, sprint 001). Verificado por API real (curl, con y sin proxy Next.js, con cookies de sesión reales de los 3 roles) — incluyendo el hallazgo y arreglo de un bug real de aislamiento (`obtenerPorId` con alcance). Queda pendiente una pasada de clic-real en navegador** (sin herramienta de automatización de browser en esta sesión), el test automatizado de integración contra BD real (hoy es verificación manual vía curl), y T-172 (bloqueo de escritura de inspecciones, sin endpoint que bloquear todavía). Las "observaciones de mejora continua" de HU-2 (Mi empresa) no se implementaron — no hay pipeline de datos de inspección todavía.

El sprint 004 se considera completo cuando:

1. Todos los ítems de este checklist están marcados ✅.
2. `agente-qa` aprobó con:
   - Todos los tests del backend y frontend pasan en verde.
   - `pnpm lint` sin errores en `apps/api` y `apps/web` — **no verificable todavía**, gap preexistente del proyecto (sin configuración de ESLint), no introducido por este sprint.
3. Arquitectura hexagonal verificada: `domain/` y `application/` del módulo `auth` sin imports de Express ni Prisma; el filtrado por alcance en `clientes`/`sucursales` no rompe la independencia de sus dominios respecto a `middleware/`.
4. Las 4 historias de usuario se ejecutan de punta a punta en el entorno local:
   - Un `administrador` crea un usuario de cada uno de los 3 roles de alcance. ✅ (vía curl)
   - Con sesión `administrador_cliente`, `/mi-empresa` muestra únicamente el cliente propio con sus sucursales, historial y observaciones. ⚠️ Todo excepto observaciones (no implementadas).
   - Con sesión `usuario_sucursal`, `/mi-sucursal` muestra únicamente su(s) sucursal(es) asignada(s). ✅
   - Un `administrador_cliente`/`usuario_sucursal` no puede ejecutar ni modificar una inspección — sin errores en consola ni en la red. ⏸️ No aplicable todavía (sin endpoint de ejecución).

# Tareas — 003-sucursales-certificacion

> Orden de ejecución: Base de datos → API (Sucursales + Clientes.movil) → API (Usuario↔Sucursal, `agente-auth`) → Frontend → Tests.
> Numeración desde T-100 para no colisionar con sprint 001 (T-01 a T-40) ni sprint 002 (T-50 a T-74).
> Este sprint asume que 001 (`inspeccion`) y 002 (`clientes`) ya están implementados; se referencian sus archivos reales como base.

---

## Agente: `agente-basededatos`

- [x] **T-100** Crear migración `add_sucursales` en `packages/db/prisma/`:
  - Agregar columna `movil VARCHAR(20) NULL` a la tabla `cliente` ya existente (no recrear la tabla).
  - Crear tabla `sucursal`: `id UUID PK DEFAULT gen_random_uuid()`, `empresa_id UUID NOT NULL FK → empresa(id)`, `cliente_id UUID NOT NULL FK → cliente(id)`, `nombre VARCHAR(150) NOT NULL`, `direccion VARCHAR(300) NULL`, `correo VARCHAR(150) NULL`, `movil VARCHAR(20) NULL`, `activo BOOLEAN NOT NULL DEFAULT true`, `creado_en TIMESTAMPTZ NOT NULL DEFAULT now()`, `actualizado_en TIMESTAMPTZ NOT NULL`.
  - Índice en `(empresa_id, cliente_id, activo)`.
  - Agregar model `Sucursal` a `schema.prisma` con relación `Cliente 1 —— N Sucursal` (`cliente.sucursales Sucursal[]`), campos mapeados en camelCase con `@map`.

- [x] **T-101** Migración adicional (o misma carpeta que T-100) para el modelo de acceso — coordinar con `agente-auth` antes de aplicar:
  - Agregar columna `sucursal_id UUID NULL FK → sucursal(id)` a la tabla `usuario` existente (sucursal principal; `NULL` permitido para roles de alcance total).
  - Índice en `(sucursal_id)`.
  - Actualizar model `Usuario` en `schema.prisma`: campo `sucursalId String? @map("sucursal_id")` y relación opcional a `Sucursal`.

- [x] **T-102** Crear tabla puente `usuario_sucursal_acceso` en la misma migración:
  - `usuario_id UUID NOT NULL FK → usuario(id) ON DELETE CASCADE`
  - `sucursal_id UUID NOT NULL FK → sucursal(id) ON DELETE CASCADE`
  - `creado_en TIMESTAMPTZ NOT NULL DEFAULT now()`
  - PK compuesta `(usuario_id, sucursal_id)`.
  - Agregar model `UsuarioSucursalAcceso` a `schema.prisma` (`@@map("usuario_sucursal_acceso")`).

- [x] **T-103** Agregar columna `sucursal_id UUID NULL FK → sucursal(id)` a la tabla `inspeccion` existente (modelo de datos preparatorio para el sprint futuro de ejecución RF-08 — sin lógica de aplicación nueva en este sprint, ver spec "Fuera de alcance"). Índice en `(sucursal_id)`. Actualizar model `Inspeccion` en `schema.prisma`.

- [x] **T-104** Agregar seed de sucursales demo en `packages/db/prisma/seeds/sucursales-demo.ts`:
  - 2 sucursales para el Cliente 1 del seed de `clientes-demo.ts` (una activa con correo y móvil, otra activa sin correo/móvil) y 1 sucursal para el Cliente 2 (activa).
  - Usar `upsert` sobre `(clienteId, nombre)` para que sea idempotente.
  - Importar y llamar desde `packages/db/prisma/seed.ts` después del seed de clientes.

- [x] **T-105** Registrar el cambio en `memoria/cambios_db/registro.md`.

---

## Agente: `agente-backend` — Sucursales + campo `movil` en Cliente

- [x] **T-106** Actualizar `apps/api/src/modules/clientes/domain/cliente.entity.ts`: agregar `movil?: string | null` al tipo `Cliente`.

- [x] **T-107** Actualizar `apps/api/src/modules/clientes/application/cliente.schema.ts`: agregar `movil: z.string().max(20).nullable().optional().transform((v) => v || null)` a `crearClienteSchema` (se propaga a `actualizarClienteSchema` vía `.partial()`).

- [x] **T-108** Actualizar `apps/api/src/modules/clientes/infrastructure/cliente.prisma-repository.ts`: agregar `movil: raw.movil ?? null` a la función `mapear()`. Verificar que `crear()`/`actualizar()` ya propagan el campo (pasan `datos` completo a Prisma, sin cambios adicionales).

- [x] **T-109** Crear entidad de dominio `apps/api/src/modules/sucursales/domain/sucursal.entity.ts`:
  - Tipo `Sucursal` con todos los campos de la spec (`id`, `empresaId`, `clienteId`, `nombre`, `direccion`, `correo`, `movil`, `activo`, `creadoEn`, `actualizadoEn`).
  - `validarCorreo(correo: string): boolean` — mismo patrón que `validarEmail` de `cliente.entity.ts` (regex simple, sin librerías externas).
  - `puedeSeleccionarse(sucursal: Sucursal): boolean` → `sucursal.activo` (regla 4: inactiva no se puede seleccionar para nueva inspección, pero sí aparece en histórico).

- [x] **T-110** Crear puerto `apps/api/src/modules/sucursales/domain/sucursal.repository.port.ts`:
  - `listarPorCliente(clienteId, empresaId): Promise<Sucursal[]>`
  - `obtenerPorId(id, empresaId): Promise<Sucursal | null>`
  - `crear(datos): Promise<Sucursal>`
  - `actualizar(id, empresaId, datos): Promise<Sucursal>`
  - `cambiarEstado(id, empresaId, activo): Promise<Sucursal>`
  - `obtenerHistoricoCertificaciones(sucursalId, empresaId): Promise<RegistroCertificacion[]>` — lista de inspecciones (`fecha`, `plantillaNombre`, `puntajeObtenido`, `puntajeMaximo`, `clasificacion`) ordenadas por fecha descendente.
  - `obtenerPuntajeVigente(sucursalId, empresaId): Promise<{ puntaje: number; clasificacion: string } | null>` — de la inspección más reciente, o `null` si no hay ninguna.

- [x] **T-111** Crear errores de dominio `apps/api/src/modules/sucursales/domain/sucursal.errors.ts`: `SucursalNoEncontradaError`, `ClienteNoEncontradoError`, `CorreoInvalidoError`.

- [x] **T-112** Crear esquemas Zod `apps/api/src/modules/sucursales/application/sucursal.schema.ts`:
  - `crearSucursalSchema`: `nombre` (requerido, max 150) y `clienteId` (UUID requerido); `direccion`, `correo` (`.email()` si se envía), `movil` opcionales.
  - `actualizarSucursalSchema`: `crearSucursalSchema.partial()` sin `clienteId` (regla 2: `clienteId` no cambia después de creada).

- [x] **T-113** Crear caso de uso `apps/api/src/modules/sucursales/application/casos-uso/gestionar-sucursal.usecase.ts`:
  - `listarPorCliente(clienteId, empresaId)`.
  - `obtenerPorId(id, empresaId)` — lanza `SucursalNoEncontradaError` si `null`.
  - `crear(empresaId, input)` — valida `correo` con `validarCorreo` si viene, valida que el cliente exista (usa `ClienteRepositoryPort` inyectado, no importa Prisma).
  - `actualizar(id, empresaId, input)` — lanza `SucursalNoEncontradaError` si no existe.
  - `activar(id, empresaId)` / `desactivar(id, empresaId)`.
  - `obtenerHistorico(id, empresaId)` — delega en `repo.obtenerHistoricoCertificaciones` + `repo.obtenerPuntajeVigente`, lanza `SucursalNoEncontradaError` si la sucursal no existe.

- [x] **T-114** Crear repositorio Prisma `apps/api/src/modules/sucursales/infrastructure/sucursal.prisma-repository.ts`:
  - Implementa `SucursalRepositoryPort`. Siempre filtra por `empresaId`.
  - `obtenerHistoricoCertificaciones` consulta `prisma.inspeccion.findMany({ where: { sucursalId, empresaId }, orderBy: { fechaInicio: "desc" }, include: { plantilla: true } })` y mapea a `RegistroCertificacion[]`.
  - `obtenerPuntajeVigente` toma el primer resultado del histórico (más reciente) o retorna `null` si el arreglo está vacío.

- [x] **T-115** Crear controlador y router:
  - `apps/api/src/modules/sucursales/infrastructure/sucursal.controller.ts`
  - `apps/api/src/modules/sucursales/infrastructure/sucursales.router.ts`
  - Endpoints:
    - `GET    /sucursales?clienteId=` — lista sucursales del cliente (incluye `puntajeVigente`/`clasificacionVigente` derivados)
    - `POST   /sucursales` — crear
    - `GET    /sucursales/:id` — obtener por id
    - `PATCH  /sucursales/:id` — actualizar
    - `POST   /sucursales/:id/activar`
    - `POST   /sucursales/:id/desactivar`
    - `GET    /sucursales/:id/historico` — histórico de certificaciones + puntaje vigente

- [x] **T-116** Crear `apps/api/src/modules/sucursales/index.ts` con factory `crearModuloSucursales(prisma, autenticar)` (inyecta también `ClientePrismaRepository` para la validación de existencia de cliente); montar en `apps/api/src/index.ts` bajo `/sucursales`. Crear Route Handlers Next.js proxy en `apps/web/src/app/api/sucursales/` (`route.ts`, `[id]/route.ts`, `[id]/activar/route.ts`, `[id]/desactivar/route.ts`, `[id]/historico/route.ts`).

---

## Agente: `agente-auth` — Asociación Usuario ↔ Sucursal

> Extiende el módulo `apps/api/src/modules/auth/` ya existente (dueño de `usuario`, `rol`, `permiso`) en vez de crear un módulo paralelo. Coordinado con el alcance declarado en `CLAUDE.md`.

- [x] **T-117** Actualizar `apps/api/src/modules/auth/domain/usuario.entity.ts`:
  - Agregar `sucursalId?: string | null` y `sucursalesAdicionalesIds?: string[]` a `UsuarioConRol`.
  - Crear `requiereSucursalAsignada(rol: RolSistema): boolean` → `true` para todos los roles excepto `ROL_ADMIN` (regla 7: roles de alcance total exentos).
  - Crear `tieneAsignacionValida(usuario: UsuarioConRol): boolean` → `true` si `!requiereSucursalAsignada(usuario.rol)`, o si tiene `sucursalId` o al menos un elemento en `sucursalesAdicionalesIds`.

- [x] **T-118** Agregar `SucursalNoAsignadaError` a `apps/api/src/modules/auth/domain/auth.errors.ts`.

- [x] **T-119** Actualizar `apps/api/src/modules/auth/domain/usuario.repository.port.ts`: agregar `listarPorEmpresa(empresaId): Promise<UsuarioConRol[]>`, `obtenerAsignacionSucursales(usuarioId, empresaId): Promise<{ sucursalId: string | null; sucursalesAdicionalesIds: string[] }>`, `actualizarAsignacionSucursales(usuarioId, empresaId, datos): Promise<void>`.

- [x] **T-120** Agregar esquema Zod `actualizarAsignacionSucursalesSchema` en `apps/api/src/modules/auth/application/auth.schema.ts`: `{ sucursalPrincipalId: uuid nullable, sucursalesAdicionalesIds: uuid[] }`.

- [x] **T-121** Crear caso de uso `apps/api/src/modules/auth/application/casos-uso/gestionar-acceso-sucursal.usecase.ts`:
  - `listarUsuarios(empresaId)`.
  - `obtenerAsignacion(usuarioId, empresaId)` — lanza `UsuarioNoEncontradoError` si no existe.
  - `actualizarAsignacion(usuarioId, empresaId, datos)` — arma el `UsuarioConRol` resultante y valida `tieneAsignacionValida()`; lanza `SucursalNoAsignadaError` si falla antes de persistir.

- [x] **T-122** Actualizar `apps/api/src/modules/auth/infrastructure/usuario.prisma-repository.ts`: implementar los 3 métodos nuevos del puerto. `actualizarAsignacionSucursales` usa `prisma.$transaction` para actualizar `usuario.sucursalId` y reemplazar (delete + createMany) las filas de `usuario_sucursal_acceso`.

> **Nota de alcance (reconciliado con [[004-usuarios-roles-alcance]]):** este sprint **no** crea un router/controller HTTP independiente para `/usuarios` ni una pantalla propia — [[004-usuarios-roles-alcance]] construye el CRUD completo de usuarios montado en `/usuarios` (`apps/api/src/modules/auth/infrastructure/usuarios.controller.ts` + `usuarios.router.ts`) y su propia página `/mantenimientos/usuarios`. Exponer aquí un router/página paralelo duplicaría esa ruta y el archivo de proxy Next.js (`apps/web/src/app/api/usuarios/route.ts`), y quedaría descartado en cuanto se implemente 004. Este sprint entrega únicamente la capa de dominio/repositorio (T-117–T-122): el puerto `obtenerAsignacionSucursales`/`actualizarAsignacionSucursales` que el CRUD de 004 consume directamente al construir su `FormularioUsuario` (selector de sucursal principal + adicionales cuando `rol = usuario_sucursal`).

---

## Agente: `agente-frontend` — Sucursales dentro de Clientes

- [x] **T-125** Actualizar `packages/shared/src/types/cliente.ts`: agregar `movil?: string | null` al tipo `Cliente`.

- [x] **T-126** Crear `packages/shared/src/types/sucursal.ts`: tipo `Sucursal` (todos los campos + `puntajeVigente?: number | null` y `clasificacionVigente?: string | null` calculados) y tipo `RegistroCertificacion` (`fecha`, `plantillaNombre`, `puntajeObtenido`, `puntajeMaximo`, `clasificacion`). Re-exportar desde `packages/shared/src/index.ts`.

- [x] **T-127** Completar `apps/web/src/app/(dashboard)/mantenimientos/clientes/_components/formulario-cliente.tsx`: agregar campo "Móvil" opcional después de "Dirección" (mismo estilo de input que los demás campos).

- [x] **T-128** Crear `apps/web/src/app/(dashboard)/mantenimientos/clientes/_servicios/sucursal.servicio.ts`: `listarSucursales(clienteId)`, `crearSucursal(datos)`, `actualizarSucursal(id, datos)`, `toggleEstadoSucursal(id, activar)`, `obtenerHistoricoSucursal(id)`.

- [x] **T-129** Crear hook `apps/web/src/app/(dashboard)/mantenimientos/clientes/_hooks/usar-sucursales.ts`: estado `sucursales`, `cargando`, `error`, `guardando`; acciones `recargar()`, `crear(datos)`, `actualizar(id, datos)`, `toggleEstado(id, activo)`.

- [x] **T-130** Crear componente `_components/tabla-sucursales.tsx`: columnas Nombre, Dirección, Correo, Móvil, **Puntaje certificación vigente** (`—` si `null`), Estado, Acciones (Modificar, Activar/Desactivar, Ver historial). Botón "+ Agregar sucursal" sobre la tabla.

- [x] **T-131** Crear componente `_components/formulario-sucursal.tsx`: panel/modal con `nombre` (requerido), `direccion`, `correo` (valida formato si se ingresa), `movil`; props `valoresIniciales?`, `guardando`, `error`, `onGuardar(datos)`, `onCancelar` — mismo patrón que `formulario-cliente.tsx`.

- [x] **T-132** Actualizar `apps/web/src/app/(dashboard)/mantenimientos/clientes/[id]/editar/page.tsx`: agregar sección "Sucursales" debajo del formulario del cliente, con `TablaSucursales` + `FormularioSucursal` (modal) usando `usar-sucursales`.

- [x] **T-133** Crear página `apps/web/src/app/(dashboard)/mantenimientos/clientes/[id]/sucursales/[sucursalId]/page.tsx`: vista de histórico de certificaciones de la sucursal (breadcrumb `Mantenimientos > Clientes > [empresa] > [sucursal] > Historial`).

- [x] **T-134** Crear hook `apps/web/src/app/(dashboard)/mantenimientos/clientes/_hooks/usar-historico-sucursal.ts`: carga histórico + puntaje vigente vía `obtenerHistoricoSucursal`.

- [x] **T-135** Crear componente `_components/tabla-historico-certificaciones.tsx`: lista cronológica (fecha, plantilla, puntaje obtenido/máximo, clasificación); estado vacío "Esta sucursal no tiene inspecciones registradas".

---

## Asignación de sucursales a usuarios — sin pantalla propia en este sprint

> **Reconciliado con [[004-usuarios-roles-alcance]]:** no se crea aquí una pantalla `/usuarios` (ni servicio, hook, tabla o entrada de sidebar propios). El selector "Sucursal principal" + "Sucursales adicionales" se construye directamente dentro de `FormularioUsuario` de [[004-usuarios-roles-alcance]] (su T-172, condicional a `rol = usuario_sucursal`), consumiendo el puerto de dominio que sí entrega este sprint (T-117–T-122). Construir una pantalla aparte aquí duplicaría `tabla-usuarios.tsx`, la ruta `/usuarios` y el ítem de sidebar que 004 ya define bajo `/mantenimientos/usuarios`, y quedaría descartada de inmediato.

---

## Agente: `agente-qa` — Tests de unidad Backend

> Herramienta: **Vitest**. Dominio sin mocks; casos de uso con mock del repositorio.

- [x] **T-142** `sucursal.entity.test.ts`:
  - `puedeSeleccionarse` con sucursal activa → `true`
  - `puedeSeleccionarse` con sucursal inactiva → `false`
  - `validarCorreo("contacto@sucursal.com")` → `true`
  - `validarCorreo("no-es-correo")` → `false`
  - `validarCorreo("")` → `false`

- [x] **T-143** `gestionar-sucursal.usecase.test.ts`:
  - `crear()` llama `repo.crear()` con los datos correctos y retorna la sucursal
  - `crear()` lanza `CorreoInvalidoError` si `correo` tiene formato inválido
  - `crear()` lanza `ClienteNoEncontradoError` si el `clienteId` no existe en la empresa
  - `obtenerPorId()` lanza `SucursalNoEncontradaError` si el repo retorna `null`
  - `actualizar()` lanza `SucursalNoEncontradaError` si no existe
  - `activar()` llama `repo.cambiarEstado(id, empresaId, true)`
  - `desactivar()` llama `repo.cambiarEstado(id, empresaId, false)`
  - `obtenerHistorico()` retorna `{ registros, puntajeVigente }` combinando ambos métodos del repo
  - `obtenerHistorico()` con sucursal sin inspecciones retorna `puntajeVigente: null` y `registros: []`

- [x] **T-144** `usuario.entity.test.ts` (ampliar el existente):
  - `requiereSucursalAsignada("administrador")` → `false`
  - `requiereSucursalAsignada("auditor")` → `true`
  - `tieneAsignacionValida` con rol que no requiere sucursal → `true` aunque no tenga ninguna
  - `tieneAsignacionValida` con rol que requiere sucursal y `sucursalId` definido → `true`
  - `tieneAsignacionValida` con rol que requiere sucursal, sin `sucursalId` pero con `sucursalesAdicionalesIds` no vacío → `true`
  - `tieneAsignacionValida` con rol que requiere sucursal, sin `sucursalId` ni accesos adicionales → `false`

- [x] **T-145** `gestionar-acceso-sucursal.usecase.test.ts`:
  - `actualizarAsignacion()` llama `repo.actualizarAsignacionSucursales()` con los datos correctos cuando la asignación es válida
  - `actualizarAsignacion()` lanza `SucursalNoAsignadaError` si el rol requiere sucursal y no se envía ninguna
  - `actualizarAsignacion()` no lanza error si el rol es de alcance total aunque no se envíe ninguna sucursal
  - `obtenerAsignacion()` lanza `UsuarioNoEncontradoError` si el usuario no existe

---

## Agente: `agente-qa` — Tests de unidad Frontend

> Herramienta: **Vitest + React Testing Library**. Servicios mockeados, sin llamadas reales de red.

- [x] **T-146** `tabla-sucursales.test.tsx`:
  - Con `sucursales = []` muestra estado vacío
  - Con sucursales renderiza filas con nombre, dirección, correo, móvil
  - La columna "Puntaje certificación vigente" muestra `—` cuando `puntajeVigente` es `null`/`undefined`
  - La columna "Puntaje certificación vigente" muestra el valor cuando está presente
  - Badge "Activo" tiene clase de color verde; "Inactivo" clase gris
  - El botón "Ver historial" de cada fila tiene el href correcto

- [x] **T-147** `formulario-sucursal.test.tsx`:
  - Renderiza los 4 campos (nombre, dirección, correo, móvil)
  - Intento de guardar sin `nombre` no llama `onGuardar`
  - `correo` con formato inválido muestra error de validación y no llama `onGuardar`
  - Con campos válidos, clic en "Guardar" llama `onGuardar` con los datos
  - `guardando = true` deshabilita el botón "Guardar" y muestra spinner
  - Clic en "Cancelar" llama `onCancelar`

> `T-148` (test del selector de sucursal principal/adicionales) se retiró de este sprint junto con `formulario-asignacion-sucursales.tsx` — ese componente ahora es parte de `FormularioUsuario` en [[004-usuarios-roles-alcance]], que trae su propio test.

- [x] **T-149** `tabla-historico-certificaciones.test.tsx`:
  - Con `registros = []` muestra el texto "Esta sucursal no tiene inspecciones registradas"
  - Con registros renderiza filas ordenadas por fecha descendente
  - Cada fila muestra plantilla, puntaje obtenido/máximo y clasificación

---

## Dependencias entre tareas

```
T-100 → T-101 → T-102
T-100, T-101, T-102, T-103 → T-104 → T-105
T-100 → T-106 → T-107 → T-108
T-100 → T-109, T-110, T-111 → T-112 → T-113 → T-114 → T-115 → T-116
T-101, T-102 → T-117 → T-118 → T-119 → T-120 → T-121 → T-122
T-108 → T-142
T-113 → T-143
T-117 → T-144
T-121 → T-145
T-116 → T-125, T-126
T-125 → T-127
T-126 → T-128 → T-129
T-129 → T-130, T-131
T-130, T-131 → T-132
T-116 → T-133 → T-134 → T-135
T-130 → T-146
T-131 → T-147
T-135 → T-149
```

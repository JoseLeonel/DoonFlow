# Tareas — 002-crud-clientes

> Orden de ejecución: Base de datos → API → Frontend → Tests.
> Numeración desde T-50 para no colisionar con el sprint 001 (T-01 a T-40).

---

## Agente: `agente-basededatos`

- [ ] **T-50** Crear migración `add_clientes` en `packages/db/prisma/`:
  - Tabla `cliente`:
    - `id UUID PK DEFAULT gen_random_uuid()`
    - `empresa_id UUID FK → empresa(id)`
    - `nombre_responsable VARCHAR(200) NOT NULL`
    - `empresa VARCHAR(200) NOT NULL`
    - `identificacion_empresa VARCHAR(50) NULLABLE`
    - `correo1 VARCHAR(150) NOT NULL`
    - `correo2 VARCHAR(150) NULLABLE`
    - `correo3 VARCHAR(150) NULLABLE`
    - `direccion VARCHAR(300) NULLABLE`
    - `activo BOOLEAN NOT NULL DEFAULT true`
    - `creado_en TIMESTAMPTZ NOT NULL DEFAULT now()`
    - `actualizado_en TIMESTAMPTZ NOT NULL`
  - Índice en `(empresa_id, activo)`.
  - Índice único parcial en `(empresa_id, identificacion_empresa)` donde `identificacion_empresa IS NOT NULL`.
  - Agregar model `Cliente` al schema Prisma con los campos mapeados en camelCase.

- [ ] **T-51** Agregar seed de clientes demo en `packages/db/prisma/seeds/clientes-demo.ts`:
  - 3 clientes para `empresa_id = "00000000-0000-0000-0000-000000000001"`:
    - Cliente 1: empresa activa con correo1 y correo2.
    - Cliente 2: empresa activa con solo correo1 e identificación.
    - Cliente 3: empresa inactiva con los 3 correos.
  - Usar `upsert` sobre `correo1` para que sea idempotente.
  - Importar y llamar desde `packages/db/prisma/seed.ts`.

- [ ] **T-52** Registrar el cambio en `memoria/cambios_db/registro.md`.

---

## Agente: `agente-backend`

- [ ] **T-53** Crear entidad de dominio `apps/api/src/modules/clientes/domain/cliente.entity.ts`:
  - Tipo `Cliente` con todos los campos.
  - `validarEmail(email: string): boolean` — valida formato sin librerías externas.
  - `puedeSeleccionarse(cliente: Cliente): boolean` → `cliente.activo`.

- [ ] **T-54** Crear puerto `apps/api/src/modules/clientes/domain/cliente.repository.port.ts`:
  - `listar(empresaId): Promise<Cliente[]>`
  - `obtenerPorId(id, empresaId): Promise<Cliente | null>`
  - `crear(datos): Promise<Cliente>`
  - `actualizar(id, empresaId, datos): Promise<Cliente>`
  - `cambiarEstado(id, empresaId, activo): Promise<Cliente>`

- [ ] **T-55** Crear errores de dominio `apps/api/src/modules/clientes/domain/cliente.errors.ts`:
  - `ClienteNoEncontradoError`
  - `IdentificacionDuplicadaError`
  - `EmailInvalidoError`

- [ ] **T-56** Crear esquemas Zod `apps/api/src/modules/clientes/application/cliente.schema.ts`:
  - `crearClienteSchema`: `nombreResponsable` y `empresa` requeridos, `correo1` requerido con `.email()`, `correo2` y `correo3` opcionales con `.email()` si presentes, resto opcionales.
  - `actualizarClienteSchema`: todos los campos opcionales (`.partial()`).

- [ ] **T-57** Crear caso de uso `apps/api/src/modules/clientes/application/casos-uso/gestionar-cliente.usecase.ts`:
  - `listar(empresaId)` — retorna todos los clientes de la empresa.
  - `obtenerPorId(id, empresaId)` — lanza `ClienteNoEncontradoError` si null.
  - `crear(empresaId, input)` — valida emails, valida unicidad de `identificacionEmpresa`.
  - `actualizar(id, empresaId, input)` — lanza `ClienteNoEncontradoError` si no existe.
  - `activar(id, empresaId)` / `desactivar(id, empresaId)`.

- [ ] **T-58** Crear repositorio Prisma `apps/api/src/modules/clientes/infrastructure/cliente.prisma-repository.ts`:
  - Implementa `ClienteRepositoryPort`.
  - Siempre filtra por `empresaId`.
  - `listar` ordena por `empresa ASC, nombreResponsable ASC`.

- [ ] **T-59** Crear controlador y router:
  - `apps/api/src/modules/clientes/infrastructure/cliente.controller.ts`
  - `apps/api/src/modules/clientes/infrastructure/clientes.router.ts`
  - Endpoints:
    - `GET    /clientes` — lista todos los clientes de la empresa
    - `POST   /clientes` — crear cliente
    - `GET    /clientes/:id` — obtener por id
    - `PATCH  /clientes/:id` — actualizar
    - `POST   /clientes/:id/activar`
    - `POST   /clientes/:id/desactivar`

- [ ] **T-60** Crear `apps/api/src/modules/clientes/index.ts` con factory `crearModuloClientes(prisma, autenticar)` y montar en `apps/api/src/index.ts` bajo `/clientes`.

- [ ] **T-61** Crear Route Handlers Next.js proxy `apps/web/src/app/api/clientes/`:
  - `route.ts` → `GET` + `POST`
  - `[id]/route.ts` → `GET` + `PATCH`
  - `[id]/activar/route.ts` → `POST`
  - `[id]/desactivar/route.ts` → `POST`

---

## Agente: `agente-frontend`

- [ ] **T-62** Agregar tipos en `packages/shared/src/types/cliente.ts`:
  - `Cliente` (refleja todos los campos de la entidad).
  - Re-exportar desde `packages/shared/src/index.ts`.

- [ ] **T-63** Crear `apps/web/src/app/(dashboard)/mantenimientos/clientes/_servicios/cliente.servicio.ts`:
  - `listarClientes()`, `obtenerCliente(id)`, `crearCliente(datos)`, `actualizarCliente(id, datos)`, `toggleEstadoCliente(id, activar)`.

- [ ] **T-64** Crear hook `apps/web/src/app/(dashboard)/mantenimientos/clientes/_hooks/usar-clientes.ts`:
  - Estado: `clientes`, `cargando`, `error`.
  - Acciones: `recargar()`, `toggleEstado(id, activo)`.

- [ ] **T-65** Crear componente `_components/tabla-clientes.tsx`:
  - Columnas: Empresa, Responsable, Identificación, Correo principal, Estado, **Modificar**.
  - Cada fila tiene botón **"Modificar"** que navega a `/mantenimientos/clientes/[id]/editar`.
  - Badge estado: activo (verde) / inactivo (gris).
  - Skeleton de carga (5 filas con `animate-pulse`).
  - Estado vacío con botón "Agregar primer cliente".

- [ ] **T-66** Crear página lista `apps/web/src/app/(dashboard)/mantenimientos/clientes/page.tsx`:
  - Header: título "Clientes" + subtítulo + botón **"+ Agregar cliente"** alineado a la derecha.
  - Renderiza `TablaClientes`.
  - Usa `usar-clientes`.

- [ ] **T-67** Crear formulario compartido `_components/formulario-cliente.tsx`:
  - Campos: Nombre completo (responsable), Empresa, Identificación empresa, Dirección, Correo 1, Correo 2, Correo 3.
  - Validación antes de enviar: `nombreResponsable`, `empresa` y `correo1` requeridos; los tres correos con formato válido si se ingresan.
  - Props: `valoresIniciales?`, `guardando`, `error`, `onGuardar(datos)`, `onCancelar`.
  - Botones: "Guardar" (primario, spinner cuando `guardando`) y "Cancelar".

- [ ] **T-68** Crear página nuevo `apps/web/src/app/(dashboard)/mantenimientos/clientes/nuevo/page.tsx`:
  - Breadcrumb: `Mantenimientos > Clientes > Nuevo cliente`.
  - Usa `FormularioCliente`.
  - Al guardar exitosamente → navega a `/mantenimientos/clientes`.

- [ ] **T-69** Crear página editar `apps/web/src/app/(dashboard)/mantenimientos/clientes/[id]/editar/page.tsx`:
  - Breadcrumb: `Mantenimientos > Clientes > [empresa del cliente]`.
  - Carga el cliente al montar; pre-carga `FormularioCliente` con `valoresIniciales`.
  - Badge Activo/Inactivo en el encabezado.
  - Al guardar → mensaje de éxito inline.
  - Skeleton mientras carga el cliente.

- [ ] **T-70** Actualizar `apps/web/src/app/(dashboard)/mantenimientos/page.tsx`:
  - Agregar tarjeta "Clientes" con icono, descripción breve y botón "Ver clientes" → `/mantenimientos/clientes`.

---

## Agente: `agente-qa` — Tests de unidad Backend

- [ ] **T-71** `cliente.entity.test.ts`:
  - `puedeSeleccionarse` con cliente activo → `true`
  - `puedeSeleccionarse` con cliente inactivo → `false`
  - `validarEmail("usuario@dominio.com")` → `true`
  - `validarEmail("no-es-email")` → `false`
  - `validarEmail("")` → `false`

- [ ] **T-72** `gestionar-cliente.usecase.test.ts`:
  - `obtenerPorId()` lanza `ClienteNoEncontradoError` si el repo retorna null
  - `crear()` llama `repo.crear()` con los datos correctos
  - `crear()` lanza `EmailInvalidoError` si `correo1` tiene formato inválido
  - `actualizar()` lanza `ClienteNoEncontradoError` si no existe
  - `activar()` llama `repo.cambiarEstado(id, empresaId, true)`
  - `desactivar()` llama `repo.cambiarEstado(id, empresaId, false)`

---

## Agente: `agente-qa` — Tests de unidad Frontend

- [ ] **T-73** `tabla-clientes.test.tsx`:
  - Con `clientes = []` muestra estado vacío "No hay clientes registrados"
  - Con clientes renderiza filas con empresa, responsable y correo1
  - El botón "Modificar" de cada fila tiene el href `/mantenimientos/clientes/[id]/editar`
  - Badge "Activo" tiene clase de color verde
  - Badge "Inactivo" tiene clase de color gris

- [ ] **T-74** `formulario-cliente.test.tsx`:
  - Renderiza los 7 campos del formulario
  - Intento de guardar sin `nombreResponsable` no llama `onGuardar`
  - Intento de guardar sin `empresa` no llama `onGuardar`
  - Intento de guardar sin `correo1` no llama `onGuardar`
  - `correo1` con formato inválido muestra error de validación
  - Con todos los campos válidos, clic en "Guardar" llama `onGuardar` con los datos
  - `guardando = true` deshabilita el botón "Guardar" y muestra spinner
  - Clic en "Cancelar" llama `onCancelar`

---

## Dependencias entre tareas

```
T-50, T-51 → T-52
T-50 → T-53, T-54, T-55
T-54, T-55 → T-56 → T-57 → T-58 → T-59 → T-60 → T-61
T-61 → T-62 → T-63 → T-64
T-63 → T-65, T-67
T-64, T-65 → T-66
T-67 → T-68, T-69
T-66 → T-70
T-53 → T-71
T-57 → T-72
T-65 → T-73
T-67 → T-74
```

# Checklist de aceptación — 002-crud-clientes

> Un ítem no se marca ✅ hasta que el comportamiento es verificable en el navegador o en un test. "Está escrito" no es suficiente.

---

## Base de datos

- [ ] La migración `add_clientes` aplica sin errores (`pnpm --filter db migrate:dev`).
- [ ] La tabla `cliente` existe con las columnas: `id`, `empresa_id`, `nombre_responsable`, `empresa`, `identificacion_empresa`, `correo1`, `correo2`, `correo3`, `direccion`, `activo`, `creado_en`, `actualizado_en`.
- [ ] El índice único parcial en `(empresa_id, identificacion_empresa)` existe y funciona: insertar duplicado retorna error de unicidad.
- [ ] El índice de rendimiento en `(empresa_id, activo)` existe (`\d cliente` en psql).
- [ ] Los 3 clientes del seed demo se insertan correctamente con `pnpm --filter db seed`.
- [ ] El seed es idempotente: ejecutar dos veces no duplica registros.

---

## API — Clientes

- [ ] `POST /clientes` crea el cliente y retorna `{ data: Cliente }` con `id` generado.
- [ ] `GET /clientes` retorna todos los clientes de la empresa en array `{ data: [...] }`.
- [ ] `GET /clientes/:id` retorna el cliente completo.
- [ ] `GET /clientes/:id` de otra empresa retorna 404 (aislamiento multiempresa).
- [ ] `PATCH /clientes/:id` actualiza solo los campos enviados; los demás no cambian.
- [ ] `POST /clientes/:id/desactivar` pone `activo = false`.
- [ ] `POST /clientes/:id/activar` pone `activo = true`.
- [ ] `POST /clientes` con `correo1` de formato inválido retorna 400 con `codigo: "email_invalido"`.
- [ ] `POST /clientes` con `correo2` de formato inválido (si se envía) retorna 400 con `codigo: "email_invalido"`.
- [ ] `POST /clientes` con `identificacionEmpresa` duplicada para la misma empresa retorna 409 con `codigo: "identificacion_duplicada"`.
- [ ] `POST /clientes` sin `nombreResponsable` retorna 400.
- [ ] `POST /clientes` sin `empresa` retorna 400.
- [ ] `POST /clientes` sin `correo1` retorna 400.
- [ ] Todas las rutas retornan 401 sin token.

---

## Frontend — Página hub Mantenimientos (`/mantenimientos`)

- [ ] La página muestra una tarjeta "Clientes" con descripción breve.
- [ ] La tarjeta tiene botón "Ver clientes" que navega a `/mantenimientos/clientes`.

---

## Frontend — Lista de clientes (`/mantenimientos/clientes`)

- [ ] La tabla carga con datos reales del API (no mock).
- [ ] Se muestran columnas: Empresa, Responsable, Identificación, Correo principal, Estado, Acciones.
- [ ] La columna Identificación muestra `—` cuando el cliente no tiene `identificacionEmpresa`.
- [ ] La columna "Correo principal" muestra el valor de `correo1`.
- [ ] Cada fila tiene un botón **"Modificar"** que navega a `/mantenimientos/clientes/[id]/editar`.
- [ ] El botón **"+ Agregar cliente"** está alineado a la derecha del encabezado y navega a `/mantenimientos/clientes/nuevo`.
- [ ] Badge "Activo" tiene color verde; badge "Inactivo" tiene color gris.
- [ ] Mientras el API responde, se muestran 5 filas skeleton con `animate-pulse`.
- [ ] Con la lista vacía se muestra estado vacío con texto "No hay clientes registrados" y botón "Agregar primer cliente".
- [ ] Si el API falla, se muestra mensaje de error.
- [ ] El breadcrumb muestra `Mantenimientos > Clientes` y "Mantenimientos" es enlace a `/mantenimientos`.

---

## Frontend — Formulario nuevo cliente (`/mantenimientos/clientes/nuevo`)

- [ ] El breadcrumb muestra `Mantenimientos > Clientes > Nuevo cliente`.
- [ ] El formulario muestra los 7 campos: Nombre completo, Empresa, Identificación empresa, Dirección, Correo 1, Correo 2, Correo 3.
- [ ] El campo "Nombre completo (persona responsable)" es obligatorio: no envía si está vacío.
- [ ] El campo "Empresa" es obligatorio: no envía si está vacío.
- [ ] El campo "Correo 1" es obligatorio: no envía si está vacío.
- [ ] "Correo 1" con formato inválido no envía y muestra error de validación.
- [ ] "Correo 2" y "Correo 3" son opcionales: si se ingresan, validan formato antes de enviar.
- [ ] Al guardar exitosamente redirige a `/mantenimientos/clientes`.
- [ ] Mientras se guarda, el botón "Guardar" muestra spinner y queda deshabilitado.
- [ ] Si el API retorna error, se muestra el mensaje bajo el formulario.
- [ ] El botón "Cancelar" vuelve a `/mantenimientos/clientes` sin guardar.

---

## Frontend — Formulario editar cliente (`/mantenimientos/clientes/[id]/editar`)

- [ ] El breadcrumb muestra `Mantenimientos > Clientes > [empresa del cliente]`.
- [ ] Los 7 campos se pre-cargan con los datos actuales del cliente.
- [ ] El encabezado muestra el nombre de la empresa y un badge "Activo" (verde) o "Inactivo" (gris) según el estado.
- [ ] Al guardar exitosamente muestra mensaje verde de confirmación inline (no navega a otra página).
- [ ] Si el cliente no existe (404), se muestra tarjeta de error "Cliente no encontrado".
- [ ] El botón "Cancelar" vuelve a `/mantenimientos/clientes`.
- [ ] Mientras carga el cliente inicial, el formulario muestra skeleton.

---

## Tests de unidad — Backend

**`cliente.entity.test.ts`:**
- [ ] `puedeSeleccionarse` con cliente activo → `true`
- [ ] `puedeSeleccionarse` con cliente inactivo → `false`
- [ ] `validarEmail("usuario@dominio.com")` → `true`
- [ ] `validarEmail("no-es-email")` → `false`
- [ ] `validarEmail("")` → `false`

**`gestionar-cliente.usecase.test.ts`:**
- [ ] `obtenerPorId()` lanza `ClienteNoEncontradoError` si el repo retorna null
- [ ] `crear()` llama `repo.crear()` con los datos del input
- [ ] `crear()` lanza `EmailInvalidoError` si `correo1` tiene formato inválido
- [ ] `actualizar()` lanza `ClienteNoEncontradoError` si no existe
- [ ] `activar()` llama `repo.cambiarEstado(id, empresaId, true)`
- [ ] `desactivar()` llama `repo.cambiarEstado(id, empresaId, false)`

---

## Tests de unidad — Frontend

**`tabla-clientes.test.tsx`:**
- [ ] Con `clientes = []` renderiza estado vacío con texto "No hay clientes registrados"
- [ ] Con clientes renderiza filas con empresa, responsable y correo1
- [ ] La columna Identificación muestra `—` cuando `identificacionEmpresa` es null/undefined
- [ ] El botón "Modificar" de cada fila tiene el href `/mantenimientos/clientes/[id]/editar`
- [ ] Badge "Activo" tiene clase de color verde
- [ ] Badge "Inactivo" tiene clase de color gris

**`formulario-cliente.test.tsx`:**
- [ ] Renderiza los 7 campos del formulario
- [ ] Intento de guardar sin `nombreResponsable` no llama `onGuardar`
- [ ] Intento de guardar sin `empresa` no llama `onGuardar`
- [ ] Intento de guardar sin `correo1` no llama `onGuardar`
- [ ] `correo1` con formato inválido muestra error de validación y no llama `onGuardar`
- [ ] Con todos los campos válidos, clic en "Guardar" llama `onGuardar` con los datos
- [ ] `guardando = true` deshabilita el botón "Guardar" y muestra spinner
- [ ] Clic en "Cancelar" llama `onCancelar`

---

## Reglas de negocio verificadas

- [ ] No es posible crear dos clientes con la misma `identificacionEmpresa` en la misma empresa (el API retorna 409).
- [ ] Un cliente de la empresa A no es accesible desde la empresa B (retorna 404).
- [ ] Un cliente inactivo puede verse en edición (modo historial) pero el badge indica "Inactivo".
- [ ] El campo `empresaId` nunca aparece en ningún formulario — siempre viene del JWT.

---

## Arquitectura hexagonal

- [ ] Ningún archivo en `domain/` o `application/` del módulo `clientes` importa `express` ni `@prisma/client`.
- [ ] `GestionarClienteUseCase` recibe el repositorio por constructor (inyección de dependencias).
- [ ] El controlador no contiene lógica de negocio (solo parsea request y delega al caso de uso).
- [ ] `validarEmail()` y `puedeSeleccionarse()` están definidos en `domain/cliente.entity.ts`.

---

## Definición de "done" para el sprint

El sprint 002 se considera completo cuando:

1. Todos los ítems de este checklist están marcados ✅.
2. `agente-qa` aprobó con:
   - Todos los tests del backend y frontend pasan en verde.
   - `pnpm lint` sin errores en `apps/api` y `apps/web`.
3. Arquitectura hexagonal verificada: `domain/` y `application/` sin imports de Express ni Prisma.
4. La historia de usuario se ejecuta de punta a punta en el entorno local: crear un cliente nuevo con los 7 campos, editarlo, verificar el badge de estado — sin errores en consola ni en la red.

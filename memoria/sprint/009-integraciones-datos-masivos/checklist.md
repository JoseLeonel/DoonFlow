# Checklist de aceptación — 009-integraciones-datos-masivos

> Un ítem no se marca ✅ hasta que el comportamiento es verificable en el navegador, con `curl`/Postman o en un test. "Está escrito" no es suficiente.

---

## Base de datos

- [x] La migración `add_importacion_lote` aplica sin errores (verificado vía `psql` + registro manual en `_prisma_migrations`, ver nota de convención en `impl.md`).
- [ ] **Pospuesto**: tabla `api_key` — HU-3 no implementada esta sesión.
- [x] La tabla `importacion_lote` existe con las columnas: `id`, `tipo`, `archivo_nombre`, `total_filas`, `filas_exitosas`, `filas_con_error`, `detalle_errores`, `creado_por_id`, `creado_en`, `empresa_id`.
- [x] El enum `TipoImportacion` acepta únicamente `CLIENTE` y `SUCURSAL`.
- [~] El índice `(empresa_id, tipo, creado_en)` en `importacion_lote` existe. **Pospuesto**: índice `(empresa_id, activa)` en `api_key`.
- [x] N/A esta sesión — no existe `clave_hash` (tabla `api_key` no creada).

---

## API — Gestión de API keys (`/integraciones/api-keys`, JWT)

> **⏸️ Sección completa pospuesta** — HU-3 no implementada esta sesión (ver nota en `task.md`).

- [ ] `POST /integraciones/api-keys` con `{ nombre }` crea la key y retorna `{ data: { id, nombre, clave, activa, creadoEn } }` — el campo `clave` contiene el texto plano.
- [ ] Repetir `GET /integraciones/api-keys` después de crear una key **nunca** incluye el texto plano ni `claveHash` — solo `id`, `nombre`, `activa`, `ultimoUsoEn`, `creadoEn`.
- [ ] `GET /integraciones/api-keys` retorna solo las keys de la empresa del JWT (aislamiento multiempresa).
- [ ] `POST /integraciones/api-keys/:id/revocar` pone `activa = false`; una key revocada no puede volver a activarse desde este endpoint (no existe "reactivar" — regla de negocio 3 del spec: se genera una nueva).
- [ ] `POST /integraciones/api-keys/:id/revocar` sobre una key de otra empresa retorna 404.
- [ ] `POST /integraciones/api-keys` sin `nombre` retorna 400.
- [x] Todas las rutas de `/integraciones` (las que sí existen: importación) retornan 401 sin token JWT — verificado con `autenticar` montado igual que en `clientes`.

---

## API — Importación de clientes (`/integraciones/importaciones/clientes`, JWT)

- [x] `GET /integraciones/importaciones/plantilla?tipo=CLIENTE` descarga un `.xlsx` con los encabezados exactos definidos en `impl.md` — verificado por curl (magic bytes `PK`) contra `apps/api` puerto 4000 y a través del proxy Next.js.
- [x] `POST /integraciones/importaciones/clientes/previsualizar` con un archivo válido retorna `{ data: { totalFilas, filasValidas: [...], filasConError: [...] } }` **sin** crear ningún `Cliente` en la base de datos.
- [x] `POST /integraciones/importaciones/clientes` con filas válidas e inválidas crea solo las válidas y retorna un `ImportacionLote` con los conteos correctos.
- [x] Una fila con `identificacionEmpresa` ya existente en la empresa se reporta como error de fila y no sobrescribe el cliente existente.
- [x] El archivo subido queda registrado en `ImportacionLote` con `archivoNombre`, `totalFilas`, `filasExitosas`, `filasConError` y `detalleErrores`.
- [x] `GET /integraciones/importaciones?tipo=CLIENTE` retorna el historial de lotes de importación de clientes.
- [x] `GET /integraciones/importaciones/:id/errores` descarga el detalle de las filas fallidas.

---

## API — Importación de sucursales (`/integraciones/importaciones/sucursales`, JWT)

- [x] `GET /integraciones/importaciones/plantilla?tipo=SUCURSAL` descarga la plantilla de sucursales con la columna de identificación del cliente.
- [x] `POST /integraciones/importaciones/sucursales` con una fila cuya `identificacionCliente` no corresponde a ningún cliente existente reporta esa fila como error, sin detener el resto del archivo.
- [x] `POST /integraciones/importaciones/sucursales` con una fila válida asocia la sucursal al `clienteId` resuelto por identificación, respetando el `empresaId` del JWT.
- [x] La importación de sucursales reutiliza las mismas reglas de validación que `POST /sucursales` (003) — no duplica lógica de validación de `correo`/`movil`.

---

## API pública de verificación (`/api/v1/certificaciones/verificar/:codigo`, API key)

> **⏸️ Sección completa pospuesta** — HU-3 no implementada esta sesión; depende del portal `/verificar/[codigo]` de 006 (nunca implementado) y de campos de 005 (pausado).

- [ ] Una solicitud sin header `X-Api-Key` retorna `401` con `codigo: "api_key_invalida"`.
- [ ] Una solicitud con una API key inexistente retorna `401` con `codigo: "api_key_invalida"`.
- [ ] Una solicitud con una API key revocada (`activa = false`) retorna `401` inmediatamente (regla de negocio 5 del spec).
- [ ] Una solicitud con una API key válida y un `codigoVerificacion` existente de la **misma** empresa retorna `200` con el mismo subconjunto de campos que expone el portal humano `/verificar/[codigo]` de 006: `estado`, `cliente.empresa`, `sucursal.nombre`, `fechaEmision`, `fechaVencimiento`, `plantilla.nombre`.
- [ ] La respuesta **nunca** incluye `InspeccionDetalle`, `Hallazgo` ni URLs de evidencias (regla de negocio 4 del spec).
- [ ] Un `codigoVerificacion` válido pero perteneciente a **otra** empresa (distinta de la dueña de la API key) retorna el mismo resultado que "no encontrado" — nunca expone datos cruzados entre tenants.
- [ ] Un `codigoVerificacion` inexistente retorna el estado "no encontrada" (mismo comportamiento que el portal humano), no un error 500.
- [ ] `ultimoUsoEn` de la API key se actualiza tras una solicitud exitosa.
- [ ] Superar el límite de tasa configurado (60 req/min por key, por defecto) retorna `429` con `codigo: "limite_tasa_excedido"`.
- [ ] El límite de tasa se cuenta por API key, no por IP (dos IPs distintas usando la misma key comparten el límite).

---

## Frontend — Pantalla de importación (Mantenimientos → Clientes / Sucursales)

- [x] El botón "Importar desde Excel" está visible junto a "+ Agregar cliente" en `/mantenimientos/clientes` (grep confirmó 1 match en la página real, 0 errores de servidor).
- [x] El botón "Importar desde Excel" está visible en la sección "Sucursales" (`seccion-sucursales.tsx` dentro de `mantenimientos/clientes`, no en una ruta `[id]/editar` separada — esa ruta no existe en 003; ver desviación en `impl.md`).
- [x] Al abrir el modal, el botón "Descargar plantilla" dispara la descarga del `.xlsx` correspondiente al tipo (`CLIENTE` o `SUCURSAL`).
- [x] Seleccionar un archivo y previsualizar muestra el resumen "N exitosas / N con error" antes de confirmar nada.
- [x] El botón "Confirmar importación" está deshabilitado si no hay ninguna fila válida.
- [x] Confirmar la importación ejecuta la carga real y muestra el resumen final (N exitosas, N con error).
- [x] Si hay filas con error, aparece el botón "Descargar detalle de errores"; si no hay ninguna, el botón no se muestra.
- [x] Tras una importación exitosa, la tabla de clientes/sucursales se actualiza (`cerrarModalImportar()` llama `recargar()` del hook `usarClientes`/`usarSucursales`) sin recargar la página completa.
- [x] El modal se puede cerrar/cancelar en cualquier paso sin dejar cambios a medias — cubierto por tests y por diseño (componente controlado sin estado propio).

> Nota honesta: verificado por tests (Vitest/RTL) + curl E2E contra el backend real; **no** se hicieron clics reales en un navegador (mismo límite que sprints 007/008/010).

---

## Frontend — Gestión de API keys (`/configuracion/integraciones`)

> **⏸️ Sección completa pospuesta** — HU-3 no implementada esta sesión.

- [ ] El breadcrumb muestra `Configuración > Integraciones`.
- [ ] El ítem "Integraciones" aparece en el sidebar dentro de la sección `CONFIGURACIÓN`, como hermano de "Mantenimientos".
- [ ] La tabla lista columnas: Nombre, Estado, Último uso, Acciones.
- [ ] La columna "Último uso" muestra `—` cuando `ultimoUsoEn` es null.
- [ ] Badge de estado: "Activa" (verde) / "Revocada" (gris), mismos tokens que el badge Activo/Inactivo de `Cliente`.
- [ ] El botón "Revocar" solo aparece en keys activas.
- [ ] El botón "Revocar" pide confirmación (`DialogoConfirmacion` de `packages/ui`) antes de ejecutar.
- [ ] El botón "Generar nueva clave" abre un modal que pide `nombre` y, al guardar, muestra la clave en texto plano con un botón "Copiar" y un mensaje de advertencia visible: la clave no se volverá a mostrar.
- [ ] Cerrar el modal después de ver la clave y reabrirlo (nueva generación) no muestra la clave anterior en ningún estado.
- [ ] Sin keys registradas, se muestra un estado vacío con CTA para generar la primera.

---

## Middleware de autenticación por API key

> **⏸️ Sección completa pospuesta** — HU-3 no implementada esta sesión.

- [ ] `autenticacion-api-key.middleware.ts` existe en `apps/api/src/middleware/`, separado de `autenticacion.middleware.ts` (JWT) — no comparten lógica de verificación.
- [ ] El middleware solo se aplica a las rutas bajo `/api/v1`, nunca a `/integraciones` ni al resto de la API (que siguen usando JWT).
- [ ] `req.empresaIdApiKey` está disponible en el handler del endpoint público tras pasar el middleware.
- [ ] El middleware responde `401` antes de tocar cualquier lógica de negocio si la key es inválida o revocada.

---

## Rate limiting

> **⏸️ Sección completa pospuesta** — HU-3 no implementada esta sesión; `express-rate-limit` no se instaló.

- [ ] `limitador-tasa.middleware.ts` existe en `apps/api/src/middleware/` y se aplica únicamente a `/api/v1`, después del middleware de API key.
- [ ] El límite por defecto (60 req/min por key) es configurable vía variable de entorno `RATE_LIMIT_API_PUBLICA_POR_MINUTO`.
- [ ] Las rutas internas (`/integraciones`, `/clientes`, `/inspeccion`, etc., autenticadas por JWT) no tienen este limitador aplicado.

---

## Reglas de negocio verificadas

- [x] Una fila con error en cualquier importación no bloquea las demás filas válidas del mismo archivo (regla 1 del spec).
- [x] Una identificación duplicada durante la importación se reporta como error de fila, nunca sobrescribe el registro existente (regla 2 del spec).
- [ ] **Pospuesto** (regla 3 del spec — clave de `ApiKey` no recuperable): sin `ApiKey`, no aplica.
- [ ] **Pospuesto** (regla 4 del spec — subconjunto de campos de la API pública): sin API pública, no aplica.
- [ ] **Pospuesto** (regla 5 del spec — validación contra `ApiKey` activa): sin `ApiKey`, no aplica.
- [ ] **Pospuesto** (regla 6 del spec — rate limiting): sin API pública, no aplica.
- [x] El `empresaId` nunca aparece en ningún formulario de importación — siempre viene del JWT (mismo principio que 002/003).

---

## Tests de unidad — Backend (`agente-qa`)

**`importacion-lote.entity.test.ts` (3 tests):**
- [x] `construirResumenLote()` calcula totales correctos con filas mixtas
- [x] `construirResumenLote([])` → `totalFilas: 0`
- [ ] **Pospuesto**: `api-key.entity.test.ts` (`generarClave`/`hashClave`/`verificarClave`/`estaActiva`).

**`gestionar-api-key.usecase.test.ts` + `verificar-certificacion-publica.usecase.test.ts`:**
> **⏸️ Pospuesto en su totalidad** — sin los casos de uso, no hay nada que testear.
- [ ] `crear()` persiste el hash, no el texto plano
- [ ] `listar()` nunca expone `claveHash`
- [ ] `revocar()` lanza `ApiKeyNoEncontradaError` si no existe
- [ ] `verificarPorClave()` retorna `null` sin coincidencia
- [ ] `verificarPorClave()` llama `registrarUso()` en éxito
- [ ] Verificación pública nunca cruza `empresaId` entre tenants

**`importar-clientes.usecase.test.ts` (4 tests) + `importar-sucursales.usecase.test.ts` (3 tests):**
- [x] Filas válidas se guardan; filas inválidas se reportan sin detener el batch
- [x] Identificación duplicada se reporta como error de fila
- [x] Sucursal con `identificacionCliente` inexistente se reporta sin lanzar excepción no controlada
- [x] `previsualizar()` no persiste nada (verificado en ambos casos de uso)

**Test de integración:**
- [ ] **Pospuesto**: `GET /api/v1/certificaciones/verificar/:codigo` con key revocada → `401` `api_key_invalida`; exceder límite de tasa → `429` `limite_tasa_excedido`.

---

## Tests de unidad — Frontend (`agente-qa`)

**`tabla-api-keys.test.tsx` + `modal-nueva-api-key.test.tsx`:**
> **⏸️ Pospuesto en su totalidad** — sin componentes, no hay nada que testear.
- [ ] Renderiza Nombre, badge de Estado, "Último uso" (`—` si null)
- [ ] "Revocar" solo visible en keys activas
- [ ] El modal muestra la clave en texto plano solo inmediatamente tras crearla
- [ ] Guardar sin `nombre` no llama `onCrear`

**`modal-importar-excel.test.tsx` (5 tests) + `usar-importacion-excel.test.ts` (4 tests):**
- [x] "Descargar plantilla" llama `onDescargarPlantilla`
- [x] Tras previsualizar, muestra conteo de filas válidas/con error
- [x] "Confirmar importación" deshabilitado sin filas válidas
- [x] "Descargar detalle de errores" solo visible si `filasConError > 0`
- [x] El hook transiciona correctamente por los estados del flujo feliz
- [x] `reiniciar()` limpia el estado y el archivo seleccionado

---

## Arquitectura hexagonal

- [x] Ningún archivo en `domain/` o `application/` del módulo `integraciones` importa `express`, `@prisma/client`, `multer` ni `xlsx`.
- [x] `parsearArchivoClientes`/`parsearArchivoSucursales` (que sí usan `xlsx`) viven únicamente en `infrastructure/plantilla-excel.ts`.
- [x] `ImportarClientesUseCase` e `ImportarSucursalesUseCase` reciben `GestionarClienteUseCase`/`GestionarSucursalUseCase` por constructor — no instancian esos casos de uso ni sus repositorios directamente.
- [~] `integraciones.controller.ts` no contiene lógica de negocio — solo parsea request/multipart, llama al caso de uso y formatea la respuesta. **Pospuesto**: `certificacion-publica.controller.ts` (no existe, HU-3 pospuesta).
- [ ] **Pospuesto**: `autenticacion-api-key.middleware.ts` y `limitador-tasa.middleware.ts` — HU-3 no implementada esta sesión.

---

## Definición de "done" para el sprint

El sprint 009 se considera completo, **con HU-3 pospuesta por decisión explícita del usuario**, cuando:

1. Los ítems de este checklist correspondientes a HU-1/HU-2 están marcados ✅; los de HU-3 quedan `[ ]` con nota de pospuesto.
2. Todos los tests de backend (167) y frontend (174, mismas 6 fallas preexistentes) pasan en verde. `pnpm lint` **no** se ejecutó esta sesión (mismo gap honesto que sprints 007/008/010).
3. Arquitectura hexagonal verificada para lo implementado: `domain/` y `application/` del módulo `integraciones` sin imports de Express, Prisma, `multer` ni `xlsx`.
4. De las tres historias de usuario, se ejecutaron de punta a punta en el entorno local (curl contra `apps/api` y a través del proxy Next.js):
   - [x] Importar un archivo Excel con clientes mixtos (válidos + inválidos) y verificar el reporte de errores sin perder las filas válidas.
   - [x] Importar sucursales asociadas a un cliente existente por identificación.
   - [ ] **Pospuesto**: generar una API key, consultar `GET /api/v1/certificaciones/verificar/:codigo`, revocarla y verificar 401 — HU-3 no implementada.
5. `memoria/cambios_db/registro.md` tiene la entrada de este sprint.

# Tareas — 009-integraciones-datos-masivos

> Orden de ejecución: Base de datos → API → Frontend → Tests.
> Numeración desde T-390 (continúa después de sprints 001-008 ya implementados). Rango asignado: T-390 a T-419.
> Precondición: los módulos `clientes` (002) y `sucursales` (003) ya existen y están montados en `apps/api/src/index.ts`; el portal público `/verificar/[codigo]` (006) ya expone `Inspeccion.codigoVerificacion`/`estado`/`fechaVencimiento`. Este sprint reutiliza esos módulos, no los reescribe.
> **⏸️ Precondición incumplida, detectada 2026-07-21**: el portal `/verificar/[codigo]` de 006 nunca se implementó (sin código) y `Inspeccion.codigoVerificacion`/`fechaVencimiento` no existen (son de 005, pausado). Por decisión del usuario, **HU-3 completa (API keys + verificación pública) queda pospuesta** — tareas T-390 (parcial), T-391 (parcial), T-393 (parcial), T-394 (parcial), T-395 (parcial), T-397 (parcial), T-398, T-400, T-401 (parcial), T-403 (parcial), T-404, T-405, T-406 (parcial), T-407 (parcial), T-408 (parcial), T-409 (parcial), T-410, T-411, T-414, T-415 (parcial), T-416, T-417 (parcial), T-418 marcadas `[ ]`/`[~]` abajo con la razón puntual. Se implementaron completas **HU-1 y HU-2** (importación masiva de Cliente/Sucursal). Ver `memoria/decisiones.md` y `impl.md`.

---

## Agente: `agente-basededatos`

- [~] **T-390 (parcial)** Crear migración `add_integraciones_datos_masivos` en `packages/db/prisma/`:
  - [x] Enum `TipoImportacion { CLIENTE SUCURSAL }`.
  - [ ] **Pospuesto**: tabla `api_key` — HU-3 no implementada esta sesión.
  - [x] Tabla `importacion_lote`: `id UUID PK`, `tipo TipoImportacion NOT NULL`, `archivo_nombre VARCHAR(255) NOT NULL`, `total_filas INT NOT NULL`, `filas_exitosas INT NOT NULL`, `filas_con_error INT NOT NULL`, `detalle_errores JSONB NULL`, `creado_por_id UUID FK → usuario(id)`, `creado_en TIMESTAMPTZ NOT NULL DEFAULT now()`, `empresa_id UUID FK → empresa(id)`.
  - [x] Agregar model `ImportacionLote` al schema Prisma (camelCase + `@map`), y la relación inversa `importacionesCreadas ImportacionLote[]` en `Usuario`. `apiKeys ApiKey[]` no se agregó (sin modelo `ApiKey` todavía).
- [~] **T-391 (parcial)** Índice `(empresa_id, tipo, creado_en)` en `importacion_lote` — creado. Índice `(empresa_id, activa)` en `api_key` — pospuesto junto con la tabla.
- [x] **T-392** Registrar la entrada correspondiente en `memoria/cambios_db/registro.md` (tipo: tabla nueva x2 + enum, módulo: integraciones, detalle de los campos, estado de la migración).

---

## Agente: `agente-backend`

- [~] **T-393 (parcial)** Crear entidades de dominio en `apps/api/src/modules/integraciones/domain/`:
  - [ ] **Pospuesto**: `api-key.entity.ts` (`generarClave`/`hashClave`/`verificarClave`/`estaActiva`) — HU-3 no implementada esta sesión.
  - [x] `importacion-lote.entity.ts`: tipo `ImportacionLote`; `construirResumenLote(tipo, archivoNombre, resultados: ResultadoFila[]): DatosImportacionLote` — calcula `totalFilas`/`filasExitosas`/`filasConError`/`detalleErrores` a partir del arreglo de resultados fila por fila.
- [~] **T-394 (parcial)** Crear `apps/api/src/modules/integraciones/domain/integraciones.errors.ts`:
  - [ ] **Pospuesto**: `ApiKeyNoEncontradaError`, `ApiKeyRevocadaError`.
  - [x] `ClienteNoEncontradoParaImportacionError` (fila de sucursal que referencia un cliente inexistente), `ArchivoImportacionInvalidoError` (archivo vacío, sin la hoja/columnas esperadas, o formato no soportado). Se agregó además `ImportacionLoteNoEncontradoError`, no prevista originalmente.
- [~] **T-395 (parcial)** Crear puertos del dominio:
  - [ ] **Pospuesto**: `api-key.repository.port.ts` — HU-3 no implementada esta sesión.
  - [x] `importacion-lote.repository.port.ts` (`crear`, `listar(empresaId, tipo?)`, `obtenerPorId(id, empresaId)`).
- [x] **T-396** Extender el módulo `clientes` (002, ya implementado) sin reescribirlo: agregar `buscarPorIdentificacion(identificacion: string, empresaId: string): Promise<Cliente | null>` a `ClienteRepositoryPort` (`apps/api/src/modules/clientes/domain/cliente.repository.port.ts`) y su implementación en `cliente.prisma-repository.ts`. Es el único cambio permitido sobre el módulo `clientes` en este sprint.
- [~] **T-397 (parcial)** Crear `apps/api/src/modules/integraciones/application/integraciones.schema.ts`:
  - [ ] **Pospuesto**: `crearApiKeySchema` — HU-3 no implementada esta sesión.
  - [x] `filaImportacionClienteSchema`: reutiliza directamente `crearClienteSchema` de `clientes` (no se redefinió aparte).
  - [x] `filaImportacionSucursalSchema`: columnas de la plantilla de sucursales, incluida `identificacionCliente` (string requerido, para resolver `clienteId`).
- [ ] **T-398 — Pospuesto** Caso de uso `gestionar-api-key.usecase.ts` (crear/listar/revocar/verificarPorClave keys) — HU-3 completa no implementada esta sesión; sin tabla `api_key` ni entidad `ApiKey`, no hay nada que orquestar.
- [x] **T-399** Crear casos de uso de importación (reutilizan los módulos `clientes`/`sucursales` ya implementados, no duplican sus reglas de negocio):
  - `apps/api/src/modules/integraciones/application/casos-uso/importar-clientes.usecase.ts`: recibe filas ya parseadas del Excel, por cada una invoca `GestionarClienteUseCase.crear()` (del módulo `clientes`, inyectado por constructor); si lanza `EmailInvalidoError` o `IdentificacionDuplicadaError`, captura el error y lo agrega como fila fallida **sin detener el resto del archivo**; arma el `ImportacionLote` con `construirResumenLote()`.
  - `apps/api/src/modules/integraciones/application/casos-uso/importar-sucursales.usecase.ts`: mismo patrón, resuelve `clienteId` con `ClienteRepositoryPort.buscarPorIdentificacion()` (T-396) antes de invocar `GestionarSucursalUseCase.crear()` (del módulo `sucursales`, 003, inyectado por constructor); si no encuentra el cliente, agrega `ClienteNoEncontradoParaImportacionError` como fila fallida.
  - Ambos casos de uso exponen también un modo `previsualizar()` que ejecuta las mismas validaciones **sin llamar a `crear()`** (dry-run) para la pantalla de previsualización.
- [ ] **T-400 — Pospuesto** Caso de uso `verificar-certificacion-publica.usecase.ts` — depende del portal `/verificar/[codigo]` de 006 (nunca implementado) y de `Inspeccion.codigoVerificacion`/`fechaVencimiento` (de 005, pausado). Sin esos campos no hay qué consultar.
- [~] **T-401 (parcial)** Crear repositorios Prisma:
  - [ ] **Pospuesto**: `api-key.prisma-repository.ts` — HU-3 no implementada esta sesión.
  - [x] `infrastructure/importacion-lote.prisma-repository.ts`, implementando el puerto de T-395. Filtra siempre por `empresaId`.
- [x] **T-402** Crear `apps/api/src/modules/integraciones/infrastructure/plantilla-excel.ts` (usa la librería `xlsx`, nueva dependencia — ver T-406):
  - `generarPlantillaClientes(): Buffer` / `generarPlantillaSucursales(): Buffer` — generan el `.xlsx` descargable con encabezados exactos (ver `impl.md` → Formato de plantillas).
  - `parsearArchivoClientes(buffer: Buffer): FilaClienteCruda[]` / `parsearArchivoSucursales(buffer: Buffer): FilaSucursalCruda[]` — leen la primera hoja, ignoran la fila de encabezado, devuelven filas crudas con su número de fila Excel original (para el reporte de errores).
- [~] **T-403 (parcial)** Crear `apps/api/src/modules/integraciones/infrastructure/integraciones.controller.ts` e `infrastructure/integraciones.router.ts` — endpoints internos autenticados por JWT, montados bajo `/integraciones`: `descargarPlantilla`, `previsualizarClientes`, `importarClientes`, `previsualizarSucursales`, `importarSucursales`, `listarHistorial`, `descargarErrores`. **Pospuesto**: endpoints CRUD de API keys (HU-3 no implementada esta sesión).
- [ ] **T-404 — Pospuesto** `certificacion-publica.controller.ts`/`.router.ts` (endpoint público `GET /certificaciones/verificar/:codigo`) — depende de T-400, pospuesto por la misma razón.
- [ ] **T-405 — Pospuesto** Middlewares `autenticacion-api-key.middleware.ts` y `limitador-tasa.middleware.ts` — sin `ApiKey` ni endpoint público que proteger, no había nada que autenticar/limitar esta sesión. `express-rate-limit` no se instaló.
- [~] **T-406 (parcial)** Montar en `apps/api/src/index.ts` y crear los Route Handlers proxy de Next.js:
  - [x] `import { crearModuloIntegraciones } from "./modules/integraciones";`, `app.use("/integraciones", moduloIntegraciones.router)` (con `autenticar`, igual patrón que `clientes`).
  - [ ] **Pospuesto**: `app.use("/api/v1", moduloIntegraciones.routerPublico)` — no existe `routerPublico` (T-404/T-405 pospuestos).
  - [x] Configurar `multer` (nueva dependencia) en memoria (`multer.memoryStorage()`) para los endpoints de subida de archivo.
  - [x] Agregar `multer`, `xlsx` (+ `@types/multer` en dev) a `apps/api/package.json`. **Pospuesto**: `express-rate-limit`.
  - [x] Crear Route Handler proxy `apps/web/src/app/api/integraciones/[...path]/route.ts` (catch-all, con passthrough binario para descargas). El endpoint público `/api/v1` no aplica (pospuesto).

---

## Agente: `agente-frontend`

- [~] **T-407 (parcial)** Agregar tipos en `packages/shared/src/types/integraciones.ts`:
  - [ ] **Pospuesto**: `ApiKey`, `ApiKeyCreada`.
  - [x] `TipoImportacion`, `ImportacionLote`, `FilaImportacionResultado`, `ResultadoPrevisualizacion`. Re-exportados desde `packages/shared/src/index.ts`.
- [~] **T-408 (parcial)** Crear servicios:
  - [ ] **Pospuesto**: `configuracion/integraciones/_servicios/api-key.servicio.ts`.
  - [x] `apps/web/src/app/(dashboard)/_servicios-compartidos/importacion.servicio.ts` (`descargarPlantilla`, `previsualizarImportacion`, `confirmarImportacion`, `listarHistorialImportaciones`, `descargarErroresLote`).
- [~] **T-409 (parcial)** Crear hooks:
  - [ ] **Pospuesto**: `.../usar-api-keys.ts`.
  - [x] `apps/web/src/app/(dashboard)/_hooks-compartidos/usar-importacion-excel.ts` (máquina de estados `INACTIVO → ARCHIVO_SELECCIONADO → PREVISUALIZANDO → PREVISUALIZADO → CONFIRMANDO → COMPLETADO`, con `seleccionarArchivo`, `previsualizar`, `confirmar`, `reiniciar`, `resumen`, `puedeConfirmar`).
- [ ] **T-410 — Pospuesto** `_components/tabla-api-keys.tsx` y `_components/modal-nueva-api-key.tsx` — HU-3 no implementada esta sesión.
- [ ] **T-411 — Pospuesto** Página `configuracion/integraciones/page.tsx` — sin componentes de API key (T-410) que renderizar.
- [x] **T-412** Crear componente genérico `_components-compartidos/modal-importar-excel.tsx` (recibe `tipo`, `onDescargarPlantilla`, `onPrevisualizar`, `onConfirmar` por props — sin llamar servicios directamente): paso 1 descargar plantilla / subir archivo, paso 2 previsualización con conteo de filas válidas/con error, paso 3 resultado final con resumen y botón "Descargar detalle de errores" (visible solo si `filasConError > 0`).
- [x] **T-413** Integrar el botón "Importar desde Excel" en la pantalla de lista de clientes (`apps/web/src/app/(dashboard)/mantenimientos/clientes/page.tsx`, junto al botón "+ Agregar cliente") y en la pantalla de sucursales del cliente (dentro de `mantenimientos/clientes/[id]/editar/page.tsx`, sección "Sucursales" de 003), ambos usando `ModalImportarExcel` de T-412.
- [ ] **T-414 — Pospuesto** Ítem "Integraciones" en `sidebar.tsx` — no hay página `/configuracion/integraciones` (T-411 pospuesto) a la cual apuntar.

---

## Agente: `agente-qa` — Tests de unidad Backend

- [~] **T-415 (parcial)** `importacion-lote.entity.test.ts` (dominio puro, sin mocks, 3 tests):
  - [x] `construirResumenLote()` con filas exitosas y con error → `totalFilas`/`filasExitosas`/`filasConError`/`detalleErrores` correctos.
  - [x] `construirResumenLote()` con arreglo vacío → `totalFilas: 0` sin lanzar error.
  - [ ] **Pospuesto**: `api-key.entity.test.ts` (`generarClave`/`hashClave`/`verificarClave`/`estaActiva`) — HU-3 no implementada esta sesión.

- [ ] **T-416 — Pospuesto** `gestionar-api-key.usecase.test.ts` + `verificar-certificacion-publica.usecase.test.ts` — sin los casos de uso (T-398/T-400 pospuestos), no hay nada que testear.

- [~] **T-417 (parcial)** `importar-clientes.usecase.test.ts` (4 tests) + `importar-sucursales.usecase.test.ts` (3 tests) (mock de `GestionarClienteUseCase`/`GestionarSucursalUseCase`/`ClienteRepositoryPort`):
  - [x] Un archivo con 2 filas válidas y 1 con `correo1` inválido → `filasExitosas: 2`, `filasConError: 1`.
  - [x] Una fila con `identificacionEmpresa` duplicada → se reporta como error de fila, no interrumpe las siguientes.
  - [x] Importación de sucursales con `identificacionCliente` que no existe → fila reportada con `ClienteNoEncontradoParaImportacionError`, no lanza excepción no controlada.
  - [x] `previsualizar()` no invoca `crear()` de los casos de uso subyacentes (dry-run real) — verificado en ambos casos de uso.
  - [ ] **Pospuesto**: test de integración de `GET /api/v1/certificaciones/verificar/:codigo` (401/429) — endpoint público no implementado (T-404/T-405 pospuestos).

---

## Agente: `agente-qa` — Tests de unidad Frontend

- [ ] **T-418 — Pospuesto** `tabla-api-keys.test.tsx` + `modal-nueva-api-key.test.tsx` — sin componentes (T-410 pospuesto), no hay nada que testear.

- [x] **T-419** `modal-importar-excel.test.tsx` + `usar-importacion-excel.test.ts` (hook):
  - El botón "Descargar plantilla" llama `onDescargarPlantilla` con el `tipo` correcto.
  - Tras `onPrevisualizar`, se muestra el conteo de filas válidas/con error.
  - El botón "Confirmar importación" está deshabilitado si `filasValidas.length === 0`.
  - El botón "Descargar detalle de errores" solo aparece si `filasConError > 0`.
  - El hook transiciona `INACTIVO → ARCHIVO_SELECCIONADO → PREVISUALIZANDO → PREVISUALIZADO` en el flujo feliz.
  - `reiniciar()` vuelve el estado a `INACTIVO` y limpia el archivo seleccionado.

---

## Dependencias entre tareas

```
T-390 → T-391 → T-392
T-390 → T-393, T-394, T-395, T-396
T-395 → T-397 → T-398
T-396, T-397 → T-399
T-397 → T-400
T-395 → T-401
T-398 → T-401 (el repositorio implementa el puerto que consume el caso de uso)
T-399, T-400 → T-402, T-403, T-404
T-398 → T-405
T-405 → T-406
T-401, T-402, T-403, T-404, T-405 → T-406
T-406 → T-407 → T-408, T-409
T-408 → T-409
T-409 → T-410, T-412
T-410 → T-411
T-412 → T-413
T-411, T-413 → T-414
T-393, T-394 → T-415
T-398, T-400 → T-416
T-399, T-406 → T-417
T-410 → T-418
T-412, T-409 → T-419
```

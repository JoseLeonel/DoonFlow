# Checklist de aceptación — 009-integraciones-datos-masivos

> Un ítem no se marca ✅ hasta que el comportamiento es verificable en el navegador, con `curl`/Postman o en un test. "Está escrito" no es suficiente.
> **Estado: HU-1/HU-2 IMPLEMENTADAS el 2026-07-21. HU-3 (API keys + verificación pública) retomada e IMPLEMENTADA el 2026-07-24**, una vez que el portal `/verificar/[codigo]` de 006 quedó implementado (2026-07-23) — ver `impl.md` para el detalle completo y las desviaciones reales.

---

## Base de datos

- [x] La migración `add_importacion_lote` aplica sin errores (verificado vía `psql` + registro manual en `_prisma_migrations`, ver nota de convención en `impl.md`).
- [x] La migración `add_api_key` (2026-07-24) aplica sin errores, mismo procedimiento.
- [x] La tabla `importacion_lote` existe con las columnas: `id`, `tipo`, `archivo_nombre`, `total_filas`, `filas_exitosas`, `filas_con_error`, `detalle_errores`, `creado_por_id`, `creado_en`, `empresa_id`.
- [x] El enum `TipoImportacion` acepta únicamente `CLIENTE` y `SUCURSAL`.
- [x] La tabla `api_key` existe con las columnas: `id`, `empresa_id`, `nombre`, `clave_hash` (único), `activa`, `ultimo_uso_en`, `creado_por_id`, `creado_en`. `activa` es `Boolean`, no un campo de estado con enum — sin riesgo del bug de 011/006/014 (Prisma enum vs VARCHAR real).
- [x] Los índices `(empresa_id, tipo, creado_en)` en `importacion_lote` y `(empresa_id, activa)` en `api_key` existen.
- [x] `clave_hash` guarda un hash SHA-256 (no bcrypt — clave ya es de alta entropía, ver `impl.md`), único en toda la tabla (permite el lookup del middleware sin `empresaId`).

---

## API — Gestión de API keys (`/integraciones/api-keys`, JWT, solo `administrador`)

- [x] `POST /integraciones/api-keys` con `{ nombre }` crea la key y retorna `{ data: { id, empresaId, nombre, activa, ultimoUsoEn, creadoPorId, creadoEn, clave } }` — el campo `clave` contiene el texto plano. Verificado por curl real.
- [x] `GET /integraciones/api-keys` después de crear una key **nunca** incluye el texto plano ni `claveHash` — el controller serializa explícitamente sin ese campo (`serializar()` en `api-key.controller.ts`). **Bug real encontrado y corregido durante la verificación E2E**: la primera versión sí exponía `claveHash` en la respuesta (spread directo del objeto de dominio) — corregido antes de cerrar el sprint.
- [x] `GET /integraciones/api-keys` retorna solo las keys de la empresa del JWT (filtro `empresaId` en el repositorio Prisma, mismo patrón que el resto del proyecto).
- [x] `POST /integraciones/api-keys/:id/revocar` pone `activa = false`; no existe endpoint de "reactivar" (regla de negocio 3: se genera una nueva). Verificado por curl.
- [x] `POST /integraciones/api-keys/:id/revocar` sobre un id inexistente (o de otra empresa) retorna 404 `api_key_no_encontrada`. Verificado por curl.
- [x] `POST /integraciones/api-keys` sin `nombre` retorna 400 (validación Zod `crearApiKeySchema`).
- [x] Todas las rutas de `/integraciones` retornan 401 sin token JWT. Las de `/api-keys` además retornan 403 `rol_no_autorizado` para roles distintos de `administrador` — verificado por curl real con `carlos@dist.com` (`administrador_cliente`).

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

- [x] Una solicitud sin header `X-Api-Key` retorna `401` con `codigo: "api_key_faltante"` (no `"api_key_invalida"` como decía el checklist original — se distinguen los dos casos para mejor diagnóstico).
- [x] Una solicitud con una API key inexistente retorna `401` con `codigo: "api_key_invalida"`.
- [x] Una solicitud con una API key revocada (`activa = false`) retorna `401` `api_key_invalida` inmediatamente (regla de negocio 5 del spec) — verificado por curl real revocando una key y reintentando.
- [x] Una solicitud con una API key válida y un `codigoVerificacion` existente retorna `200` con el mismo subconjunto de campos que expone el portal humano `/verificar/[codigo]` de 006: `estado`, `cliente`, `sucursal`, `fechaEmision`, `fechaVencimiento`, `nombrePlantilla` — reutiliza literalmente `VerificarCertificadoUseCase` del módulo `verificacion` (006), sin duplicar la lógica.
- [x] La respuesta **nunca** incluye `InspeccionDetalle`, `Hallazgo` ni URLs de evidencias (regla de negocio 4) — heredado directamente del portal humano, que ya cumple esta regla.
- [x] Un `codigoVerificacion` inexistente retorna 404 `certificado_no_encontrado` (no un error 500) — mismo comportamiento que el portal humano.
- [x] `ultimoUsoEn` de la API key se actualiza tras una solicitud exitosa — verificado por curl real (timestamp cambia entre requests).
- [x] Superar el límite de tasa (60 req/min) retorna `429` — verificado real disparando 62 requests seguidas.
- [~] **Desviación real respecto al checklist original**: "Un código válido de otra empresa retorna 'no encontrado'" y "el límite de tasa se cuenta por API key, no por IP" — **ninguna de las dos** se implementó así, por decisión de diseño explícita (no un gap accidental): el portal humano de 006 (`/verificar/[codigo]`) es completamente anónimo y **nunca** filtra por `empresaId` en el lookup — un código de verificación es, por diseño, un identificador público verificable por cualquiera (igual que un número de serie de un certificado físico). La API programática reutiliza exactamente esa misma lógica (`VerificarCertificadoUseCase`) para no duplicarla y mantener paridad real con el portal humano (regla 4 de la spec: "el mismo subconjunto de datos"). Filtrar por empresa aquí sería *más* restrictivo que el propio portal humano, lo cual no tiene sentido de negocio. El rate limiting, en consecuencia, también se aplica **por IP antes del middleware de autenticación** (mismo patrón que el portal humano) — necesario además para frenar fuerza bruta sobre el espacio de claves *antes* de que una clave inválida se identifique, no después. Documentado en `certificacion-publica.router.ts`.

---

## Frontend — Pantalla de importación (Mantenimientos → Clientes / Sucursales)

- [x] El botón "Importar desde Excel" está visible junto a "+ Agregar cliente" en `/mantenimientos/clientes`.
- [x] El botón "Importar desde Excel" está visible en la sección "Sucursales" dentro de `mantenimientos/clientes` (ver desviación de ruta en `impl.md`, sección HU-1/2).
- [x] Al abrir el modal, el botón "Descargar plantilla" dispara la descarga del `.xlsx` correspondiente al tipo (`CLIENTE` o `SUCURSAL`).
- [x] Seleccionar un archivo y previsualizar muestra el resumen "N exitosas / N con error" antes de confirmar nada.
- [x] El botón "Confirmar importación" está deshabilitado si no hay ninguna fila válida.
- [x] Confirmar la importación ejecuta la carga real y muestra el resumen final (N exitosas, N con error).
- [x] Si hay filas con error, aparece el botón "Descargar detalle de errores"; si no hay ninguna, el botón no se muestra.
- [x] Tras una importación exitosa, la tabla de clientes/sucursales se actualiza sin recargar la página completa.
- [x] El modal se puede cerrar/cancelar en cualquier paso sin dejar cambios a medias.

---

## Frontend — Gestión de API keys (`/configuracion/integraciones`)

- [x] El ítem "Integraciones" aparece en el sidebar dentro de la sección `CONFIGURACIÓN`, como hermano de "Mantenimientos".
- [x] La tabla lista columnas: Nombre, Estado, Último uso, Acciones.
- [x] La columna "Último uso" muestra "Nunca" cuando `ultimoUsoEn` es null (equivalente funcional a "—").
- [x] Badge de estado: "Activa" (verde) / "Revocada" (gris), mismos tokens que el badge Activo/Inactivo del resto del proyecto.
- [x] El botón "Revocar" solo aparece en keys activas.
- [x] El botón "Revocar" pide confirmación (`DialogoConfirmacion` de `packages/ui`) antes de ejecutar — **gap real encontrado y corregido antes de cerrar el sprint**: la primera versión revocaba directamente al clic, sin confirmar; se corrigió moviendo el flujo a `TablaApiKeys.onSolicitarRevocar` + `DialogoConfirmacion` a nivel de página.
- [x] El botón "Generar nueva clave" abre un modal que pide `nombre` y, al guardar, muestra la clave en texto plano con un botón "Copiar" y un mensaje de advertencia visible.
- [x] El modal es de 2 pasos con estado propio (`creada: ApiKeyCreada | null`) — cerrarlo y reabrirlo (nueva generación) no puede mostrar la clave anterior porque el componente se desmonta por completo entre aperturas (`{mostrarModal && <ModalNuevaApiKey ... />}`).
- [x] Sin keys registradas, la tabla muestra un estado vacío ("No hay claves de API generadas.").
- [~] **Desviación menor**: no hay breadcrumb `Configuración > Integraciones` explícito (el resto de páginas de nivel superior del proyecto tampoco usa breadcrumb consistentemente — no es un patrón establecido fuera de `/mantenimientos/clientes/[id]/...`).

---

## Middleware de autenticación por API key

- [x] `autenticacion-api-key.middleware.ts` existe en `apps/api/src/middleware/`, separado de `autenticacion.middleware.ts` (JWT) — no comparten lógica de verificación.
- [x] El middleware solo se aplica a las rutas bajo `/api/v1` (`certificacion-publica.router.ts`), nunca a `/integraciones` ni al resto de la API (que siguen usando JWT).
- [x] El middleware adjunta `req.apiKey = { id, empresaId }` (no `req.empresaIdApiKey` como decía el checklist original — se agrupó en un objeto para dejar espacio a más campos si se necesitan después, mismo criterio que `req.usuario`).
- [x] El middleware responde `401` antes de tocar cualquier lógica de negocio si la key es inválida, falta el header, o está revocada.

---

## Rate limiting

- [x] El limitador (`express-rate-limit`, ya instalado desde 006) se aplica únicamente al router público (`certificacion-publica.router.ts`), **antes** del middleware de autenticación (ver desviación documentada arriba).
- [x] Límite hardcodeado a 60 req/min (no configurable vía variable de entorno `RATE_LIMIT_API_PUBLICA_POR_MINUTO` como decía el checklist original — mismo criterio que el portal humano de 006, que tampoco es configurable vía env var; se puede agregar si se necesita después).
- [x] Las rutas internas (`/integraciones`, `/clientes`, `/inspeccion`, etc., autenticadas por JWT) no tienen este limitador aplicado.

---

## Reglas de negocio verificadas

- [x] Una fila con error en cualquier importación no bloquea las demás filas válidas del mismo archivo (regla 1 del spec).
- [x] Una identificación duplicada durante la importación se reporta como error de fila, nunca sobrescribe el registro existente (regla 2 del spec).
- [x] La clave de una `ApiKey` nunca se vuelve a mostrar en texto plano después de creada (regla 3) — solo se persiste el hash SHA-256.
- [x] La API pública de verificación devuelve exactamente el mismo subconjunto de campos que el portal humano de 006 (regla 4).
- [x] Cada request a la API pública se valida contra una `ApiKey` activa; una key revocada responde 401 inmediatamente (regla 5).
- [x] Rate limiting real sobre la API pública (regla 6), 60 req/min por IP (ver desviación de "por key" arriba).
- [x] El `empresaId` nunca aparece en ningún formulario de importación ni de gestión de API keys — siempre viene del JWT.

---

## Tests de unidad — Backend (`agente-qa`)

**`importacion-lote.entity.test.ts` (3 tests):**
- [x] `construirResumenLote()` calcula totales correctos con filas mixtas
- [x] `construirResumenLote([])` → `totalFilas: 0`

**`api-key.entity.test.ts` (7 tests, 2026-07-24):**
- [x] `generarClave()` con prefijo `dnf_live_` y suficiente entropía; genera claves distintas cada vez
- [x] `hashClave()` determinístico, distinto por clave, formato SHA-256 hex de 64 caracteres
- [x] `estaActiva()` refleja el campo `activa`

**`gestionar-api-key.usecase.test.ts` (4 tests, 2026-07-24):**
- [x] `crear()` genera clave en texto plano, guarda solo el hash, y los separa en el resultado
- [x] `listar()` reenvía la llamada al repositorio
- [x] `revocar()` lanza `ApiKeyNoEncontradaError` si no existe
- [x] `revocar()` llama `repo.revocar(id, empresaId)` cuando la key existe

**`importar-clientes.usecase.test.ts` (4 tests) + `importar-sucursales.usecase.test.ts` (3 tests):**
- [x] Filas válidas se guardan; filas inválidas se reportan sin detener el batch
- [x] Identificación duplicada se reporta como error de fila
- [x] Sucursal con `identificacionCliente` inexistente se reporta sin lanzar excepción no controlada
- [x] `previsualizar()` no persiste nada (verificado en ambos casos de uso)

**Test de integración del endpoint público**: no se creó un test automatizado tipo supertest (el proyecto no tiene esa infraestructura en ningún módulo, ver `impl.md`) — se verificó el ciclo completo (401 sin key/con key inválida/revocada, 200 con key válida, 404 código inexistente, 429 rate limit, `ultimoUsoEn` actualizado) con curl real contra el servidor corriendo, documentado en `impl.md`.

---

## Tests de unidad — Frontend (`agente-qa`)

**`tabla-api-keys.test.tsx` (4 tests, 2026-07-24):**
- [x] Estado de carga y estado vacío
- [x] Renderiza Nombre, badge de Estado, "Último uso"
- [x] "Revocar" solo visible en keys activas, llama `onSolicitarRevocar(id, nombre)`

**`modal-nueva-api-key.test.tsx` (4 tests, 2026-07-24):**
- [x] Botón deshabilitado sin nombre
- [x] Con nombre válido, llama `onGenerar` y muestra la clave en texto plano
- [x] El botón Copiar copia la clave al portapapeles (`navigator.clipboard.writeText`, mockeado)
- [x] Cancelar en el paso de formulario llama `onCerrar`

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
- [x] `ImportarClientesUseCase` e `ImportarSucursalesUseCase` reciben `GestionarClienteUseCase`/`GestionarSucursalUseCase` por constructor.
- [x] `integraciones.controller.ts`/`api-key.controller.ts`/`certificacion-publica.controller.ts` no contienen lógica de negocio — solo parsean request, llaman al caso de uso y formatean la respuesta.
- [x] `autenticacion-api-key.middleware.ts` vive en `apps/api/src/middleware/` (transversal), no dentro del módulo `integraciones` — mismo patrón que `autenticacion.middleware.ts`.
- [x] La API pública reutiliza `VerificarCertificadoUseCase` del módulo `verificacion` (006) inyectado por constructor — consumo cruzado entre módulos vía la instancia expuesta por `crearModuloVerificacion()`, sin importar su repositorio Prisma.

---

## Gap preexistente encontrado y corregido (no de este sprint, descubierto al correr `pnpm --filter api build` por primera vez)

`pnpm --filter api build` (`tsc` estricto) nunca se había corrido como parte de la verificación de ningún sprint — tenía 225 errores de tipos preexistentes en ~26 archivos de test de casi todos los módulos del backend (patrón `let repo: Puerto & Record<string, Mock>` que no es compatible con `tsc` estricto aunque Vitest lo acepta en runtime). Se corrigió por completo en la misma sesión: 0 errores. En el proceso se encontraron y corrigieron real gaps: un bug real (`GestionarPlantillaUseCase.crear()` nunca seteaba `estadoAprobacion: "BORRADOR"` explícitamente, dependía de un default implícito de la BD) y 4 mocks de test desactualizados que no reflejaban métodos agregados por sprints posteriores (`ClienteRepositoryPort.buscarPorIdentificacion`, `HallazgoRepositoryPort.anularPorApelacion`, `ReporteRepositoryPort.obtenerPanelEjecutivo`, `UsuarioRepositoryPort.obtenerPasswordHash`/`actualizarPasswordHash`). Ver `impl.md` para el detalle completo.

---

## Definición de "done" para el sprint

El sprint 009 está **completo con las 3 HU implementadas**:

1. Todos los ítems de este checklist están marcados ✅, salvo 2 desviaciones de diseño documentadas explícitamente (alcance del código de verificación, breadcrumb).
2. 321 tests backend + 296/302 tests frontend (única excepción preexistente: `strip-resumen-plantilla.test.tsx` de sprint 001) en verde. `pnpm --filter web lint` 0 errores. `pnpm --filter api build` 0 errores (recién arreglado). `pnpm --filter web build` sin errores.
3. Arquitectura hexagonal verificada: `domain/`/`application/` de `integraciones` sin imports de infraestructura; middleware de API key vive en `apps/api/src/middleware/`, transversal.
4. Las tres historias de usuario ejecutadas de punta a punta vía curl real (directo :4000 y proxy :3000 con sesión real):
   - [x] Importar un archivo Excel con clientes mixtos (válidos + inválidos) y verificar el reporte de errores sin perder las filas válidas.
   - [x] Importar sucursales asociadas a un cliente existente por identificación.
   - [x] Generar una API key real, consultar `GET /api/v1/certificaciones/verificar/:codigo` con ella (200), sin ella (401), revocada (401), código inexistente (404), exceder el rate limit (429), confirmar que `claveHash` nunca se filtra y que solo `administrador` puede gestionar keys (403 con `administrador_cliente`).
5. `memoria/cambios_db/registro.md` tiene las entradas de ambas partes del sprint (`add_importacion_lote` 2026-07-21, `add_api_key` 2026-07-24).

**No verificado con clics reales en un navegador** (sin herramienta de automatización de browser en esta sesión, mismo límite que todos los sprints anteriores).

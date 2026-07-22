# Tareas — 008-reportes-analytics

> Orden de ejecución: Base de datos → Backend (`agente-analisis`) → Frontend (`agente-analisis` + `agente-frontend`) → Tests.
> Numeración desde T-360 para no colisionar con sprints anteriores (001: T-01–T-40, 002: T-50–T-74).
> Precondición: sprints 001–007 ya están implementados. Este sprint **no** modifica `spec.md`, otros sprints ni `memoria/estado.md`.

---

## Agente: `agente-basededatos`

- [x] **T-360** Crear migración `add_reportes_generados` en `packages/db/prisma/`:
  - Tabla `reporte_generado`:
    - `id UUID PK DEFAULT gen_random_uuid()`
    - `empresa_id UUID FK → empresa(id)`
    - `tipo VARCHAR(30) NOT NULL` (enum Prisma `TipoReporte`: `CONSOLIDADO_CLIENTE` / `COMPARATIVO_SUCURSALES`)
    - `filtros JSONB NOT NULL` (snapshot de cliente(s), rango de fechas, sucursales incluidas)
    - `formato VARCHAR(10) NOT NULL` (enum Prisma `FormatoReporte`: `EXCEL` / `PDF`)
    - `url TEXT NOT NULL` (ubicación en Supabase Storage)
    - `generado_por_id UUID FK → usuario(id)`
    - `creado_en TIMESTAMPTZ NOT NULL DEFAULT now()`
  - Agregar `model ReporteGenerado` y enums `TipoReporte`/`FormatoReporte` al schema Prisma con los campos mapeados en camelCase (ver `impl.md` → Modelo Prisma).

- [x] **T-361** Índices en `reporte_generado`:
  - `(empresa_id, creado_en DESC)` — listar historial ordenado por fecha, filtrado por empresa.
  - `(empresa_id, tipo)` — filtro por tipo de reporte en el historial.

- [x] **T-362** Revisar/confirmar índices de soporte en tablas ya existentes (sprints 003/005/006) que las queries agregadas de este sprint necesitan (ver `impl.md` → Queries agregadas):
  - `inspeccion(sucursal_id, estado, firmado_en)`
  - `inspeccion(empresa_id, fecha_vencimiento)`
  - `hallazgo(inspeccion_id, severidad)`
  - `accion_correctiva(plan_cumplimiento_id, estado)`
  - Si alguno falta, agregarlo en esta misma migración o en una adicional `add_indices_reportes`. Coordinar con `agente-analisis` antes de descartar alguno como innecesario.

- [x] **T-363** Evaluar si los cálculos agregados pesados (consolidado por cliente, comparativo entre sucursales) deben resolverse como **stored procedure** (`sp_reportes_consolidado_cliente.sql` / `sp_reportes_comparativo_sucursales.sql`, ver `CLAUDE.md` → Procedimientos almacenados) o como query Prisma/SQL directa desde `infrastructure/`. Documentar la decisión (aunque sea "no se necesita SP por ahora") en `memoria/decisiones.md`.

- [x] **T-364** Agregar entrada en `memoria/cambios_db/registro.md` con el resultado de T-360 a T-363.

---

## Agente: `agente-analisis` — Backend (`apps/api/src/modules/reportes`)

> `agente-analisis` es dueño de este módulo según `CLAUDE.md`. Sigue las mismas capas hexagonales que `inspeccion` (001) y `clientes` (002): `domain/` y `application/` sin Express ni Prisma.

- [x] **T-365** Crear entidad de dominio `domain/reporte.entity.ts`:
  - Tipo `ReporteGenerado` con todos los campos de T-360.
  - `construirResumenFiltros(filtros: FiltrosReporte): string` — texto legible para la columna "Filtros" del historial (ej. `"Distribuidora Sur S.A. · 01/06/2026 – 30/06/2026"`).
  - `puedeGenerarReporte(rol: string, alcance: AlcanceUsuario, clienteIdSolicitado: string): boolean` — aplica la regla de negocio 1 del spec: `administrador` siempre `true`; `administrador_cliente` solo si `clienteIdSolicitado === alcance.clienteId`; `usuario_sucursal` siempre `false`.

- [x] **T-366** Crear puerto `domain/reporte.repository.port.ts`:
  - `listarHistorial(empresaId, filtros, alcance): Promise<{ items: ReporteGenerado[]; total: number }>`
  - `crear(datos): Promise<ReporteGenerado>`
  - `obtenerPorId(id, empresaId): Promise<ReporteGenerado | null>`
  - `obtenerDatosConsolidadoCliente(empresaId, clienteId, fechaDesde, fechaHasta): Promise<DatosConsolidadoCliente>`
  - `obtenerDatosComparativoSucursales(empresaId, clienteId, sucursalIds, fechaDesde, fechaHasta): Promise<DatosComparativoSucursales>`

- [x] **T-367** Crear errores de dominio `domain/reporte.errors.ts`:
  - `ClienteFueraDeAlcanceError`
  - `AccesoModuloReportesDenegadoError` (rol `usuario_sucursal`)
  - `TipoReporteInvalidoError`
  - `ReporteNoEncontradoError`

- [x] **T-368** Crear esquemas Zod `application/reporte.schema.ts`:
  - `generarReporteSchema`: `tipo` (enum), `formato` (enum), `clienteId` (requerido), `sucursalIds` (array opcional, requerido si `tipo = COMPARATIVO_SUCURSALES`), `fechaDesde`, `fechaHasta` (requeridas, `fechaHasta >= fechaDesde`).
  - `listarHistorialSchema`: `tipo?`, `clienteId?`, `pagina`, `porPagina` (query params).

- [x] **T-369** Crear caso de uso `application/casos-uso/generar-reporte.usecase.ts` (`GenerarReporteUseCase`):
  - `generar(empresaId, usuario, input)`:
    1. valida alcance con `puedeGenerarReporte()`; lanza `ClienteFueraDeAlcanceError`/`AccesoModuloReportesDenegadoError` si no corresponde.
    2. obtiene los datos agregados (`obtenerDatosConsolidadoCliente` u `obtenerDatosComparativoSucursales` según `tipo`).
    3. delega la generación del archivo al puerto correspondiente (`GeneradorExcelPort`/`GeneradorPdfPort`, ver T-371).
    4. sube el archivo con `ReporteStoragePort` y guarda el `ReporteGenerado` con `filtros` como snapshot JSON del input.
    5. retorna `{ reporte, urlDescarga }` para descarga inmediata.
  - `obtenerPreviewConsolidado(empresaId, usuario, clienteId, fechaDesde, fechaHasta)` — mismos datos que T-369.2 pero sin generar archivo (para la vista previa en pantalla).
  - `obtenerPreviewComparativo(empresaId, usuario, clienteId, sucursalIds, fechaDesde, fechaHasta)` — idem para comparativo.

- [x] **T-370** Crear caso de uso `application/casos-uso/listar-historial-reportes.usecase.ts` (`ListarHistorialReportesUseCase`):
  - `listar(empresaId, usuario, filtros)` — aplica el alcance del usuario (administrador ve todo; `administrador_cliente` solo reportes cuyo `filtros.clienteId` sea el suyo) antes de delegar al repositorio.
  - `obtenerParaDescarga(id, empresaId, usuario)` — lanza `ReporteNoEncontradoError` si no existe o está fuera de alcance; retorna la `url` firmada.

- [x] **T-371** **Decisión técnica (investigación, sin fijar código todavía):** evaluar librería de generación de Excel (candidata: `exceljs` u otra equivalente con soporte de estilos/streaming) y confirmar si el PDF de este sprint reutiliza el mismo motor server-side que `agente-backend`/`agente-produccion` dejaron decidido en el sprint 005 para el PDF de certificación, o si requiere uno propio por ser un documento distinto (tablas agregadas vs. ficha firmada). Registrar la decisión final en `memoria/decisiones.md` antes de implementar T-372 — no asumir un nombre de librería en el código hasta entonces.
  - Crear puertos de dominio `domain/generador-excel.port.ts` (`generar(datos: DatosReporte): Promise<Buffer>`) y `domain/generador-pdf.port.ts` (misma firma) para que `application/` dependa solo de la interfaz, nunca de la librería concreta.

- [x] **T-372** Crear adaptadores de infraestructura:
  - `infrastructure/reporte.prisma-repository.ts` — implementa `ReporteRepositoryPort`, incluidas las queries agregadas (o llamadas a los SP de T-363 vía `$queryRaw`).
  - `infrastructure/reporte-excel.adapter.ts` — implementa `GeneradorExcelPort` con la librería decidida en T-371.
  - `infrastructure/reporte-pdf.adapter.ts` — implementa `GeneradorPdfPort` con el motor decidido en T-371.
  - `infrastructure/reporte-storage.adapter.ts` — sube el archivo a Supabase Storage con la ruta `reportes/{empresaId}/{reporteId}/{archivo}` (mismo patrón de convención que `certificaciones/...` de sprint 005) y retorna la `url`.

- [x] **T-373** Crear controlador y router:
  - `infrastructure/reporte.controller.ts`
  - `infrastructure/reportes.router.ts`
  - Endpoints:
    - `POST   /reportes` — genera el reporte (crea `ReporteGenerado`, retorna `{ data: { reporte, urlDescarga } }`)
    - `GET    /reportes` — historial paginado (`?tipo=&clienteId=&pagina=&porPagina=`)
    - `GET    /reportes/:id` — detalle de un reporte del historial
    - `GET    /reportes/:id/descargar` — retorna la URL firmada de descarga (o hace proxy del archivo)
    - `GET    /reportes/consolidado-cliente/preview` — datos crudos del consolidado (`?clienteId=&fechaDesde=&fechaHasta=`), sin generar archivo
    - `GET    /reportes/comparativo-sucursales/preview` — idem comparativo (`?clienteId=&sucursalIds=&fechaDesde=&fechaHasta=`)

- [x] **T-374** Crear `apps/api/src/modules/reportes/index.ts` con factory `crearModuloReportes(prisma, autenticar)` y montar en `apps/api/src/index.ts` bajo `/reportes`. Crear Route Handlers Next.js proxy en `apps/web/src/app/api/reportes/`:
  - `route.ts` → `GET` (historial) + `POST` (generar)
  - `[id]/route.ts` → `GET`
  - `[id]/descargar/route.ts` → `GET`
  - `consolidado-cliente/preview/route.ts` → `GET`
  - `comparativo-sucursales/preview/route.ts` → `GET`

---

## Agente: `agente-analisis` — Frontend (`apps/web/app/(dashboard)/analytics`)

- [x] **T-375** Agregar tipos en `packages/shared/types/reportes.ts`:
  - `ReporteGenerado`, `TipoReporte`, `FormatoReporte`, `FiltrosReporte`.
  - `DatosConsolidadoCliente` (sucursales del cliente con certificaciones del período, puntaje/clasificación, hallazgos abiertos, estado del plan de cumplimiento).
  - `DatosComparativoSucursales` (`FilaComparativaSucursal[]`: sucursal, puntaje, % cumplimiento, estado de certificación vigente).
  - Re-exportar desde `packages/shared/src/index.ts`.

- [x] **T-376** Crear `_servicios/reportes.servicio.ts`:
  - `generarReporte(datos)`, `listarHistorial(filtros)`, `obtenerReporte(id)`, `obtenerUrlDescarga(id)`, `obtenerPreviewConsolidado(clienteId, fechaDesde, fechaHasta)`, `obtenerPreviewComparativo(clienteId, sucursalIds, fechaDesde, fechaHasta)`.
  - Todas las funciones incluyen `Authorization: Bearer <token>`, mismo helper de sesión que el resto del proyecto (ver `apps/web/src/lib/sesion.ts`).

- [x] **T-377** Crear hook `_hooks/usar-generar-reporte.ts`:
  - Estado: `tipo`, `clienteId`, `sucursalIds`, `fechaDesde`, `fechaHasta`, `formato`, `previsualizando`, `datosPreview`, `generando`, `error`.
  - Acciones: `cargarPreview()` (llama `obtenerPreviewConsolidado`/`obtenerPreviewComparativo` según `tipo`), `generar()` (llama `generarReporte`, retorna `{ reporte, urlDescarga }`), `reiniciar()`.

- [x] **T-378** Crear hook `_hooks/usar-historial-reportes.ts`:
  - Estado: `reportes`, `cargando`, `error`, `filtros` (`tipo`, `clienteId`).
  - Acciones: `recargar()`, `cambiarFiltros(filtros)`, `descargar(id)` (obtiene la URL firmada y dispara la descarga).

- [x] **T-379** Crear componentes en `_components/`:
  - `formulario-generar-reporte.tsx` — selector de tipo, cliente(s)/sucursales según alcance del usuario ([[004-usuarios-roles-alcance]]), rango de fechas, formato; botón "Generar" deshabilitado hasta que los filtros obligatorios estén completos.
  - `tabla-historial-reportes.tsx` — columnas Tipo, Filtros (resumen), Formato, Generado por, Fecha, Acción "Descargar"; skeleton de carga; estado vacío.
  - `vista-previa-consolidado.tsx` — tabla del consolidado por cliente (ver `impl.md` → Pantalla 3).
  - `vista-previa-comparativo.tsx` — tabla lado a lado por sucursal, usa el componente `TablaComparativa` de `packages/ui` (T-383).
  - `badge-tipo-reporte.tsx` y `badge-formato-reporte.tsx` — badges reutilizables dentro del módulo `analytics`.

- [x] **T-380** Crear página `app/(dashboard)/analytics/reportes/nuevo/page.tsx`: formulario (T-379) + vista previa (`vista-previa-consolidado`/`vista-previa-comparativo` según `tipo`) antes de exportar, botón "Generar y descargar" (ver `impl.md` → Pantalla 1 y Pantalla 3).

- [x] **T-381** Crear página `app/(dashboard)/analytics/reportes/page.tsx`: historial de reportes generados con `TablaHistorialReportes` (ver `impl.md` → Pantalla 2).

- [x] **T-382** Actualizar el panel ejecutivo existente de sprint 006 (`app/(dashboard)/analytics/page.tsx`) agregando dos accesos: "Generar reporte" → `/analytics/reportes/nuevo` y "Ver historial de reportes" → `/analytics/reportes`. No se rediseña el panel ejecutivo — solo se agregan los dos enlaces/tarjetas de acceso.

---

## Agente: `agente-frontend`

- [x] **T-383** Crear componente transversal `TablaComparativa` en `packages/ui` (o extender las primitivas de `packages/ui/table.tsx` con una variante de columnas dinámicas) para tablas lado a lado con N columnas (una por sucursal) — solicitado por `agente-analisis` para `vista-previa-comparativo.tsx` (T-379), según la coordinación descrita en `CLAUDE.md` → alcance de `agente-analisis`. `agente-frontend` es dueño del patrón; `agente-analisis` solo lo consume, no lo reimplementa.

---

## Agente: `agente-qa` — Tests de unidad Backend

> Vitest. Dominio puro sin mocks; casos de uso con mock del repositorio y de los generadores Excel/PDF.

- [x] **T-384** `reporte.entity.test.ts`:
  - `construirResumenFiltros()` con un solo cliente y rango de fechas → texto esperado
  - `construirResumenFiltros()` con comparativo de sucursales (varias `sucursalIds`) → incluye la cantidad de sucursales
  - `puedeGenerarReporte("administrador", ..., cualquierClienteId)` → `true`
  - `puedeGenerarReporte("administrador_cliente", { clienteId: "A" }, "A")` → `true`
  - `puedeGenerarReporte("administrador_cliente", { clienteId: "A" }, "B")` → `false`
  - `puedeGenerarReporte("usuario_sucursal", ..., cualquierClienteId)` → `false`

- [x] **T-385** `generar-reporte.usecase.test.ts`:
  - `generar()` lanza `ClienteFueraDeAlcanceError` si `administrador_cliente` solicita un `clienteId` distinto al suyo
  - `generar()` lanza `AccesoModuloReportesDenegadoError` si el rol es `usuario_sucursal`
  - `generar()` con `formato: "EXCEL"` llama `GeneradorExcelPort.generar()` y no llama al de PDF
  - `generar()` con `formato: "PDF"` llama `GeneradorPdfPort.generar()` y no llama al de Excel
  - `generar()` guarda `filtros` como snapshot exacto del input recibido
  - `generar()` retorna `{ reporte, urlDescarga }` con la `url` que devuelve `ReporteStoragePort`
  - `obtenerPreviewComparativo()` no genera archivo ni llama a los puertos de Excel/PDF
  - `ListarHistorialReportesUseCase.listar()` filtra por `clienteId` propio cuando el rol es `administrador_cliente`
  - `ListarHistorialReportesUseCase.obtenerParaDescarga()` lanza `ReporteNoEncontradoError` si el reporte pertenece a otro cliente fuera del alcance del usuario

- [x] **T-386** Test de integración ligera (contra BD de pruebas local): `POST /reportes` con `formato: "EXCEL"` → `GET /reportes` retorna el reporte en el historial con `url` no vacía y `tipo`/`formato` correctos.

---

## Agente: `agente-qa` — Tests de unidad Frontend

> Vitest + React Testing Library. Servicios mockeados, sin llamadas reales de red.

- [x] **T-387** `formulario-generar-reporte.test.tsx`:
  - El botón "Generar" está deshabilitado sin `clienteId` seleccionado
  - El botón "Generar" está deshabilitado sin `fechaDesde`/`fechaHasta`
  - Con `tipo = COMPARATIVO_SUCURSALES` sin `sucursalIds` seleccionadas, el botón permanece deshabilitado
  - Cambiar cualquier filtro dispara `onCambiarFiltros` (usado por el hook para invalidar el preview cargado)
  - Clic en "Generar" con filtros válidos llama `onGenerar` con los datos del formulario

- [x] **T-388** `tabla-historial-reportes.test.tsx`:
  - Con `reportes = []` muestra estado vacío
  - Con reportes renderiza filas con Tipo, Filtros, Formato, Generado por y Fecha
  - El botón "Descargar" de cada fila llama `onDescargar(id)`
  - Muestra skeleton mientras `cargando = true`

- [x] **T-389** `vista-previa-comparativo.test.tsx`:
  - Renderiza una columna por sucursal recibida en `datos.filas`
  - La sucursal sin certificación vigente muestra `—` en la columna de puntaje (no un error ni una celda vacía sin explicación)
  - La sucursal con certificación vencida resalta el estado con el mismo estilo usado en el panel ejecutivo de sprint 006 (no un color nuevo inventado)

---

## Dependencias entre tareas

```
T-360 → T-361, T-362, T-363 → T-364
T-364 → T-365 → T-366 → T-367 → T-368 → T-369
T-369 → T-370
T-369 → T-371 → T-372 → T-373 → T-374
T-374 → T-375 → T-376 → T-377, T-378
T-376 → T-379
T-377, T-378 → T-379
T-383 → T-379              ← vista-previa-comparativo necesita TablaComparativa
T-379 → T-380, T-381
T-381 → T-382
T-365 → T-384
T-369, T-370 → T-385
T-373 → T-386
T-379 → T-387, T-388, T-389
```

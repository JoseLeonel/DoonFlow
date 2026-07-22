# Guía de implementación — 008-reportes-analytics

> Referencia técnica para los agentes. Describe qué construir y dónde, sin escribir el código — el código va en el repositorio, no aquí.
> Alcance fijado por `CLAUDE.md` → `agente-analisis`: `apps/api/src/modules/reportes/`, `apps/web/app/(dashboard)/analytics/`, `packages/shared/types/reportes.ts`. Coordina con `agente-frontend` (componentes de gráficas/tablas reutilizables) y `agente-basededatos` (queries/índices optimizados).

## Desviaciones respecto a este documento (registradas durante la implementación, 2026-07-21)

1. **Alcance de los datos reducido — decisión explícita del usuario, no una improvisación técnica.** Al empezar la implementación se detectó que el spec/task.md/impl.md originales (escritos 2026-07-16, antes de que 007/010 avanzaran) asumían columnas y tablas que **no existen en el schema real**: `Inspeccion.firmadoEn`/`fechaVencimiento` (de 005-certificacion-plan-cumplimiento, **pausado**) y los modelos `Hallazgo`/`PlanCumplimiento`/`AccionCorrectiva` (de 013-hallazgos-plan-cumplimiento, **bloqueado por 005**). Se preguntó al usuario cómo proceder (adaptar alcance / solo infraestructura sin datos / pausar el sprint) y eligió **adaptar el alcance a los datos reales disponibles hoy**. `DatosConsolidadoCliente`/`DatosComparativoSucursales` (`domain/reporte.entity.ts` y `packages/shared/src/types/reportes.ts`) **no incluyen** `hallazgosAbiertos`, `estadoPlanCumplimiento`, `certificacionVigente` ni `certificacionVencida` — usan `Inspeccion.puntajeObtenido`/`puntajeMaximo`/`porcentajeCumplimiento`/`clasificacion`/`fechaInicio` tal como existen desde el wizard de 015. El comparativo reemplaza "vigente/vencida" por `tieneCertificacionEnPeriodo: boolean`.
2. **Hallazgo adicional durante la implementación**: `Inspeccion.estado` nunca sale de `"EN_PROGRESO"` en el código real — el wizard de 015 ("Guardar y finalizar") nunca actualiza `estado` ni `fechaFin`, solo acumula respuestas/puntaje sección por sección (ver `memoria/decisiones.md`, misma entrada). Los reportes de este sprint no distinguen "certificación completa" de "en progreso" — cuentan cualquier `Inspeccion` iniciada en el período (por `fechaInicio`), usando el puntaje acumulado al momento de generar el reporte. No es un bug de 008, es una limitación heredada de 015 que 008 documenta pero no corrige.
3. **Librerías decididas en la misma sesión** (T-371, sin decisión previa de 005 que reutilizar porque 005 sigue pausado): `exceljs` para Excel, `pdfkit` para PDF (no un motor basado en Chromium, para no complicar el despliegue mientras el proveedor de hosting de `apps/api` sigue sin definir). Ver `memoria/decisiones.md`.
4. **`GET /reportes/:id` (detalle individual) no implementado.** El contrato de API del spec lo listaba, pero ningún flujo del frontend lo necesita — el historial (`GET /reportes`) ya trae todos los campos inline (incluido `resumenFiltros` y `generadoPorNombre`, resueltos server-side, ver punto 6) y `GET /reportes/:id/descargar` cubre la descarga. Se recortó para no construir un endpoint sin consumidor.
5. **No hay panel ejecutivo de sprint 006 que "actualizar" (T-382).** `014-panel-calendario-biblioteca` (donde vivía el panel ejecutivo real, separado de 006 al dividir ese sprint por tamaño) sigue sin código — no existía ninguna ruta `/analytics` antes de este sprint. Se creó `apps/web/src/app/(dashboard)/analytics/page.tsx` como página nueva con los 2 accesos pedidos ("Generar reporte" / "Ver historial"), no como una actualización de algo preexistente.
6. **`ReporteGenerado` se enriquece server-side antes de llegar al frontend.** El modelo Prisma solo guarda `filtros.clienteId` (un UUID); para la columna "Filtros" del historial (`construirResumenFiltros()`) y la columna "Generado por" hace falta el nombre del cliente y del usuario, no solo sus ids. Se agregó un tipo `ReporteHistorialItem` (extiende `ReporteGenerado` con `resumenFiltros: string` y `generadoPorNombre: string`) que `ReportePrismaRepository.listarHistorial()` resuelve con dos consultas adicionales en lote (`cliente.findMany`/`usuario.findMany` por los ids de la página actual) — no expuesto originalmente en el contrato del spec, pero necesario para que la UI no muestre UUIDs crudos.
7. **`FormularioGenerarReporte` es un componente completamente controlado**, sin estado interno propio — todo el estado (`tipo`, `clienteId`, `sucursalIds`, `fechaDesde`, `fechaHasta`, `formato`) vive en el hook `usarGenerarReporte`, con un `onChange` por campo en vez de un único callback genérico `onCambiarFiltros`. Se descartó un diseño inicial con estado interno + `onCambiarFiltros` porque introducía un bug real de sincronización (el botón "Generar" del formulario habría necesitado copiar su estado interno al hook antes de poder leer los filtros vigentes, con una condición de carrera por la naturaleza asíncrona de `setState`).
8. **Bug real de control de acceso encontrado y corregido en esta sesión**: `ListarHistorialReportesUseCase.listar()` no verificaba `alcance.tipo === "SUCURSAL"` — un `usuario_sucursal` podía ver el historial completo de reportes de la empresa (sin el filtro de `administrador_cliente`, que si existía). Corregido lanzando `AccesoModuloReportesDenegadoError` al inicio del método, igual que ya hacía `GenerarReporteUseCase.generar()`. Verificado por curl con el usuario demo `lucia@dist.com` (rol `usuario_sucursal`): antes del fix retornaba 200 con todos los reportes, después retorna 403.
9. **Inconsistencia preexistente de versiones corregida de paso**: `packages/ui/package.json` declaraba `@types/react: ^19.0.0` mientras el resto del monorepo (`apps/web`) usa `^18.3.0` — causaba un error de tipos `ReactNode` duplicados al compilar `apps/web` contra el nuevo componente `TablaComparativa` (el primer componente de `packages/ui` en usar `ReactNode` genérico en sus props). Corregido alineando `packages/ui` a `^18.3.0`.

---

## Archivos a crear / completar

### Base de datos (`packages/db`)

```
prisma/
├── schema.prisma                          ← MODIFICAR: agregar model ReporteGenerado + enums
└── migrations/
    └── YYYYMMDDHHMMSS_add_reportes_generados/
        └── migration.sql                  ← generada por prisma migrate dev
```

**Modelo Prisma a agregar en `schema.prisma`:**
```prisma
enum TipoReporte {
  CONSOLIDADO_CLIENTE
  COMPARATIVO_SUCURSALES
}

enum FormatoReporte {
  EXCEL
  PDF
}

/// ReporteGenerado — archivo exportable (Excel/PDF) ya calculado y guardado.
/// No se recalcula al abrir el historial; cada generación crea una fila nueva.
model ReporteGenerado {
  id             String         @id @default(uuid())
  empresaId      String         @map("empresa_id")
  tipo           TipoReporte
  filtros        Json           // snapshot: clienteId, sucursalIds?, fechaDesde, fechaHasta
  formato        FormatoReporte
  url            String         // ubicación en Supabase Storage
  generadoPorId  String         @map("generado_por_id")
  creadoEn       DateTime       @default(now()) @map("creado_en")

  @@index([empresaId, creadoEn(sort: Desc)])
  @@index([empresaId, tipo])
  @@map("reporte_generado")
}
```

> Nota: `filtros` es `Json` (no columnas separadas) porque el conjunto de filtros varía según `tipo` (consolidado usa un solo `clienteId`; comparativo agrega `sucursalIds`). Mantiene el mismo patrón que `filtros` en `Notificacion`/`InspeccionAuditoria` (campos `Json` para snapshots) ya usado en sprints anteriores.

### Backend (`apps/api`)

```
src/modules/reportes/
├── domain/
│   ├── reporte.entity.ts                  ← tipo ReporteGenerado + construirResumenFiltros() + puedeGenerarReporte()
│   ├── reporte.repository.port.ts         ← puerto del repositorio (5 métodos)
│   ├── generador-excel.port.ts            ← puerto: generar(datos) => Promise<Buffer>
│   ├── generador-pdf.port.ts              ← puerto: generar(datos) => Promise<Buffer>
│   ├── reporte-storage.port.ts            ← puerto: subir(buffer, ruta) => Promise<string (url)>
│   └── reporte.errors.ts                  ← 4 errores de dominio
├── application/
│   ├── reporte.schema.ts                  ← generarReporteSchema + listarHistorialSchema
│   └── casos-uso/
│       ├── generar-reporte.usecase.ts
│       └── listar-historial-reportes.usecase.ts
├── infrastructure/
│   ├── reporte.prisma-repository.ts       ← implementa el puerto + queries agregadas
│   ├── reporte-excel.adapter.ts           ← implementa GeneradorExcelPort
│   ├── reporte-pdf.adapter.ts             ← implementa GeneradorPdfPort
│   ├── reporte-storage.adapter.ts         ← implementa ReporteStoragePort (Supabase Storage)
│   ├── reporte.controller.ts
│   └── reportes.router.ts
├── index.ts                               ← export crearModuloReportes(prisma, autenticar)
└── __tests__/
    ├── reporte.entity.test.ts
    └── generar-reporte.usecase.test.ts
```

Líneas a agregar en `apps/api/src/index.ts`:
```typescript
import { crearModuloReportes } from "./modules/reportes";
const moduloReportes = crearModuloReportes(prisma, autenticar);
app.use("/reportes", moduloReportes.router);
```

### Route Handlers proxy (Next.js)

```
apps/web/src/app/api/reportes/
├── route.ts                               ← GET (historial) + POST (generar)
├── [id]/
│   ├── route.ts                           ← GET (detalle)
│   └── descargar/route.ts                 ← GET (url/descarga)
├── consolidado-cliente/
│   └── preview/route.ts                   ← GET
└── comparativo-sucursales/
    └── preview/route.ts                   ← GET
```

### Tipos compartidos (`packages/shared`)

```
types/reportes.ts                          ← CREAR
src/index.ts                               ← MODIFICAR: re-exportar types/reportes.ts
```

**Tipos a definir:**
```typescript
export type TipoReporte = "CONSOLIDADO_CLIENTE" | "COMPARATIVO_SUCURSALES";
export type FormatoReporte = "EXCEL" | "PDF";

export interface FiltrosReporte {
  clienteId: string;
  sucursalIds?: string[];
  fechaDesde: string;
  fechaHasta: string;
}

export interface ReporteGenerado {
  id: string;
  empresaId: string;
  tipo: TipoReporte;
  filtros: FiltrosReporte;
  formato: FormatoReporte;
  url: string;
  generadoPorId: string;
  creadoEn: string;
}

export interface FilaConsolidadoSucursal {
  sucursalId: string;
  sucursalNombre: string;
  certificacionesDelPeriodo: number;
  puntajeVigente: number | null;
  clasificacionVigente: string | null;
  hallazgosAbiertos: number;
  estadoPlanCumplimiento: string | null; // null si no tiene plan
}

export interface DatosConsolidadoCliente {
  clienteId: string;
  clienteNombre: string;
  periodo: { fechaDesde: string; fechaHasta: string };
  sucursales: FilaConsolidadoSucursal[];
}

export interface FilaComparativaSucursal {
  sucursalId: string;
  sucursalNombre: string;
  puntaje: number | null;
  porcentajeCumplimiento: number | null;
  certificacionVigente: boolean;
  certificacionVencida: boolean;
}

export interface DatosComparativoSucursales {
  clienteId: string;
  clienteNombre: string;
  periodo: { fechaDesde: string; fechaHasta: string };
  filas: FilaComparativaSucursal[];
}
```

### Frontend (`apps/web`)

```
app/(dashboard)/analytics/
├── page.tsx                               ← MODIFICAR: agregar accesos a reportes (panel ejecutivo de sprint 006, no se toca el resto)
├── reportes/
│   ├── page.tsx                           ← CREAR: historial
│   └── nuevo/
│       └── page.tsx                       ← CREAR: generar reporte + vista previa
├── _servicios/
│   └── reportes.servicio.ts               ← CREAR
├── _hooks/
│   ├── usar-generar-reporte.ts            ← CREAR
│   └── usar-historial-reportes.ts         ← CREAR
├── _components/
│   ├── formulario-generar-reporte.tsx     ← CREAR
│   ├── tabla-historial-reportes.tsx       ← CREAR
│   ├── vista-previa-consolidado.tsx       ← CREAR
│   ├── vista-previa-comparativo.tsx       ← CREAR
│   ├── badge-tipo-reporte.tsx             ← CREAR
│   └── badge-formato-reporte.tsx          ← CREAR
└── __tests__/
    ├── formulario-generar-reporte.test.tsx
    ├── tabla-historial-reportes.test.tsx
    └── vista-previa-comparativo.test.tsx

packages/ui/src/
└── tabla-comparativa.tsx                  ← CREAR (agente-frontend)
```

---

## Queries agregadas (referencia para `infrastructure/reporte.prisma-repository.ts`)

Ambos reportes se calculan **sobre datos existentes** de sprints 003/005/006 — este sprint no crea entidades de negocio nuevas de certificación, solo lee y agrega.

### Consolidado por cliente (`obtenerDatosConsolidadoCliente`)

Por cada `Sucursal` del `clienteId` recibido:
1. Certificaciones (`Inspeccion` con `estado = FIRMADA`) cuyo `firmadoEn` cae dentro de `[fechaDesde, fechaHasta]` → cuenta y toma la más reciente como "vigente" (mismo criterio ya usado en el histórico por sucursal de sprint 003 y el panel ejecutivo de sprint 006).
2. `puntajeVigente`/`clasificacionVigente` → de esa certificación más reciente firmada del período (`null` si no hay ninguna).
3. `hallazgosAbiertos` → `Hallazgo` de esa certificación cuyas `AccionCorrectiva` asociadas (vía `PlanCumplimiento`) no están todas `CUMPLIDO`.
4. `estadoPlanCumplimiento` → `PlanCumplimiento.estado` de la certificación vigente, `null` si no tiene plan (no hubo hallazgos).

### Comparativo entre sucursales (`obtenerDatosComparativoSucursales`)

Por cada `sucursalId` en `sucursalIds` (todas deben pertenecer al `clienteId` recibido — validar en el caso de uso, no confiar en el input):
1. Última certificación `FIRMADA` dentro del período → `puntaje`, `porcentajeCumplimiento`.
2. `certificacionVigente` → `true` si `fechaVencimiento >= hoy`.
3. `certificacionVencida` → `true` si `fechaVencimiento < hoy` (cálculo de presentación, mismo criterio que sprint 006 regla de negocio 3 — no es una transición de estado en `Inspeccion`).

Ambas queries filtran siempre por `empresaId` (aislamiento multiempresa) y validan que el `clienteId`/`sucursalIds` solicitados están dentro del alcance del usuario ([[004-usuarios-roles-alcance]]) **antes** de ejecutar la consulta — no después, para no filtrar datos ya traídos de otro cliente.

Si el volumen de datos lo justifica, `agente-basededatos` puede resolver estos dos cálculos como stored procedures (`sp_reportes_consolidado_cliente`, `sp_reportes_comparativo_sucursales`, ver `CLAUDE.md` → Procedimientos almacenados) invocados vía `$queryRaw` desde `infrastructure/` — decisión de T-363, no asumida de antemano por `agente-analisis`.

---

## Generación de archivos — Excel y PDF

**No se fija una librería concreta en esta guía** — es la decisión técnica de T-371, a cargo de `agente-backend`/`agente-analisis`, registrada en `memoria/decisiones.md` antes de implementar los adaptadores (T-372). Lineamientos:

- **Excel**: candidata natural es `exceljs` (soporta hojas múltiples, estilos de celda y streaming) u otra equivalente con el mismo nivel de control sobre formato de tabla — evaluar antes de fijarla en `package.json`.
- **PDF**: revisar primero qué motor server-side quedó decidido en el sprint 005 para el PDF de certificación firmada (`agente-backend`/`agente-produccion`, ver `memoria/decisiones.md` de ese sprint). Si ese motor sirve para un documento tabular/agregado (no solo la ficha con QR de sprint 006), se reutiliza para consistencia técnica; si el documento de reportes requiere un layout distinto (tablas comparativas, gráficos simples), se evalúa si conviene el mismo motor u otro — sin asumirlo de antemano.
- Ambos adaptadores viven exclusivamente en `infrastructure/` (`reporte-excel.adapter.ts`, `reporte-pdf.adapter.ts`) e implementan los puertos `GeneradorExcelPort`/`GeneradorPdfPort` de `domain/` — `application/` y `domain/` nunca importan la librería concreta.
- Convención de ruta de almacenamiento (Supabase Storage), igual patrón que `certificaciones/{empresaId}/{inspeccionId}/...` de sprint 005:
  ```
  reportes/{empresaId}/{reporteId}/{archivo}
  ```
  donde `{archivo}` es `reporte-{tipo}-{fechaGeneracion}.xlsx` o `.pdf`.

---

## Diseño de las 3 pantallas

### 1. Generar reporte (`/analytics/reportes/nuevo`)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Analytics > Reportes > Nuevo reporte                       [Breadcrumb]  │
├──────────────────────────────────────────────────────────────────────────┤
│ Generar reporte                                                          │
│ ────────────────────────────────────────────────────────────────────    │
│                                                                          │
│  Tipo de reporte *                                                      │
│  ( ) Consolidado por cliente     (•) Comparativo entre sucursales       │
│                                                                          │
│  Cliente *                                                              │
│  [ Distribuidora Sur S.A.                                        ▼ ]    │
│     ↑ oculto/fijo si el usuario es administrador_cliente                │
│                                                                          │
│  Sucursales a comparar *          ← solo si tipo = COMPARATIVO          │
│  [x] Planta Central  [x] Sucursal Norte  [ ] Sucursal Sur               │
│                                                                          │
│  Rango de fechas *                                                      │
│  Desde [ 01/06/2026 ]     Hasta [ 30/06/2026 ]                          │
│                                                                          │
│  Formato de exportación *                                               │
│  ( ) Excel        (•) PDF                                               │
│                                                                          │
│  [ Ver vista previa ]                                                   │
│  ────────────────────────────────────────────────────────────────────  │
│  (vista previa — ver Pantalla 3, se renderiza aquí mismo debajo)        │
│  ────────────────────────────────────────────────────────────────────  │
│  [   Generar y descargar   ]                    [   Cancelar   ]        │
└──────────────────────────────────────────────────────────────────────────┘
```

- El botón "Generar y descargar" queda deshabilitado hasta que la vista previa se haya cargado con los filtros vigentes (evita exportar un archivo con filtros que el usuario nunca confirmó ver en pantalla).
- Cambiar cualquier filtro después de cargar la vista previa la invalida (mostrar aviso "Los filtros cambiaron, actualiza la vista previa" en vez de dejar exportar datos desactualizados).
- Al completar la generación, se dispara la descarga del archivo (`urlDescarga`) y se muestra un mensaje de éxito con enlace a "Ver en historial".

### 2. Historial de reportes (`/analytics/reportes`)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Analytics > Reportes                                        [Breadcrumb] │
├──────────────────────────────────────────────────────────────────────────┤
│ Historial de reportes                          [+ Generar reporte]       │
│ Reportes generados anteriormente, listos para descargar                  │
├──────────────────────────────────────────────────────────────────────────┤
│ Filtrar por tipo: [ Todos ▼ ]                                            │
│  ────────────────────────────────────────────────────────────────────   │
│  TIPO              FILTROS                    FORMATO  GENERADO POR  FECHA        ACCIÓN   │
│  ────────────────────────────────────────────────────────────────────   │
│  Consolidado       Dist. Sur S.A. · jun 2026    Excel   Juan Pérez  16/07/2026  [Descargar] │
│  Comparativo        Dist. Sur S.A. (3 suc.)      PDF    María Solís 15/07/2026  [Descargar] │
│  ────────────────────────────────────────────────────────────────────   │
└──────────────────────────────────────────────────────────────────────────┘
```

- Columna "Filtros" usa `construirResumenFiltros()` del dominio — nunca renderiza el JSON crudo.
- El botón "Descargar" no recalcula nada: pide `GET /reportes/:id/descargar` y abre/descarga el archivo ya guardado en `url`.
- Estado vacío: ícono, texto "Todavía no se ha generado ningún reporte" y botón "Generar el primero" → `/analytics/reportes/nuevo`.

### 3. Vista comparativa/consolidada previa a exportar

Se renderiza **dentro** de la pantalla de generación (Pantalla 1), no en una ruta aparte — el usuario confirma los datos antes de exportar, en la misma interacción.

**Consolidado por cliente** (`vista-previa-consolidado.tsx`):
```
┌────────────────────────────────────────────────────────────────────────────┐
│  Vista previa — Distribuidora Sur S.A. · 01/06/2026 – 30/06/2026            │
│  ──────────────────────────────────────────────────────────────────────   │
│  SUCURSAL          CERTIF. PERÍODO  PUNTAJE   CLASIF.      HALLAZGOS  PLAN │
│  ──────────────────────────────────────────────────────────────────────   │
│  Planta Central          1           92/100   Excelente       0      —    │
│  Sucursal Norte           1           68/100   Aceptable       2   En seguim.│
│  Sucursal Sur              0            —        —             —      —    │
│  ──────────────────────────────────────────────────────────────────────   │
└────────────────────────────────────────────────────────────────────────────┘
```

**Comparativo entre sucursales** (`vista-previa-comparativo.tsx`, usa `TablaComparativa` de `packages/ui`):
```
┌────────────────────────────────────────────────────────────────────────────┐
│  Vista previa — Comparativo de sucursales                                  │
│  ──────────────────────────────────────────────────────────────────────   │
│                    Planta Central   Sucursal Norte   Sucursal Sur          │
│  Puntaje                 92               68              —                │
│  % Cumplimiento          92%              68%              —                │
│  Certificación         ● Vigente       ● Vigente        ○ Sin certificar   │
│  ──────────────────────────────────────────────────────────────────────   │
└────────────────────────────────────────────────────────────────────────────┘
```

- `● Vigente` en `text-green` / `● Vencida` en `text-red` (mismo estilo del sello del portal de verificación pública y el panel ejecutivo de sprint 006, no un color nuevo) / `○ Sin certificar` en `text-dark-4 dark:text-dark-6`.
- Mientras se carga la vista previa: skeleton de filas (`h-8 bg-gray-2 dark:bg-dark-3 animate-pulse`), igual patrón que el editor de fichas de sprint 001.
- Si la consulta de preview falla, tarjeta de error con botón "Reintentar" (mismo patrón `rounded-[10px] bg-white shadow-1 dark:bg-gray-dark p-6` del resto del proyecto).

---

### Tokens de diseño reutilizados (ninguno nuevo)

| Elemento | Clases Tailwind |
|---|---|
| Contenedor de formulario/tabla | `rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card` |
| Badge tipo/formato | `bg-gray-1 text-dark-4 dark:bg-dark-2 dark:text-dark-6 text-body-xs font-medium px-2.5 py-0.5 rounded-full` |
| Estado "Vigente" | `text-green dark:text-green-light` |
| Estado "Vencida" | `text-red` |
| Estado "Sin certificar" | `text-dark-4 dark:text-dark-6` |
| Botón "Generar y descargar" / "+ Generar reporte" | `variante="primario"` del componente `Boton` de `packages/ui` |
| Botón "Descargar" en fila | `text-sm font-medium text-primary hover:underline` |
| Skeleton | `h-8 animate-pulse rounded bg-gray-2 dark:bg-dark-3` |

---

## Contrato de API (resumen)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/reportes` | Genera el reporte (Excel o PDF), lo guarda y retorna `{ data: { reporte, urlDescarga } }` |
| GET | `/reportes` | Historial paginado (`?tipo=&clienteId=&pagina=&porPagina=`) |
| GET | `/reportes/:id` | Detalle de un reporte del historial |
| GET | `/reportes/:id/descargar` | URL de descarga del archivo ya generado |
| GET | `/reportes/consolidado-cliente/preview` | Datos agregados del consolidado (`?clienteId=&fechaDesde=&fechaHasta=`), sin generar archivo |
| GET | `/reportes/comparativo-sucursales/preview` | Datos agregados del comparativo (`?clienteId=&sucursalIds=&fechaDesde=&fechaHasta=`), sin generar archivo |

**Request body — generar:**
```json
{
  "tipo": "COMPARATIVO_SUCURSALES",
  "formato": "PDF",
  "clienteId": "uuid",
  "sucursalIds": ["uuid-1", "uuid-2"],
  "fechaDesde": "2026-06-01",
  "fechaHasta": "2026-06-30"
}
```

**Response exitosa:**
```json
{
  "data": {
    "reporte": {
      "id": "uuid",
      "empresaId": "uuid",
      "tipo": "COMPARATIVO_SUCURSALES",
      "filtros": { "clienteId": "uuid", "sucursalIds": ["uuid-1", "uuid-2"], "fechaDesde": "2026-06-01", "fechaHasta": "2026-06-30" },
      "formato": "PDF",
      "url": "https://.../reportes/{empresaId}/{reporteId}/reporte-comparativo-20260716.pdf",
      "generadoPorId": "uuid",
      "creadoEn": "2026-07-16T00:00:00.000Z"
    },
    "urlDescarga": "https://.../reportes/{empresaId}/{reporteId}/reporte-comparativo-20260716.pdf"
  }
}
```

**Errores:**
```json
{ "error": { "codigo": "cliente_fuera_de_alcance", "mensaje": "No tienes acceso a generar reportes de este cliente." } }
{ "error": { "codigo": "acceso_modulo_reportes_denegado", "mensaje": "Tu rol no tiene acceso al módulo de reportes." } }
{ "error": { "codigo": "reporte_no_encontrado", "mensaje": "El reporte no existe o no pertenece a tu alcance." } }
{ "error": { "codigo": "tipo_reporte_invalido", "mensaje": "El tipo de reporte no es válido." } }
```

---

## Estándares técnicos obligatorios

### Arquitectura hexagonal (backend)

```
domain/          → sin imports de Express, Prisma, exceljs/pdf-lib ni nada de infraestructura
application/     → sin imports de Express, @prisma/client ni la librería de Excel/PDF; usa solo puertos del domain
infrastructure/  → único lugar donde viven Prisma, Express y las librerías de generación de archivos
```

Verificaciones que hace `agente-qa` en cada PR:
- Ningún archivo en `domain/` o `application/` de `reportes` importa `express`, `@prisma/client`, `exceljs` (o la librería que se decida) ni el motor de PDF.
- `GenerarReporteUseCase` recibe `ReporteRepositoryPort`, `GeneradorExcelPort`, `GeneradorPdfPort` y `ReporteStoragePort` por constructor.
- Los controladores solo traducen HTTP ↔ caso de uso; cero lógica de alcance/negocio ahí.
- `puedeGenerarReporte()` y `construirResumenFiltros()` viven en `domain/reporte.entity.ts`.

### Clean Code

- Nombres en español: `obtenerDatosConsolidadoCliente`, `construirResumenFiltros`, `validarAlcanceReporte`.
- Si un caso de uso supera ~40 líneas, extraer funciones auxiliares con nombre descriptivo (ej. separar la validación de alcance de la orquestación de generación).
- Sin código muerto ni variables sin usar. `pnpm lint` debe pasar en verde.

### Documentación ISO — JSDoc

Obligatorio en todas las funciones exportadas de `domain/reporte.entity.ts`, todos los métodos de los puertos (`ReporteRepositoryPort`, `GeneradorExcelPort`, `GeneradorPdfPort`, `ReporteStoragePort`) y las acciones expuestas por `usar-generar-reporte.ts`/`usar-historial-reportes.ts`. Mismo formato que sprint 001:

```
/**
 * [Qué hace en una línea]
 *
 * @param filtros - Filtros usados para generar el reporte (snapshot).
 * @returns Texto legible para mostrar en la columna "Filtros" del historial.
 * @example
 *   construirResumenFiltros({ clienteId: "...", fechaDesde: "2026-06-01", fechaHasta: "2026-06-30" })
 *   // → "Distribuidora Sur S.A. · 01/06/2026 – 30/06/2026"
 */
export function construirResumenFiltros(filtros: FiltrosReporte): string
```

---

## Notas importantes

- `agente-analisis` no toca `apps/api/src/modules/inspeccion` (certificación, sprint 005) ni los módulos de sprint 006 (`notificaciones`, `verificacion`, `planificacion`, `hallazgos-frecuentes`) — solo **lee** de sus tablas (`Inspeccion`, `Hallazgo`, `PlanCumplimiento`, `AccionCorrectiva`) a través de queries propias en `infrastructure/reporte.prisma-repository.ts`.
- Este sprint no crea entidades de negocio de certificación nuevas — solo `ReporteGenerado`, que es un registro de "qué se exportó y cuándo".
- El campo `empresaId` viene del JWT (middleware de autenticación), nunca del body del request.
- Ningún archivo de este módulo se elimina físicamente — ni el registro `ReporteGenerado` ni el archivo en Supabase Storage (regla de negocio 2 del spec).
- Si `agente-frontend` necesita ajustar `TablaComparativa` para un caso de uso distinto a este sprint, la solicitud vuelve a pasar por `agente-frontend` como dueño del componente — `agente-analisis` no lo modifica directamente en `packages/ui`.

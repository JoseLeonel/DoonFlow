# Especificación — 008-reportes-analytics

## Historias de usuario

> **HU-1.** Como **administrador general**, quiero un reporte consolidado de certificaciones por cliente y período, exportable a Excel y PDF, para presentar resultados sin armar la información manualmente.

> **HU-2.** Como **administrador de cliente**, quiero comparar el desempeño de mis sucursales en un mismo reporte, para identificar cuáles necesitan más atención.

> **HU-3.** Como **administrador general o de cliente**, quiero un historial de los reportes que ya generé, para volver a descargarlos sin regenerarlos cada vez.

---

## Contexto

- `CLAUDE.md` ya nombra el módulo **"Reportes y Analytics"** (`agente-analisis`, `apps/api/src/modules/reportes/`, `apps/web/app/(dashboard)/analytics/`), pero nunca tuvo una HU propia — quedó como mención genérica.
- [[015-wizard-certificacion]], [[005-certificacion-plan-cumplimiento]] y [[006-vigencia-notificaciones-portal]] dejaron explícitamente fuera de alcance los "reportes comparativos entre sucursales/clientes" y remitieron aquí. El **reporte individual en PDF** de una certificación firmada (con código de verificación) está diseñado en 005 (**pausado, no implementado todavía**) — este sprint no lo repite, trabaja sobre **agregados** de los datos del formulario que sí existen (015).
- El panel ejecutivo de [[014-panel-calendario-biblioteca]] (separado de [[006-vigencia-notificaciones-portal]] al dividir ese sprint por tamaño) muestra KPIs en pantalla; este sprint es lo que permite **sacar esos datos de la pantalla** en un archivo descargable/compartible.

---

## Alcance de este sprint

1. **Reporte consolidado por cliente**: todas sus sucursales, certificaciones del período seleccionado, puntaje/clasificación, hallazgos abiertos, estado del plan de cumplimiento.
2. **Reporte comparativo entre sucursales** de un mismo cliente: tabla lado a lado con puntaje, % de cumplimiento y estado de certificación vigente por sucursal.
3. **Exportación** a Excel (tabla de datos) y PDF (formato imprimible/presentable).
4. **Historial de reportes generados**: el archivo queda guardado (no se recalcula cada vez que se abre el historial).

Este sprint **no** incluye BI interactivo (gráficas exploratorias tipo dashboard de terceros embebido) ni envío automático programado de reportes por correo — ver Fuera de alcance.

---

## Entidad ReporteGenerado (nueva)

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | UUID | — | |
| `tipo` | Texto | Sí | `CONSOLIDADO_CLIENTE` / `COMPARATIVO_SUCURSALES` |
| `filtros` | JSON | Sí | Cliente(s), rango de fechas, sucursales incluidas — snapshot de los filtros usados. |
| `formato` | Texto | Sí | `EXCEL` / `PDF` |
| `url` | Texto | Sí | Ubicación del archivo generado (Supabase Storage). |
| `generadoPorId` | UUID FK → `usuario(id)` | Sí | |
| `creadoEn` | Timestamp | Auto | |
| `empresaId` | UUID | Sí | Del JWT. |

---

## Pantallas (alto nivel — a detallar por `agente-frontend` antes de implementar)

### 1. Generar reporte (`/analytics/reportes/nuevo`)
- Selector de tipo de reporte, cliente(s) (según alcance del usuario, [[004-usuarios-roles-alcance]]), rango de fechas.
- Botón "Generar" → crea el `ReporteGenerado` y ofrece descarga inmediata en el formato elegido.

### 2. Historial de reportes (`/analytics/reportes`)
- Tabla: Tipo, Filtros (resumen), Formato, Generado por, Fecha, Acción "Descargar".
- Sin regeneración automática — si los datos cambiaron desde que se generó, el usuario debe crear un reporte nuevo explícitamente.

### 3. Vista comparativa en pantalla (previa a exportar)
- Antes de exportar, muestra la tabla/gráfica comparativa en pantalla para que el usuario confirme que es lo que necesita.

---

## Reglas de negocio

1. Un `administrador_cliente` solo puede generar reportes de su propio `clienteId`; un `usuario_sucursal` no tiene acceso a este módulo (su alcance es de consulta directa, no de reportes agregados) — a confirmar si se habilita en una fase posterior.
2. Los reportes generados no se eliminan físicamente — quedan en el historial como registro de qué se compartió y cuándo.
3. El contenido del reporte respeta siempre el filtrado por alcance ([[004-usuarios-roles-alcance]]) aunque el usuario intente forzar filtros fuera de su alcance vía parámetros — validado en backend.

---

## Fuera de alcance (este sprint)

- BI interactivo / gráficas exploratorias embebidas (tipo Power BI/Looker).
- Envío automático programado de reportes por correo (se genera bajo demanda en este sprint).
- Reportes a nivel de todo el histórico multiempresa (fuera del alcance de una empresa tenant individual).

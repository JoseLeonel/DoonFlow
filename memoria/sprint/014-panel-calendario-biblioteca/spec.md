# Especificación — 014-panel-calendario-biblioteca

> **Nota (2026-07-16):** este sprint nace de dividir `006-vigencia-notificaciones-portal` (que resultó demasiado grande para implementarse de una vez) en dos partes. La parte operativa/crítica (notificaciones, vigencia, escalamiento, portal público de verificación — HU-1, HU-2, HU-3, HU-7) se quedó en [[006-vigencia-notificaciones-portal]]. Este sprint cubre la parte de productividad/planificación (panel ejecutivo, calendario de auditorías, biblioteca de hallazgos frecuentes — HU-4, HU-5, HU-6).
>
> **⏸️ Bloqueo parcial (2026-07-16):** la firma digital quedó **pausada** en [[005-certificacion-plan-cumplimiento]]. Eso bloquea **HU-4** (panel ejecutivo: necesita `fechaVencimiento`/`resultadoFinal` de 005 y `Hallazgo`/`AccionCorrectiva` de [[013-hallazgos-plan-cumplimiento]], también bloqueado). **HU-5** (calendario de auditorías) y **HU-6** (biblioteca de hallazgos frecuentes) **no dependen de la firma** — programar una fecha futura y mantener un catálogo de textos reutilizables funcionan igual sobre [[015-wizard-certificacion]] (activo) — pueden implementarse ya.

## Historias de usuario

> **HU-4.** Como **administrador general**, quiero un panel ejecutivo con el estado de cumplimiento agregado de todos los clientes y sucursales, para identificar rápidamente dónde hay riesgo (certificaciones por vencer, hallazgos críticos abiertos, acciones vencidas).

> **HU-5.** Como **administrador**, quiero planificar y programar las próximas certificaciones de cada sucursal en un calendario, en lugar de iniciarlas solo bajo demanda, para asegurar que ninguna sucursal quede sin auditar a tiempo.

> **HU-6.** Como **auditor**, quiero reutilizar hallazgos y acciones correctivas frecuentes desde una biblioteca, para no escribir la misma descripción cada vez que se repite un incumplimiento común.

---

## Contexto

Este sprint toma la mitad "de productividad/planificación" del análisis original de vacíos hecho al revisar [[002-crud-clientes]]–[[005-certificacion-plan-cumplimiento]] contra cómo operan sistemas de certificación/cumplimiento maduros (ISO, HACCP, plataformas tipo SafetyCulture o Qualio): más allá de que una certificación sea confiable y notifique a tiempo (cubierto en [[006-vigencia-notificaciones-portal]]), a escala se necesita visibilidad agregada (panel ejecutivo), planificación proactiva (calendario) en vez de solo reactiva, y reducir trabajo repetitivo del auditor (biblioteca de hallazgos frecuentes).

No introduce entidades de negocio nuevas de certificación — trabaja **sobre** lo que ya define [[015-wizard-certificacion]] (`Inspeccion.estado`/`sucursalId`), [[005-certificacion-plan-cumplimiento]] (**pausado**: `Inspeccion.fechaVencimiento`) y [[013-hallazgos-plan-cumplimiento]] (**bloqueado**: `AccionCorrectiva.estado`/`fechaLimite`, `Hallazgo.severidad`).

**Depende de:**
- [[006-vigencia-notificaciones-portal]] (Parte A) — patrón de módulo (`domain/application/infrastructure`), convención de factory por módulo, y `Notificacion` como referencia de estilo si este sprint necesita generar alguna notificación relacionada a planificación (no está en el alcance actual, pero el patrón se reutiliza).
- [[005-certificacion-plan-cumplimiento]] / [[013-hallazgos-plan-cumplimiento]] — de ahí se leen los datos agregados que alimentan el panel ejecutivo (hallazgos, acciones correctivas, estado de certificaciones).
- [[004-usuarios-roles-alcance]] — alcance por `Cliente`/`Sucursal` que deben respetar el panel ejecutivo y el calendario.

---

## Alcance de este sprint

1. **Panel ejecutivo** (dashboard): indicadores agregados por empresa tenant — % de sucursales con certificación vigente, certificaciones por vencer en los próximos N días, hallazgos críticos abiertos, acciones vencidas, todo filtrable por cliente. Visible según alcance (administrador general ve todo; administrador de cliente ve su recorte).
2. **Calendario de auditorías**: vista de planificación donde se agenda una certificación futura para una sucursal (fecha objetivo, responsable sugerido), distinta de "iniciar certificación" bajo demanda ya cubierto en 005.
3. **Biblioteca de hallazgos y acciones frecuentes**: catálogo reutilizable (texto de hallazgo + acción correctiva sugerida + severidad por defecto) que el auditor puede elegir en vez de escribir desde cero.

Este sprint **no** rediseña el motor de certificación en sí (eso es [[005-certificacion-plan-cumplimiento]]), ni construye reportes exportables/comparativos avanzados (Reportes y Analytics, módulo aparte), ni cubre notificaciones, vigencia o el portal público de verificación (ver [[006-vigencia-notificaciones-portal]]).

---

## Entidad PlanAuditoria (calendario, nueva)

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | UUID | — | |
| `sucursalId` | UUID FK → `sucursal(id)` | Sí | |
| `fechaObjetivo` | Date | Sí | Fecha planificada para ejecutar la certificación. |
| `responsableSugeridoId` | UUID FK → `usuario(id)` | No | |
| `estado` | Texto | Sí | `PROGRAMADA` / `EJECUTADA` (vinculada a la `Inspeccion` resultante) / `REPROGRAMADA` |
| `inspeccionId` | UUID FK → `inspeccion(id)` | No | Se completa cuando la certificación programada se ejecuta. |
| `creadoEn` | Timestamp | Auto | |
| `empresaId` | UUID | Sí | |

## Entidad HallazgoFrecuente (biblioteca, nueva)

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | UUID | — | |
| `descripcionHallazgo` | Texto | Sí | Ej. "Extintor vencido". |
| `severidadSugerida` | Texto | Sí | `CRITICA` / `MAYOR` / `MENOR` |
| `descripcionAccionSugerida` | Texto | No | Ej. "Sustituir el extintor". |
| `activo` | Boolean | Sí | `true` por defecto — igual que `Cliente`/`Sucursal`, no se elimina físicamente. |
| `empresaId` | UUID | Sí | Catálogo por empresa tenant, no compartido entre tenants. |
| `creadoEn` / `actualizadoEn` | Timestamp | Auto | |

Al usarla, el auditor puede editar el texto sugerido antes de guardar el hallazgo — la biblioteca solo precarga, no bloquea la edición.

---

## Pantallas (alto nivel — a detallar por `agente-frontend` antes de implementar)

### 1. Panel ejecutivo (`/analytics` o dashboard principal según defina `agente-analisis`)
- Tarjetas KPI: % sucursales con certificación vigente, certificaciones por vencer (30 días), hallazgos críticos abiertos, acciones vencidas.
- Filtro por cliente (oculto/fijo si el usuario es `administrador_cliente`).
- Tabla/lista de "atención requerida": certificaciones por vencer + acciones vencidas, ordenadas por urgencia.

### 2. Calendario de auditorías
- Vista de calendario o lista agrupada por mes con las certificaciones programadas por sucursal.
- Botón "Programar certificación" → crea `PlanAuditoria`.
- Al llegar la fecha (o antes, manualmente), botón "Iniciar ahora" lleva al flujo de 005 y vincula el resultado (`inspeccionId`).

### 3. Biblioteca de hallazgos frecuentes (Mantenimientos)
- CRUD simple: listar, agregar, modificar, activar/desactivar — mismo patrón que `Cliente`/`Sucursal`.
- Selector "Elegir de biblioteca" disponible en la pantalla de Hallazgos de 005, junto a "Agregar hallazgo manual".

---

## Reglas de negocio

1. Una certificación con `estado = FIRMADA` y `fechaVencimiento` pasada se muestra como "Vencida" en el panel ejecutivo (regla espejo de [[006-vigencia-notificaciones-portal]] regla 3 — el portal público y el panel ejecutivo comparten el mismo cálculo de presentación), aunque su registro no cambia de estado internamente.
2. Un `PlanAuditoria` programado no bloquea iniciar una certificación fuera de calendario si la operación lo requiere — es una ayuda de planificación, no una restricción.
3. `HallazgoFrecuente` es un catálogo de conveniencia: nunca se referencia por FK desde `Hallazgo` (se copia el texto al momento de usarla), para que un hallazgo histórico no cambie si luego se edita o desactiva la plantilla de biblioteca.
4. El filtrado del panel ejecutivo y del calendario respeta siempre el alcance por `Cliente`/`Sucursal` definido en [[004-usuarios-roles-alcance]].

---

## Decisiones pendientes (a confirmar antes de implementar)

- Ninguna decisión pendiente propia de este sprint más allá de las ya registradas en [[006-vigencia-notificaciones-portal]] (proveedor de correo, umbrales de recordatorio, vigencia por defecto de certificación) — no aplican directamente a HU-4/5/6, pero conviene revisarlas si el panel ejecutivo termina mostrando datos derivados de notificaciones.

---

## Fuera de alcance (este sprint)

- Notificaciones, recordatorios de vencimiento, escalamiento de acciones y portal público de verificación — ver [[006-vigencia-notificaciones-portal]].
- Reportes exportables (Excel/PDF) y comparativas entre sucursales/clientes — Reportes y Analytics, módulo aparte.
- Notificaciones push nativas (móvil) — el objetivo responsive del proyecto es tablet/desktop (ver `CLAUDE.md`), no hay app móvil.
- Vista de calendario tipo grid completo (mes/semana con drag-and-drop) — este sprint implementa una lista agrupada por mes, más simple de construir; un calendario visual completo es una mejora futura a evaluar.

---

## Ver también

- [[006-vigencia-notificaciones-portal]] — Parte A del sprint original: notificaciones, vigencia, escalamiento y portal público de verificación (HU-1, HU-2, HU-3, HU-7).

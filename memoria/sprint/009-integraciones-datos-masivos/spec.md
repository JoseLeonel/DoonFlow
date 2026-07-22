# Especificación — 009-integraciones-datos-masivos

## Historias de usuario

> **HU-1.** Como **administrador**, quiero importar clientes desde un archivo Excel/CSV, para no tener que crearlos uno por uno cuando migro datos de un sistema anterior.

> **HU-2.** Como **administrador**, quiero importar sucursales asociadas a un cliente existente desde un archivo, por la misma razón.

> **HU-3.** Como **integrador externo** (sistema del cliente, ej. su propio ERP), quiero consultar mediante una API con clave el estado vigente de una certificación, para incorporarlo a mis propios sistemas sin depender de que alguien entre al portal manualmente.

---

## Contexto

- [[002-crud-clientes]] y [[003-sucursales-certificacion]] marcaron **"importación masiva"** fuera de alcance en ambos casos — queda pendiente como deuda reconocida, no olvidada.
- [[006-vigencia-notificaciones-portal]] construyó el portal de verificación `/verificar/[codigo]` **para personas** (sin login, vía navegador/QR). Este sprint agrega el mismo tipo de consulta pero **para sistemas** (programática, autenticada por API key), sin exponer más datos de los que ya expone el portal humano.

---

## Alcance de este sprint

1. **Importación masiva de `Cliente`**: plantilla Excel descargable, carga de archivo, validación fila por fila, reporte de errores sin bloquear las filas válidas.
2. **Importación masiva de `Sucursal`**: mismo patrón, asociada a un `Cliente` ya existente (por identificación o ID).
3. **API pública de verificación** (`GET /api/v1/certificaciones/verificar/:codigo`), autenticada por API key de la empresa tenant, devuelve el mismo subconjunto de datos que el portal público humano de [[006-vigencia-notificaciones-portal]].
4. **Gestión de API keys**: crear, nombrar, revocar. Una empresa tenant puede tener varias (una por sistema externo que la consuma).

Este sprint **no** incluye importación de certificaciones/histórico (solo catálogos maestros `Cliente`/`Sucursal`) ni webhooks salientes (DoonFlow empujando datos hacia el sistema del cliente) — solo consulta entrante (pull).

---

## Entidad ApiKey (nueva)

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | UUID | — | |
| `empresaId` | UUID | Sí | Del JWT — la key pertenece a una empresa tenant. |
| `nombre` | Texto | Sí | Ej. "ERP Cliente XYZ" — identifica para qué se creó. |
| `claveHash` | Texto | Sí | Hash de la clave real; la clave en texto plano **solo se muestra una vez**, al crearla. |
| `activa` | Boolean | Sí | `true` por defecto; revocar = `false` (no se elimina físicamente). |
| `ultimoUsoEn` | Timestamp | No | Se actualiza en cada request exitoso. |
| `creadoPorId` | UUID FK → `usuario(id)` | Sí | |
| `creadoEn` | Timestamp | Auto | |

## Entidad ImportacionLote (nueva, trazabilidad)

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | UUID | — | |
| `tipo` | Texto | Sí | `CLIENTE` / `SUCURSAL` |
| `archivoNombre` | Texto | Sí | |
| `totalFilas` | Int | Sí | |
| `filasExitosas` | Int | Sí | |
| `filasConError` | Int | Sí | |
| `detalleErrores` | JSON | No | Fila + motivo del error, para descargar como reporte. |
| `creadoPorId` | UUID FK → `usuario(id)` | Sí | |
| `creadoEn` | Timestamp | Auto | |
| `empresaId` | UUID | Sí | |

---

## Pantallas (alto nivel — a detallar por `agente-frontend` antes de implementar)

### 1. Importar clientes / sucursales (dentro de Mantenimientos → Clientes / Sucursales)
- Botón "Importar desde Excel" → descarga plantilla, sube archivo, previsualiza antes de confirmar.
- Resultado: resumen (N exitosas, N con error) + descarga del detalle de errores si los hay.

### 2. Gestión de API keys (Configuración → Integraciones)
- Lista: Nombre, Estado, Último uso, Acciones (Revocar).
- Botón "Generar nueva clave" → modal que muestra la clave **una sola vez**, con advertencia de copiarla ahora.

---

## Reglas de negocio

1. Una fila con error en la importación **no bloquea** las demás filas válidas del mismo archivo — se reporta aparte.
2. Una identificación duplicada (regla ya vigente en [[002-crud-clientes]]) se reporta como error de fila, nunca sobrescribe el registro existente.
3. La clave de una `ApiKey` nunca se vuelve a mostrar en texto plano después de creada — si se pierde, se revoca y se genera una nueva.
4. La API pública de verificación devuelve exactamente el mismo subconjunto de campos que el portal humano de [[006-vigencia-notificaciones-portal]] (estado, cliente, sucursal, fechas) — nunca expone `InspeccionDetalle`, `Hallazgo` ni evidencias.
5. Cada request a la API pública se valida contra una `ApiKey` activa de la empresa tenant correspondiente; una key revocada responde `401` inmediatamente.
6. Rate limiting sobre la API pública para evitar abuso — límite exacto a definir por `agente-backend`.

---

## Decisiones pendientes

- Límite de tasa (rate limit) por API key — a definir con `agente-backend`.
- Formato exacto de la plantilla de importación (columnas, orden) — a detallar junto con `agente-frontend` antes de implementar.

---

## Fuera de alcance (este sprint)

- Importación de certificaciones o histórico de inspecciones (solo catálogos maestros `Cliente`/`Sucursal`).
- Webhooks salientes (DoonFlow notificando activamente a sistemas externos).
- Integraciones específicas con ERPs particulares (solo se expone la API genérica).

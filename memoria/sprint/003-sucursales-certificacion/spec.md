# Especificación — 003-sucursales-certificacion

## Historias de usuario

> **HU-1.** Como **administrador**, quiero registrar las sucursales de cada cliente (empresa) y aplicar el formulario de certificación (Ficha BPM) de forma independiente a cada sucursal, para llevar el historial de inspecciones y resultados de certificación por sucursal en lugar de por cliente en general.

> **HU-2.** Como **administrador**, quiero asociar a cada usuario una sucursal (o varias), para que cada usuario solo vea y opere sobre las sucursales que le corresponden.

---

## Contexto

- Cada `Cliente` (ver [[002-crud-clientes]] — módulo `Mantenimientos > Clientes`) representa una **empresa**, con datos de identificación, nombre, dirección, correo y móvil.
- Una empresa cliente puede tener **una o más sucursales** (ubicaciones físicas distintas: plantas, centros de acopio, puntos de venta, etc.). Cada sucursal tiene sus **propios datos de contacto** (nombre, dirección, correo, móvil) — no hereda los del cliente, porque una sucursal puede operar en otra ubicación con otro contacto.
- El formulario de certificación (Ficha BPM, ver [[001-crud-formulario]] — editor de estructura en `/inspecciones/[id]`) se **ejecuta contra una sucursal específica**, no contra el cliente en general. Cada sucursal tiene **su propia certificación**, independiente de las demás sucursales del mismo cliente — una empresa puede tener una sucursal certificada y otra no, o con puntajes distintos.
- La pantalla del cliente muestra, por cada una de sus sucursales, el **puntaje de la certificación vigente** — no un puntaje único del cliente, sino el desglose por sucursal.
- El histórico de inspecciones/certificaciones se consulta y se muestra **agrupado por sucursal**, no por cliente.
- El acceso de los usuarios del sistema se acota por sucursal: un usuario tiene una sucursal asociada por defecto, y opcionalmente puede tener visibilidad sobre varias sucursales (ej. un auditor o supervisor que revisa varias plantas de un mismo cliente).

---

## Alcance de este sprint

1. **CRUD de `Sucursal`** asociada a un `Cliente`: agregar, listar, modificar. Mismo patrón que `Cliente` — no se elimina físicamente, solo se activa/desactiva.
2. **Selector de sucursal** obligatorio al iniciar la ejecución de una ficha BPM (una inspección siempre queda asociada a una sucursal, nunca solo al cliente).
3. **Vista de histórico por sucursal**: listado de inspecciones ejecutadas sobre esa sucursal (fecha, plantilla usada, puntaje obtenido, clasificación/resultado según los rangos de la ficha) y el **puntaje de la certificación vigente** de esa sucursal.
4. **Asociación usuario ↔ sucursal**: cada usuario queda ligado a una sucursal principal y, opcionalmente, a sucursales adicionales que puede consultar. Define el modelo de datos y la pantalla de asignación; el filtrado real de datos por sucursal en cada módulo (fincas, trazabilidad, etc.) se aplica progresivamente en cada sprint de dominio, no todo de una vez aquí.
5. **Campo `movil` en `Cliente`**: agregar el campo faltante a la entidad ya existente de sprint 002 (migración adicional, no rehace el CRUD).

Este sprint **no** incluye el motor de ejecución de la ficha BPM en sí (correr una inspección, calcular puntaje) — eso corresponde al sprint de "ejecución de inspección" (RF-08), ya identificado como fuera de alcance en `001-crud-formulario`. Este sprint solo cubre el **modelo de datos y la navegación** que conectan Cliente → Sucursal → Historial de certificaciones, y el modelo de acceso Usuario → Sucursal; la ejecución real depende de que ese sprint futuro exista.

---

## Entidad Cliente — campo nuevo

`Cliente` ya existe desde [[002-crud-clientes]] con `nombreResponsable`, `empresa`, `identificacionEmpresa`, `correo1/2/3`, `direccion`, `activo`. Este sprint solo agrega:

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `movil` | Texto (20) | No | Teléfono móvil de contacto de la empresa cliente (no existía en el sprint 002) |

El **puntaje** que se muestra en la pantalla del cliente **no es un campo propio** — es calculado/leído a partir del puntaje de certificación vigente de cada una de sus sucursales (ver Pantalla 1). No se duplica el dato en `Cliente`.

---

## Entidad Sucursal

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `nombre` | Texto (150) | Sí | Nombre identificador de la sucursal (ej. "Planta Central", "Sucursal Norte") |
| `clienteId` | UUID FK → `cliente(id)` | Sí | Empresa a la que pertenece |
| `direccion` | Texto (300) | No | Dirección física de la sucursal |
| `correo` | Email (150) | No | Correo de contacto propio de la sucursal (independiente del correo del cliente) |
| `movil` | Texto (20) | No | Móvil de contacto propio de la sucursal |
| `activo` | Boolean | Sí | `true` por defecto |
| `empresaId` | UUID | Sí | Del JWT — no aparece en el formulario (multiempresa, igual que `Cliente`) |
| `creadoEn` | Timestamp | Auto | Gestionado por la BD |
| `actualizadoEn` | Timestamp | Auto | Gestionado por la BD |

El **puntaje de la certificación** de una sucursal (mostrado en su ficha y en la del cliente) **no se guarda como columna** en `Sucursal` — se deriva de su inspección/certificación vigente (la más reciente ejecutada, o la marcada como vigente si el sprint de ejecución define ese concepto). Evita duplicar y desincronizar el dato entre `Sucursal` y el histórico de inspecciones. Si el volumen de consultas lo justifica más adelante, se puede evaluar cachear el valor — decisión de `agente-basededatos`, no una suposición de este sprint.

Relación: `Cliente 1 —— N Sucursal`. Al desactivar un `Cliente`, sus sucursales no se eliminan ni se desactivan en cascada automáticamente (decisión a confirmar con `agente-arquitecto` si se requiere lo contrario).

---

## Entidad de acceso Usuario ↔ Sucursal

Cada `Sucursal` tiene su propia certificación, y el acceso de los usuarios se acota por sucursal:

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `Usuario.sucursalId` | UUID FK → `sucursal(id)` | No* | Sucursal principal del usuario. Nullable para roles de alcance total (ej. administrador de la empresa cliente que ve todo). |
| `usuario_sucursal_acceso` (tabla puente) | `usuarioId`, `sucursalId` | — | Sucursales adicionales que el usuario puede **ver** (consultar histórico, resultados), más allá de su sucursal principal. |

*Regla: un usuario **debe** tener `sucursalId` (principal) **o** al menos una fila en `usuario_sucursal_acceso` — no puede quedar sin ninguna sucursal asociada si su rol requiere alcance por sucursal (ver Reglas de negocio).

Esta tabla vive conceptualmente en el dominio de `agente-auth` (toca `usuario`, `rol`, `permiso` — ver `CLAUDE.md`), pero la relación con `sucursal` la introduce este sprint. Se coordina con `agente-auth` antes de implementar, no se modifica su alcance unilateralmente.

---

## Pantallas (alto nivel — a detallar por `agente-frontend` antes de implementar)

### 1. Sucursales dentro del detalle/edición de un Cliente (`/mantenimientos/clientes/[id]/editar`)
- Nueva sección "Sucursales" en la pantalla de edición de cliente existente.
- Tabla con: Nombre, Dirección, Correo, Móvil, **Puntaje certificación vigente**, Estado, Acciones (Modificar, Activar/Desactivar, Ver historial).
- La columna "Puntaje certificación vigente" muestra `—` si la sucursal no tiene inspecciones ejecutadas todavía.
- Botón "+ Agregar sucursal" abre formulario (modal o panel) con `nombre`, `direccion`, `correo`, `movil`.
- El formulario de cliente agrega el campo `movil` a los datos propios del cliente (además de los ya existentes de sprint 002).

### 2. Selector de sucursal al iniciar inspección
- En el flujo de ejecución de una ficha BPM (sprint futuro RF-08), el primer paso pasa a ser: elegir Cliente → elegir Sucursal → ejecutar ficha.
- No se puede ejecutar una inspección sin sucursal seleccionada.
- El selector solo lista sucursales del cliente a las que el usuario actual tiene acceso (su sucursal principal o las de `usuario_sucursal_acceso`), salvo que su rol tenga alcance total.

### 3. Histórico de certificaciones por sucursal
- Nueva vista accesible desde la fila de una sucursal (ej. botón "Ver historial").
- Lista cronológica (más reciente primero) de inspecciones ejecutadas sobre esa sucursal: fecha, plantilla usada, puntaje obtenido / puntaje máximo, clasificación (según rangos de resultado de la ficha).
- Estado vacío: "Esta sucursal no tiene inspecciones registradas".

### 4. Asignación de sucursales a un usuario (dentro de la gestión de usuarios, dominio de `agente-auth`)
- En la pantalla de edición de un usuario: selector de "Sucursal principal" (una sola) + selector múltiple "Sucursales adicionales con acceso de consulta".
- Si el rol del usuario tiene alcance total (ej. administrador), esta sección se oculta o se muestra deshabilitada con la nota "Este rol tiene acceso a todas las sucursales".

---

## Reglas de negocio

1. `nombre` de la sucursal es obligatorio; `direccion`, `correo` y `movil` son opcionales, pero si se ingresan `correo` debe tener formato válido.
2. Una sucursal siempre pertenece a un único `Cliente` (`clienteId` no cambia después de creada).
3. No se puede eliminar físicamente una sucursal — solo desactivar.
4. Una sucursal inactiva puede aparecer en el histórico de certificaciones, pero no puede seleccionarse para iniciar una nueva inspección.
5. Toda inspección ejecutada queda asociada a `sucursalId` (no solo a `clienteId`) — el histórico, el puntaje vigente y los reportes se agrupan por sucursal. Dos sucursales del mismo cliente tienen certificaciones y puntajes completamente independientes entre sí.
6. El `empresaId` viene siempre del JWT; nunca se incluye en el formulario (mismo aislamiento multiempresa que `Cliente`).
7. Un usuario cuyo rol requiere alcance por sucursal debe tener `sucursalId` (principal) o al menos una fila en `usuario_sucursal_acceso` — no puede quedar sin ninguna sucursal asociada. Los roles de alcance total (definidos por `agente-auth`) quedan exentos de esta validación.
8. Un usuario con sucursal(es) asociada(s) solo puede ver/operar inspecciones y datos de esas sucursales; el filtrado se valida en el backend, no solo se oculta en el frontend (mismo principio de defensa en profundidad que el aislamiento multiempresa).

---

## Fuera de alcance (este sprint)

- Motor de ejecución de la ficha BPM (RF-08) — la asociación `sucursalId` en la tabla de inspecciones queda definida en el modelo de datos de este sprint, pero la pantalla de ejecución en sí se construye en su propio sprint.
- Reportes o comparativas agregadas entre sucursales de un mismo cliente (pertenece a Reportes/Analytics).
- Jerarquías de sucursales (ej. sub-sucursales) — se asume una sola relación plana `Cliente → Sucursal`.
- Transferir una sucursal de un cliente a otro.
- Importación masiva de sucursales.

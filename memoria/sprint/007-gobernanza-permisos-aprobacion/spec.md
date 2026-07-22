# Especificación — 007-gobernanza-permisos-aprobacion

## Historias de usuario

> **HU-1.** Como **administrador general**, quiero asignar y quitar permisos específicos a cada rol desde una pantalla, en vez de que estén fijos por seed, para poder ajustar qué puede hacer cada rol sin tocar código.

> **HU-2.** Como **administrador**, quiero que un cambio a la plantilla base (Ficha BPM) requiera aprobación antes de quedar disponible para nuevas certificaciones, para evitar que un cambio no revisado afecte certificaciones en curso o futuras sin control.

---

## Contexto

- El catálogo `Rol` / `Permiso` / `RolPermiso` ya existe en el schema (ver `packages/db/prisma/schema.prisma`) y se puebla por seed, pero no tiene pantalla de administración — hoy cambiar permisos de un rol requiere editar el seed y correr una migración de datos.
- [[001-crud-formulario]] modela la activación de una plantilla como un simple toggle (activa/inactiva), sin paso de revisión. Con [[015-wizard-certificacion]] ya operando (certificaciones reales dependen de la plantilla vigente), un cambio de estructura sin revisar puede alterar el puntaje/clasificación de certificaciones futuras sin que nadie más lo haya validado.
- [[004-usuarios-roles-alcance]] define **quién ve qué** (alcance por cliente/sucursal); este sprint define **quién puede hacer qué** (permisos por acción) y **quién aprueba cambios estructurales sensibles** — son ejes distintos y complementarios.

---

## Alcance de este sprint

1. **Pantalla de matriz Rol × Permiso**: para cada rol del catálogo, marcar/desmarcar los permisos que tiene (`RolPermiso`). El catálogo de `Permiso` en sí (qué acciones existen) lo define el sistema/código, no se crean permisos nuevos desde la UI.
2. **Estado de aprobación en `InspeccionPlantilla`**: agrega el flujo borrador → en revisión → aprobada/rechazada antes de que una plantilla pueda usarse para certificar.
3. **Historial de aprobación**: quién solicitó, quién aprobó/rechazó y cuándo, con comentario obligatorio en caso de rechazo.

Este sprint **no** rediseña el editor de estructura de la ficha (eso es [[001-crud-formulario]]), solo agrega el paso de aprobación alrededor de su publicación.

---

## Entidad Permiso/RolPermiso — sin cambios de modelo

Ya existen (`Rol`, `Permiso`, `RolPermiso`); este sprint es únicamente la **pantalla** de administración sobre ese modelo, no un cambio de esquema.

## Entidad InspeccionPlantilla — campos nuevos

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `estadoAprobacion` | Texto | Sí | `BORRADOR` / `EN_REVISION` / `APROBADA` / `RECHAZADA`. Default `BORRADOR`. |
| `solicitadoPorId` | UUID FK → `usuario(id)` | No | Quien envió a revisión. |
| `solicitadoEn` | Timestamp | No | |
| `aprobadorId` | UUID FK → `usuario(id)` | No | Quien aprobó o rechazó. |
| `resueltoEn` | Timestamp | No | |
| `comentarioResolucion` | Texto | No | Obligatorio si `estadoAprobacion = RECHAZADA`. |

`activo` (ya existente) sigue controlando si la plantilla está disponible para consulta/edición; `estadoAprobacion = APROBADA` es una condición **adicional**, no un reemplazo, para poder iniciar una certificación nueva sobre ella.

---

## Pantallas (alto nivel — a detallar por `agente-frontend` antes de implementar)

### 1. Matriz de permisos (Mantenimientos o Configuración → Roles)
- Filas = roles, columnas = permisos (o agrupados por módulo si la lista crece mucho).
- Checkbox por celda, guardado explícito (botón "Guardar cambios"), no autoguardado.
- El rol `administrador` (alcance total) se muestra con todos los permisos marcados y **deshabilitado** (ver Reglas de negocio).

### 2. Solicitar y resolver aprobación de plantilla
- En el editor de estructura ([[001-crud-formulario]]): botón "Enviar a revisión" (reemplaza o complementa el toggle activar/desactivar cuando `estadoAprobacion = BORRADOR`).
- Vista de "Plantillas pendientes de aprobación" para quien tenga el permiso correspondiente: lista con botón Aprobar / Rechazar (rechazar exige comentario).
- Badge de estado visible en la lista de plantillas y en el strip de resumen del editor.

---

## Reglas de negocio

1. El catálogo base de `Permiso` (qué acciones existen) lo define el sistema — no se crean permisos nuevos desde la UI de este sprint.
2. El rol `administrador` (alcance total, ver [[004-usuarios-roles-alcance]]) siempre tiene todos los permisos y no es editable desde la matriz — evita bloquear accidentalmente al superusuario.
3. Una plantilla solo puede usarse para **iniciar una certificación nueva** ([[015-wizard-certificacion]]) si `estadoAprobacion = APROBADA`. Certificaciones ya en curso con una versión anterior no se ven afectadas (ya aplica el snapshot de estructura de RF-14).
4. Rechazar una plantilla la regresa a `BORRADOR` con `comentarioResolucion` obligatorio; el autor debe corregir y volver a enviarla a revisión.
5. Quien aprueba debe tener el permiso específico de aprobación (no basta con ser `administrador_cliente` ni `usuario_sucursal`, cuyo alcance es de datos, no de configuración).
6. Editar una plantilla ya `APROBADA` la regresa automáticamente a `BORRADOR` — un cambio siempre debe volver a pasar por revisión.

---

## Decisiones pendientes

- Si se exige **separación de funciones** (quien edita no puede ser quien aprueba) — depende del tamaño real del equipo operativo; puede ser excesivo para un equipo pequeño. A confirmar con negocio antes de implementar como bloqueo duro.
- Agrupación de permisos por módulo en la matriz (si la lista de `Permiso` crece más allá de una pantalla cómoda) — decisión de `agente-frontend`.

---

## Fuera de alcance (este sprint)

- Creación/edición de permisos nuevos desde la UI (el catálogo lo define el código).
- Permisos a nivel de campo individual (solo a nivel de acción/módulo).
- Versionado semántico de plantillas más allá de `plantillaVersion` ya existente.
- Aprobación en cascada o multi-nivel (un solo aprobador por solicitud en este sprint).

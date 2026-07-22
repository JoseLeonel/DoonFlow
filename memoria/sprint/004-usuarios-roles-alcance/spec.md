# Especificación — 004-usuarios-roles-alcance

## Historias de usuario

> **HU-1.** Como **administrador**, quiero crear usuarios y asignarles un rol de acceso (Administrador general, Administrador de cliente o Usuario de sucursal), para controlar qué información puede ver cada persona que ingresa al sistema.

> **HU-2.** Como **administrador general**, quiero ver todos los clientes registrados junto con todas sus sucursales, para tener visibilidad completa de la operación sin restricción.

> **HU-3.** Como **administrador de cliente**, quiero ver únicamente los datos de mi empresa: sus sucursales, certificaciones, historial de inspecciones y observaciones de mejora continua de cada certificación, para dar seguimiento a mi propia empresa sin ver información de otros clientes.

> **HU-4.** Como **usuario de sucursal**, quiero ver únicamente los datos de mi sucursal: su certificación vigente y el historial de inspecciones, para dar seguimiento al cumplimiento de mi sucursal sin acceso a otras sucursales ni a otros clientes.

---

## Contexto

- El catálogo de roles ya existe (`Rol`/`Permiso`/`RolPermiso`, ver `packages/db/prisma/schema.prisma`) con 5 roles sembrados para el **personal interno** de la empresa tenant (`administrador`, `productor`, `operario`, `auditor`, `cliente_externo`). Ninguno de ellos modela hoy el **alcance jerárquico** Cliente → Sucursal que pide esta HU.
- [[003-sucursales-certificacion]] ya definió que un `Cliente` (empresa, ver [[002-crud-clientes]]) tiene N `Sucursal`, y que cada sucursal lleva su propia certificación e historial de inspecciones de forma independiente. Ese sprint también introdujo `Usuario.sucursalId` (principal) + tabla puente `usuario_sucursal_acceso`, pero **no** define un alcance a nivel de `Cliente` completo — solo por sucursal individual o "alcance total" (nullable).
- Este sprint cubre exactamente ese nivel intermedio que falta: un usuario que representa a la empresa cliente (no a una sucursal puntual) y que debe ver **todas** las sucursales de ese cliente sin que alguien tenga que asignárselas una por una.
- En conjunto quedan **tres niveles de alcance** sobre los mismos datos de Cliente/Sucursal/Certificación:

| Nivel | Rol | Ve |
|---|---|---|
| 1 | Administrador general | Todos los `Cliente` de la empresa tenant, con todas sus `Sucursal` |
| 2 | Administrador de cliente | Un único `Cliente`: todas sus `Sucursal`, certificaciones, historial y observaciones |
| 3 | Usuario de sucursal | Una o varias `Sucursal` puntuales (su principal + las de `usuario_sucursal_acceso`) |

---

## Alcance de este sprint

1. **Dos roles nuevos** en el catálogo `Rol`: `administrador_cliente` y `usuario_sucursal`. El rol existente `administrador` se reutiliza para el nivel de alcance total (ya es el caso hoy). Definición final de nombres/descr. a cargo de `agente-auth`.
2. **Campo `Usuario.clienteId`** (nuevo, FK nullable a `cliente.id`): alcance de un `administrador_cliente`. Complementa a `Usuario.sucursalId` y `usuario_sucursal_acceso` ya definidos en [[003-sucursales-certificacion]] para el rol `usuario_sucursal`.
3. **CRUD de gestión de usuarios**: listar, crear, modificar, activar/desactivar. El formulario de creación/edición asigna rol y, según el rol elegido, el campo de alcance correspondiente (ninguno / Cliente / Sucursal).
4. **Filtrado por alcance** en las pantallas ya existentes de Clientes ([[002-crud-clientes]]) y Sucursales/Historial ([[003-sucursales-certificacion]]): un `administrador_cliente` o `usuario_sucursal` autenticado ve una versión acotada de esas mismas pantallas, no pantallas nuevas y separadas.
5. **Observaciones de mejora continua**: se muestran en el historial de certificaciones de una sucursal a partir del campo `observaciones` que ya existe en la entidad `Inspeccion` (ver `packages/db/prisma/schema.prisma`) — este sprint no crea una entidad nueva para esto. Si el negocio requiere un seguimiento estructurado (ej. estado de la observación: abierta/cerrada, responsable, fecha límite) más allá del texto libre actual, es una ampliación a decidir con `agente-arquitecto`, no una suposición de este sprint.

Este sprint **no** implementa el motor de permisos de escritura por acción (ya existe la tabla `rol_permiso` para eso) — solo el alcance de **lectura/visibilidad** de datos por rol jerárquico. Tampoco cubre invitación por correo ni reseteo de contraseña self-service (se asume creación directa por el administrador, igual que el usuario demo actual).

---

## Entidad Usuario — campos nuevos

`Usuario` ya existe (módulo `auth`, ver `packages/db/prisma/schema.prisma`) con `empresaId`, `email`, `nombre`, `rolId`, `activo`. Este sprint agrega:

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `clienteId` | UUID FK → `cliente(id)` | No | Solo aplica a rol `administrador_cliente`. Null para los demás roles. |
| `sucursalId` | UUID FK → `sucursal(id)` | No | Ya definido en [[003-sucursales-certificacion]] como sucursal principal. Solo aplica a rol `usuario_sucursal`. |

La tabla puente `usuario_sucursal_acceso` (sucursales adicionales de consulta) también viene de [[003-sucursales-certificacion]] y sigue aplicando únicamente al rol `usuario_sucursal`.

---

## Reglas de negocio

1. Todo `Usuario` tiene exactamente un `rolId`.
2. Si `rol = administrador` (alcance total): `clienteId` y `sucursalId` deben quedar en `null`. Ve todos los `Cliente` de la empresa tenant y todas sus `Sucursal`.
3. Si `rol = administrador_cliente`: `clienteId` es **obligatorio**; `sucursalId` debe quedar en `null` (no se asigna sucursal a sucursal, ve automáticamente todas las de su `clienteId`, sin necesidad de filas en `usuario_sucursal_acceso`).
4. Si `rol = usuario_sucursal`: `sucursalId` (principal) es **obligatorio**, salvo que tenga al menos una fila en `usuario_sucursal_acceso` (misma regla ya definida en [[003-sucursales-certificacion]]). `clienteId` debe quedar en `null`.
5. Un `administrador_cliente` o `usuario_sucursal` solo puede **leer** (no ejecutar ni modificar) certificaciones, historial y observaciones — la ejecución de la ficha BPM (RF-08) sigue siendo del rol interno correspondiente hasta que se decida lo contrario.
6. El filtrado por `clienteId`/`sucursalId` se valida siempre en el backend, nunca solo se oculta en el frontend — mismo principio de defensa en profundidad que el aislamiento multiempresa por `empresaId`.
7. No se puede eliminar físicamente un usuario — solo desactivar (`activo = false`), igual que `Cliente` y `Sucursal`.
8. Un usuario inactivo no puede iniciar sesión, pero su historial de acciones pasadas (ej. `creadoPorId` en inspecciones) se conserva.
9. El `empresaId` (empresa tenant de DoonFlow) sigue viniendo siempre del JWT — el alcance por `Cliente`/`Sucursal` es un nivel adicional **dentro** de esa empresa tenant, no lo reemplaza.
10. `email` es único por empresa tenant (regla ya vigente en `Usuario`); el correo no tiene por qué coincidir con los correos de contacto (`correo1/2/3`) del `Cliente` o la `Sucursal`.

---

## Pantallas (alto nivel — a detallar por `agente-frontend` antes de implementar)

### 1. Lista de usuarios (módulo `auth`, ej. `/mantenimientos/usuarios` o dentro de configuración)
- Tabla: Nombre, Correo, Rol, Alcance (nombre del Cliente o de la Sucursal si aplica; "Todos" si es administrador general), Estado, Acciones (Modificar, Activar/Desactivar).
- Botón "+ Agregar usuario".

### 2. Crear/editar usuario
- Campos: Nombre, Correo, Rol (select con las 3 opciones de alcance).
- Campo condicional según el rol elegido:
  - Administrador general → sin campo adicional.
  - Administrador de cliente → select de `Cliente`.
  - Usuario de sucursal → select de `Cliente` (para filtrar) y luego select de `Sucursal` (principal) + selector múltiple opcional de sucursales adicionales.

### 3. Vista acotada "Mi empresa" (sesión con rol `administrador_cliente`)
- Reutiliza la pantalla de detalle de cliente de [[003-sucursales-certificacion]] (sección Sucursales con puntaje de certificación vigente), pero sin selector de cliente — entra directo al suyo.
- Incluye el historial de inspecciones por sucursal y las observaciones de mejora continua de cada una (campo `observaciones` de `Inspeccion`).

### 4. Vista acotada "Mi sucursal" (sesión con rol `usuario_sucursal`)
- Reutiliza la vista de histórico de certificaciones por sucursal de [[003-sucursales-certificacion]] (Pantalla 3), restringida a su sucursal (o sucursales) asignada.
- Si tiene más de una sucursal asignada, selector simple para cambiar entre ellas.

---

## Fuera de alcance (este sprint)

- Motor de permisos granular de escritura por acción (ya existe `rol_permiso`, no se rediseña aquí).
- Ejecución de la ficha BPM por roles externos (`administrador_cliente`, `usuario_sucursal`) — permanece de solo lectura hasta nueva decisión.
- Invitación por correo electrónico y reseteo de contraseña self-service.
- Seguimiento estructurado de observaciones de mejora continua (estado, responsable, fecha límite) más allá del campo de texto libre ya existente en `Inspeccion.observaciones`.
- Notificaciones automáticas a usuarios de sucursal cuando cambia su certificación.
- Un usuario con más de un rol simultáneo (se asume un rol único por usuario).
